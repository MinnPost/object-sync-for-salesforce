<?php
/**
 * @file
 */

class Wordpress {

	protected $wpdb;
    protected $version;
    protected $text_domain;
    protected $mappings;
    protected $logging;
    public $wordpress_types_not_posts;

    /**
    * Objects, properties, and methods to get core WordPress data for the plugin
    *
    * @param object $wpdb
    * @param string $version
    * @param string $text_domain
    * @param object $mappings
    * @param array $wordpress_types_not_posts
    * @param array $wordpress_types_ignore
    * @throws \Exception
    */
	public function __construct( $wpdb, $version, $text_domain, $mappings, $logging, $wordpress_types_not_posts = array(), $wordpress_types_ignore = array() ) {
		$this->wpdb = &$wpdb;
		$this->version = $version;
		$this->text_domain = $text_domain;
		$this->mappings = $mappings;
        $this->logging = $logging;
		$this->wordpress_objects = $this->get_object_types( $wordpress_types_not_posts, $wordpress_types_ignore );
		$this->options = array(
			'cache' => true,
			'cache_expiration' => $this->cache_expiration( 'wordpress_data_cache', 86400 ),
			'type' => 'read'
		);
	}

	/**
    * Get WordPress object types
    * 
    * @param array $wordpress_types_not_posts
    * @param array $wordpress_types_ignore
    * @return array $wordpress_objects
    */
	public function get_object_types( $wordpress_types_not_posts, $wordpress_types_ignore ) {
		$wordpress_objects = array();
		if ( empty( $wordpress_types_not_posts ) ) {
            $wordpress_types_not_posts = array( 'user', 'comment', 'category', 'tag' );
        }
        $wordpress_objects = get_post_types();
        if ( !empty( $wordpress_types_ignore ) ) {
        	$wordpress_objects = array_diff( $wordpress_objects, $wordpress_types_ignore );
        }
        $wordpress_objects = array_merge( $wordpress_objects, $wordpress_types_not_posts );
        sort( $wordpress_objects );
		return $wordpress_objects;
	}

	/**
    * Get WordPress table structure for an object
    * 
    * @param string $object_type
    * @return array $object_table_structure
    */
	public function get_wordpress_table_structure( $object_type ) {
		if ( $object_type === 'attachment' ) {
            $object_table_structure = array(
				'object_name' => 'post',
				'content_table' => $this->wpdb->prefix . 'posts',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where' => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys' => array()
			);
        } elseif ( $object_type === 'user' ) {
            $object_table_structure = array(
				'object_name' => 'user',
				'content_table' => $this->wpdb->prefix . 'users',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'usermeta',
				'meta_join_field' => 'user_id',
				'where' => '',
				'ignore_keys' => array( // keep it simple and avoid security risks
					'user_pass',
					'user_activation_key',
					'session_tokens',
				)
			);
        } elseif ( $object_type === 'post' ) {
            $object_table_structure = array(
				'object_name' => 'post',
				'content_table' => $this->wpdb->prefix . 'posts',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where' => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys' => array()
			);
        } elseif ( $object_type === 'category' || $object_type === 'tag' ) {
            $object_table_structure = array(
				'object_name' => 'term',
				'content_table' => $this->wpdb->prefix . 'terms',
				'id_field' => 'term_id',
				'meta_table' => $this->wpdb->prefix . 'termmeta',
				'meta_join_field' => 'term_id',
				'where' => '',
				'ignore_keys' => array()
			);
        } elseif ( $object_type === 'comment' ) {
        	$object_table_structure = array(
				'object_name' => 'comment',
				'content_table' => $this->wpdb->prefix . 'comments',
				'id_field' => 'comment_ID',
				'meta_table' => $this->wpdb->prefix . 'commentmeta',
				'meta_join_field' => 'comment_id',
				'where' => '',
				'ignore_keys' => array()
			);
        } else { // this is for custom post types
            $object_table_structure = array(
				'object_name' => 'post',
				'content_table' => $this->wpdb->prefix . 'posts',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where' => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys' => array()
			);
        }

		return $object_table_structure;
	}

	/**
    * Get WordPress fields for an object
    * 
    * @param string $wordpress_object
    * @param string $id_field
    * @return array $object_fields
    */
    public function get_wordpress_object_fields( $wordpress_object, $id_field = 'ID' ) {

    	$object_table_structure = $this->get_wordpress_table_structure( $wordpress_object );

		$meta_table = $object_table_structure['meta_table'];
		$content_table = $object_table_structure['content_table'];
		$id_field = $object_table_structure['id_field'];
		$object_name = $object_table_structure['object_name'];
		$where = $object_table_structure['where'];
		$ignore_keys = $object_table_structure['ignore_keys'];

		$object_fields = array();

        // should cache that array
        if ( $this->options['cache'] === true && $this->options['cache'] !== 'write' ) { 
	        $cached = $this->cache_get( $wordpress_object, array( 'data', 'meta') );
	        if ( is_array( $cached ) ) {
	            $object_fields['data'] = $cached;
	            $object_fields['from_cache'] = true;
	            $object_fields['cached'] = true;
	        } else {
	            $object_fields['data'] = $this->object_fields( $object_name, $id_field, $content_table, $meta_table, $where, $ignore_keys );
	            if ( !empty( $object_fields['data'] ) ) {
	                $object_fields['cached'] = $this->cache_set( $wordpress_object, array( 'data', 'meta'), $object_fields['data'], $this->options['cache_expiration'] );
	            } else {
	                $object_fields['cached'] = false;
	            }
	            $object_fields['from_cache'] = false;
	        }
	    } else {
	    	$object_fields['data'] = $this->object_fields( $object_name, $id_field, $content_table, $meta_table, $where, $ignore_keys );
	        $object_fields['from_cache'] = false;
	        $object_fields['cached'] = false;
	    }
        
		return $object_fields['data'];

    }

    /**
    * Get WordPress data based on what object it is
    * todo: figure out how much formatting to do to the data.
    * example: user has an array of capabilities and such
    * we probably don't care about this, but the plugin should maybe address it
    * 
    * @param string $object_type
    * @param string $object_id
    * @return array $wordpress_object
    */
    public function get_wordpress_object_data( $object_type, $object_id ) {

    	$wordpress_object = array();

    	if ( $object_type === 'user' ) {
    		$data = get_userdata( $object_id );
    	} elseif ( $object_type === 'post' || $object_type === 'attachment' ) {
    		$data = get_post( $object_id );
    	} elseif ( $object_type === 'category' || $object_type === 'tag' ) {
			$data = get_term( $object_id );
		} elseif ( $object_type === 'comment' ) {
			$data = get_comment( $object_id );
		} else { // this is for custom post types
			$data = get_post( $object_id );
		}

        $fields = $this->get_wordpress_object_fields( $object_type );
        foreach( $fields as $key => $value ) {
    		$field = $value['key'];
    		$wordpress_object[$field] = $data->{$field};
    	}

    	return $wordpress_object;

    }

    /**
     * Check to see if this API call exists in the cache
     * if it does, return the transient for that key
     *
     * @param string $url
     * @param array $args
     * @return get_transient $cachekey
     */
	public function cache_get( $url, $args ) {
        if ( is_array( $args ) ) {
            $args[] = $url;
            array_multisort( $args );
        } else {
            $args .= $url;
        }
    	$cachekey = md5( json_encode( $args ) );
    	return get_transient( $cachekey );
	}

	/**
     * Create a cache entry for the current result, with the url and args as the key
     *
     * @param string $url
     * @param array $args
     * @param array $data
     */
	public function cache_set( $url, $args, $data, $cache_expiration = '' ) {
		if ( is_array( $args ) ) {
            $args[] = $url;
            array_multisort( $args );
        } else {
            $args .= $url;
        }
    	$cachekey = md5( json_encode( $args ) );
    	// cache_expiration is how long it should be stored in the cache
        // if we didn't give a custom one, use the default
    	if ( $cache_expiration === '' ) {
    		$cache_expiration = $this->options['cache_expiration'];
    	}
    	return set_transient( $cachekey, $data, $cache_expiration );
	}

	/**
     * If there is a WordPress setting for how long to keep this specific cache, return it and set the object property
     * Otherwise, return seconds in 24 hours
     *
     * @param string $option_key
     * @param int $expire
     */
	public function cache_expiration( $option_key, $expire ) {
		$cache_expiration = get_option( $option_key, $expire );
		return $cache_expiration;
	}

	/**
     * Get all the fields for an object
     * The important thing here is returning the fields as an array:
     * $all_fields = array( 'key' => 'key name', 'table' => 'table name' );
     * if there's a better way to do this than the mess of queries below, we should switch to that when we can
     * we just need to make sure we get all applicable fields for the object itself, as well as its meta fields
     *
     * @param string $object_name
     * @param string $id_field
     * @param string $content_table
     * @param string $meta_table
     * @param string $where
     * @param array $ignore_keys
     * @return array $all_fields
     */
	private function object_fields( $object_name, $id_field, $content_table, $meta_table, $where, $ignore_keys ) {
		// these two queries load all the fields from the specified object unless they have been specified as ignore fields
    	// they also load the fields that are meta_keys from the specified object's meta table
    	// todo: figure out how to handle other tables, especially things like advanced custom fields
    	// maybe a box for a custom query, since custom fields get done in so many ways
    	// eventually this would be the kind of thing we could use fields api for, if it ever gets done
        $select_data = 'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "' . $content_table . '"';
        $data_fields = $this->wpdb->get_results( $select_data );

        $select_meta = $select = '
        SELECT DISTINCT ' . $meta_table . '.meta_key
        FROM ' . $content_table . '
        LEFT JOIN ' . $meta_table . '
        ON ' . $content_table . '.' . $id_field . ' = ' . $meta_table . '.' . $object_name . '_id
        WHERE ' . $meta_table . '.meta_key != "" 
        ' . $where . '
        ';
        $meta_fields = $this->wpdb->get_results( $select_meta );

        $all_fields = array();

        foreach ( $data_fields as $key => $value ) {
        	if ( !in_array( $value->COLUMN_NAME, $ignore_keys ) ) {
        		$all_fields[] = array( 'key' => $value->COLUMN_NAME, 'table' => $content_table );
        	}
        }

        foreach ( $meta_fields as $key => $value ) {
        	if ( !in_array( $value->meta_key, $ignore_keys ) ) {
        		$all_fields[] = array( 'key' => $value->meta_key, 'table' => $meta_table );
        	}
        }

        return $all_fields;

	}

}