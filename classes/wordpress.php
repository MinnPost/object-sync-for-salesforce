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
        foreach ( $fields as $key => $value ) {
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

    /**
    * Create a new object of a given type.
    *
    * @param string $name
    *   Object type name, E.g., user, post, comment
    * @param array $params
    *   Values of the fields to set for the object.
    *
    * @return array
    *   data:
    *     id : 123,
    *     success : true
    *   errors : [ ],
    *   from_cache: 
    *   cached: 
    *   is_redo: 
    *
    * part of CRUD for WordPress objects
    */
    public function object_create( $name, $params ) {

        $structure = $this->get_wordpress_table_structure( $name );
        $id_field = $structure['id_field'];

        switch ( $name ) {
            case 'user':
                $result = $this->user_create( $params, $id_field );
                break;
            case 'post':
                $result = array('create a post');
                break;
            case 'attachment':
                $result = array('create attachment');
                break;
            case 'category':
            case 'tag':
                $result = array('create a taxonomy');
                break;
            case 'comment':
                $result = array('create a comment');
                break;
            default:
                $result = array('create an unmatched item');
                break;
        }

        return $result;

    }


    /**
    * Create new records or update existing records.
    *
    * The new records or updated records are based on the value of the specified
    * field.  If the value is not unique, REST API returns a 300 response with
    * the list of matching records.
    *
    * @param string $name
    *   Object type name, E.g., user, post, comment
    * @param string $key
    *   The field to check if this record should be created or updated.
    * @param string $value
    *   The value for this record of the field specified for $key.
    * @param array $params
    *   Values of the fields to set for the object.
    *
    * @return array
    *   data:
    *     "id" : 123,
    *     "success" : true
    *   "errors" : [ ],
    *   from_cache: 
    *   cached: 
    *   is_redo: 
    *
    * part of CRUD for WordPress objects
    */
    public function object_upsert( $name, $key, $value, $params ) {

        $structure = $this->get_wordpress_table_structure( $name );
        $id_field = $structure['id_field'];

        // If key is set, remove from $params to avoid UPSERT errors.
        if ( isset( $params[$key] ) ) {
          unset( $params[$key] );
        }

        /*$data = $this->api_call( "sobjects/{$name}/{$key}/{$value}", $params, 'PATCH', $options );
        if ( $this->response['code'] == 300 ) {
          $data['message'] = esc_html__( 'The value provided is not unique.', $this->text_domain );
        }*/
        $result = array( 'data' => array( $id_field => 99999, 'success' => 'upsert this object: ' . $name ), 'errors' => array());
        return $result;

    }

    /**
    * Update an existing object.
    *
    * @param string $name
    *   Object type name, E.g., user, post, comment
    * @param string $id
    *   WordPress id of the object.
    * @param array $params
    *   Values of the fields to set for the object.
    *
    * part of CRUD for WordPress objects
    *
    * @return array
    *   data:
          success: 1
    *   "errors" : [ ],
    *   from_cache:
    *   cached:
    *   is_redo:
    */
    public function object_update( $name, $id, $params ) {

        $structure = $this->get_wordpress_table_structure( $name );
        $id_field = $structure['id_field'];

        switch ( $name ) {
            case 'user':
                // user id does not come through by default, but we need it to pass to wp method
                $params['ID'] = $id;
                $result = $this->user_update( $params );
                break;
            case 'post':
                $result = array('update a post');
                break;
            case 'attachment':
                $result = array('update attachment');
                break;
            case 'category':
            case 'tag':
                $result = array('update a taxonomy');
                break;
            case 'comment':
                $result = array('update a comment');
                break;
            default:
                $result = array('update an unmatched item');
                break;
        }

        return $result;
    }

    /**
    * Delete a WordPress object.
    *
    * @param string $name
    *   Object type name, E.g., user, post, comment
    * @param string $id
    *   WordPress id of the object.
    *
    * @return array
    *   data:
          success: 1
    *   "errors" : [ ],
    *
    * part of CRUD for WordPress objects
    */
    public function object_delete( $name, $id ) {
        $structure = $this->get_wordpress_table_structure( $name );
        $id_field = $structure['id_field'];

        switch ( $name ) {
            case 'user':
                $success = $this->user_delete( $id );
                break;
            case 'post':
                $success = $this->post_delete( $id );
                break;
            case 'attachment':
                $success = $this->attachment_delete( $id );
                break;
            case 'category':
            case 'tag':
                $success = $this->term_delete( $id, $name );
                break;
            case 'comment':
                $success = $this->comment_delete( $id );
                break;
            default:
                $success = 'delete an unmatched item';
                break;
        }

        $result = array( 'data' => array( 'success' => $success ), 'errors' => array());
        return $result;
    }

    /**
    * Create a new WordPress user.
    *
    * @param array $userdata
    *   array of user data params
    *
    * @return array
    *   data:
    *     ID : 123,
          success: 1
    *   "errors" : [ ],
    *
    */
    private function user_create( $params, $id_field = 'ID' ) {

        // allow username to be email address or username
        // the username could be autogenerated before this point for the sake of URLs
        $username = $params['user_email'];
        $email_address = $params['user_email'];
        if ( isset( $params['user_login'] ) ) { // user_login is used by username_exists
            $username = $params['user_login'];
        }

        if ( NULL == username_exists( $username ) ) {

          // Generate the password and create the user
          $password = wp_generate_password( 12, FALSE );
          $user_id = wp_create_user( $username, $password, $email_address );

          // if we have other fields
          wp_update_user(
            array(
              $id_field          =>    $user_id,
              'nickname'    =>    $email_address
            )
          );

          // todo: figure out how to format all the possible data that can go here

          // set the role
          $user = new WP_User( $user_id );
          //$user->set_role( 'contributor' );

          // send notification of new user
          // todo: make sure this respects other settings.
          // ex: if admin users never get notifications, this should not force a notification
          wp_new_user_notification( $user_id, NULL, 'admin user' );


        } else {
            $user_id = username_exists( $username );
        }

        if ( is_wp_error( $user_id ) ) {
            $success = FALSE;
            $errors = $user_id;
        } else {
            $success = TRUE;
            $errors = array();
        }

        $result = array( 'data' => array( $id_field => $user_id, 'success' => $success ), 'errors' => $errors );

        return $result;

    }

    /**
    * Update a WordPress user.
    *
    * @param array $userdata
    *   array of user data params
    *
    * @return array
    *   data:
          success: 1
    *   "errors" : [ ],
    *
    */
    private function user_update( $userdata ) {
        $user_id = wp_update_user( $userdata );
        if ( is_wp_error( $user_id ) ) {
            $success = FALSE;
            $errors = $user_id;
        } else {
            $success = TRUE;
            $errors = array();
        }

        $result = array( 'data' => array( 'success' => $success ), 'errors' => $errors );
        return $result;
    }

    /**
    * Delete a WordPress user.
    *
    * @param int $id
    *   User ID
    * @param int $reassign
    *   If we should reassign any posts to other users
    *   We don't change this from NULL anywhere in this plugin
    *
    * @return boolean
    *   true if successful
    *
    */
    private function user_delete( $id, $reassign = NULL ) {
        // according to https://codex.wordpress.org/Function_Reference/wp_delete_user we have to include user.php first; otherwise it throws undefined error
        include_once( './wp-admin/includes/user.php' );
        $result = wp_delete_user( $id, $reassign );
        return $result;
    }

    /**
    * Delete a WordPress post.
    *
    * @param int $id
    *   Post ID
    * @param bool $force_delete
    *   If we should bypass the trash
    *   We don't change this from FALSE anywhere in this plugin
    *
    * @return mixed
    *   post object if successful, false if failed
    *
    */
    private function post_delete( $id, $force_delete = FALSE ) {
        $result = wp_delete_post( $id, $force_delete );
        return $result;
    }

    /**
    * Delete a WordPress attachment.
    *
    * @param int $id
    *   Post ID
    * @param bool $force_delete
    *   If we should bypass the trash
    *   We don't change this from FALSE anywhere in this plugin
    *
    * @return mixed
    *   attachment object if successful, false if failed
    *
    */
    private function attachment_delete( $id, $force_delete = FALSE ) {
        $result = wp_delete_attachment( $id, $force_delete );
        return $result;
    }

    /**
    * Delete a WordPress term.
    *
    * @param int $id
    *   Post ID
    * @param string $taxonomy
    *   What taxonomy the term is - category, tag, etc.
    *
    * @return bool
    *   true if successful, false if failed
    *
    */
    private function term_delete( $id, $taxonomy ) {
        $result = wp_delete_term( $id, $taxonomy );
        return $result;
    }

    /**
    * Delete a WordPress comment.
    *
    * @param int $id
    *   Post ID
    * @param bool $force_delete
    *   If we should bypass the trash
    *   We don't change this from FALSE anywhere in this plugin
    *
    * @return boolean
    *   true if successful, false if failed
    *
    */
    private function comment_delete( $id, $force_delete = FALSE ) {
        $result = wp_delete_comment( $id, $force_delete );
        return $result;
    }

}

class WordpressException extends Exception {
}
