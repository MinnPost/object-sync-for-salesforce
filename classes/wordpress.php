<?php
/**
 * @file
 */

class Wordpress {

	protected $wpdb;
    protected $version;
    protected $text_domain;

    /**
    * Objects, properties, and methods to get core WordPress data for the plugin
    *
    * @param object $wpdb
    * @param string $version
    * @param string $text_domain
    * @throws \Exception
    */
	public function __construct( $wpdb, $version, $text_domain ) {
		$this->wpdb = &$wpdb;
		$this->version = $version;
		$this->text_domain = $text_domain;
		$this->options = array(
			'cache' => true,
			'cache_expiration' => $this->cache_expiration( 'wordpress_data_cache', 86400 ),
			'type' => 'read'
		);
	}

	/**
    * Get WordPress fields for an object
    * 
    * @param string $wordpress_object
    * @param string $id_field
    * @return array $object_fields
    */
    public function get_wordpress_object_fields( $wordpress_object, $id_field = 'ID' ) {

		if ( $wordpress_object === 'user' ) {
			$meta_table = $this->wpdb->prefix . 'usermeta';
			$content_table = $this->wpdb->prefix . 'users';
			$object_name = 'user';
			$where = '';
			$ignore_keys = array( // keep it simple and avoid security risks
				'user_pass',
				'user_activation_key',
				'session_tokens',
			);
		} else if ( $wordpress_object === 'comment' ) {
			$meta_table = $this->wpdb->prefix . 'commentmeta';
			$content_table = $this->wpdb->prefix . 'comments';
			$object_name = 'comment';
			$id_field = 'comment_ID';
			$where = '';
			$ignore_keys = array();
		} else {
			$meta_table = $this->wpdb->prefix . 'postmeta';
			$content_table = $this->wpdb->prefix . 'posts';
			$object_name = 'post';
			$where = 'AND ' . $content_table . '.post_type = "' . $wordpress_object . '"';
			$ignore_keys = array();
		}

		$object_fields = array();

        // should cache that array
        if ( $this->options['cache'] === true && $this->options['cache'] !== 'write' ) { 
	        $cached = $this->cache_get( $wordpress_object, array( 'data', 'meta') );
	        if ( is_array( $cached ) ) {
	            $object_fields['data'] = $cached;
	            $object_fields['from_cache'] = true;
	            $object_fields['cached'] = true;
	        } else {
	            $object_fields['data'] = $this->object_fields( $meta_table, $content_table, $object_name, $where, $ignore_keys );
	            if ( !empty( $object_fields['data'] ) ) {
	                $object_fields['cached'] = $this->cache_set( $wordpress_object, array( 'data', 'meta'), $object_fields['data'], $this->options['cache_expiration'] );
	            } else {
	                $object_fields['cached'] = false;
	            }
	            $object_fields['from_cache'] = false;
	        }
	    } else {
	    	$object_fields['data'] = $this->object_fields( $meta_table, $content_table, $object_name, $where, $ignore_keys );
	        $object_fields['from_cache'] = false;
	        $object_fields['cached'] = false;
	    }
        
		return $object_fields['data'];

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
     *
     * @param string $meta_table
     * @param string $content_table
     * @param string $object_name
     * @param string $where
     * @param array $ignore_keys
     * @return array $all_fields
     */
	private function object_fields( $meta_table, $content_table, $object_name, $where, $ignore_keys ) {
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

        foreach ( $data_fields as $key => $value ) {
        	if ( !in_array( $value->COLUMN_NAME, $ignore_keys ) ) {
        		$all_fields[] = array( 'key' => $value->COLUMN_NAME );
        	}
        }

        foreach ( $meta_fields as $key => $value ) {
        	if ( !in_array( $value->meta_key, $ignore_keys ) ) {
        		$all_fields[] = array( 'key' => $value->meta_key );
        	}
        }

        return $all_fields;

	}

}