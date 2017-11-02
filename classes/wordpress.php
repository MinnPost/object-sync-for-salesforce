<?php
/**
 * Class file for Object_Sync_Sf_WordPress.
 *
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * Work with the WordPress $wpdb object. This class can make read and write calls to the WordPress database, and also cache the responses.
 */
class Object_Sync_Sf_WordPress {

	protected $wpdb;
	protected $version;
	protected $slug;
	protected $mappings;
	protected $logging;

	/**
	 * Constructor which discovers objects in WordPress
	 *
	 * @param object $wpdb A wpdb object.
	 * @param string $version The plugin version.
	 * @param string $slug The plugin slug.
	 * @param object $mappings Mapping objects.
	 * @param object $logging a Object_Sync_Sf_Logging instance.
	 * @throws \Exception
	 */
	public function __construct( $wpdb, $version, $slug, $mappings, $logging ) {
		$this->wpdb = $wpdb;
		$this->version = $version;
		$this->slug = $slug;
		$this->mappings = $mappings;
		$this->logging = $logging;

		add_action( 'admin_init', function() {
			$this->wordpress_objects = $this->get_object_types();
		} );

		$this->options = array(
			'cache' => true,
			'cache_expiration' => $this->cache_expiration( 'wordpress_data_cache', 86400 ),
			'type' => 'read',
		);

		$this->debug = get_option( 'object_sync_for_salesforce_debug_mode', false );

	}

	/**
	 * Get WordPress object types
	 *
	 * @return array $wordpress_objects
	 */
	public function get_object_types() {
		/*
		 * Allow developers to specify, especially non-post, content types that should be included or ignored.
		 * Here's an example of filters to add/remove types:
		 *
			add_filter( 'object_sync_for_salesforce_add_more_wordpress_types', 'add_more_types', 10, 1 );
			function add_more_types( $more_types ) {
				$more_types = array( 'foo' );
				// or $more_types[] = 'foo';
				return $more_types;
			}

			add_filter( 'object_sync_for_salesforce_remove_wordpress_types', 'remove_types', 10, 1 );
			function remove_types( $types_to_remove ) {
				$types_to_remove = array( 'acme_product' );
				// or $types_to_remove[] = 'acme_product';
				return $types_to_remove;
			}
		*/
		$wordpress_types_not_posts_include = apply_filters( 'object_sync_for_salesforce_add_more_wordpress_types', array() );
		$wordpress_types_ignore = apply_filters( 'object_sync_for_salesforce_remove_wordpress_types', array( 'wp_log' ) );

		$wordpress_objects = array();

		if ( empty( $wordpress_types_not_posts_include ) ) {
			$wordpress_types_not_posts_include = array( 'user', 'comment', 'category', 'tag' );
		}

		$wordpress_objects = get_post_types();
		$wordpress_objects = array_merge( $wordpress_objects, $wordpress_types_not_posts_include );

		if ( ! empty( $wordpress_types_ignore ) ) {
			$wordpress_objects = array_diff( $wordpress_objects, $wordpress_types_ignore );
		}

		sort( $wordpress_objects );
		return $wordpress_objects;
	}

	/**
	 * Get WordPress table structure for an object
	 *
	 * @param string $object_type The type of object.
	 * @return array $object_table_structure The table structure.
	 */
	public function get_wordpress_table_structure( $object_type ) {
		if ( 'attachment' === $object_type ) {
			$object_table_structure = array(
				'object_name' => 'post',
				'content_methods' => array(
					'create' => 'wp_insert_attachment',
					'read' => 'get_posts',
					'update' => 'wp_insert_attachment',
					'delete' => 'wp_delete_attachment',
				),
				'meta_methods' => array(
					'create' => 'wp_generate_attachment_metadata',
					'read' => 'wp_get_attachment_metadata',
					'update' => 'wp_update_attachment_metadata',
					'delete' => '',
				),
				'content_table' => $this->wpdb->prefix . 'posts',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where' => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys' => array(),
			);
		} elseif ( 'user' === $object_type ) {
			// User meta fields need to use update_user_meta for create as well, otherwise it'll just get created twice because apparently when the post is created it's already there.
			$object_table_structure = array(
				'object_name' => 'user',
				'content_methods' => array(
					'create' => 'wp_insert_user',
					'read' => 'get_user_by',
					'update' => 'wp_update_user',
					'delete' => 'wp_delete_user',
				),
				'meta_methods' => array(
					'create' => 'update_user_meta',
					'read' => 'get_user_meta',
					'update' => 'update_user_meta',
					'delete' => 'delete_user_meta',
				),
				'content_table' => $this->wpdb->prefix . 'users',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'usermeta',
				'meta_join_field' => 'user_id',
				'where' => '',
				'ignore_keys' => array( // Keep it simple and avoid security risks.
					'user_pass',
					'user_activation_key',
					'session_tokens',
				),
			);
		} elseif ( 'post' === $object_type ) {
			$object_table_structure = array(
				'object_name' => 'post',
				'content_methods' => array(
					'create' => 'wp_insert_post',
					'read' => 'get_posts',
					'update' => 'wp_update_post',
					'delete' => 'wp_delete_post',
				),
				'meta_methods' => array(
					'create' => 'add_post_meta',
					'read' => 'get_post_meta',
					'update' => 'update_post_meta',
					'delete' => 'delete_post_meta',
				),
				'content_table' => $this->wpdb->prefix . 'posts',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where' => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys' => array(),
			);
		} elseif ( 'category' === $object_type || 'tag' === $object_type || 'post_tag' === $object_type ) {
			// I am unsure why post_tag wasn't here for so long, but i figure it probably needs to be there.
			$object_table_structure = array(
				'object_name' => 'term',
				'content_methods' => array(
					'create' => 'wp_insert_term',
					'read' => 'get_term_by',
					'update' => 'wp_update_term',
					'delete' => 'wp_delete_term',
				),
				'meta_methods' => array(
					'create' => 'add_term_meta',
					'read' => 'get_term_meta',
					'update' => 'update_term_meta',
					'delete' => 'delete_metadata',
				),
				'content_table' => $this->wpdb->prefix . 'terms',
				'id_field' => 'term_id',
				'meta_table' => array( $this->wpdb->prefix . 'termmeta', $this->wpdb->prefix . 'term_taxonomy' ),
				'meta_join_field' => 'term_id',
				'where' => '',
				'ignore_keys' => array(),
			);
		} elseif ( 'comment' === $object_type ) {
			$object_table_structure = array(
				'object_name' => 'comment',
				'content_methods' => array(
					'create' => 'wp_new_comment',
					'read' => 'get_comments',
					'update' => 'wp_update_comment',
					'delete' => 'wp_delete_comment',
				),
				'meta_methods' => array(
					'create' => 'add_comment_meta',
					'read' => 'get_comment_meta',
					'update' => 'update_comment_meta',
					'delete' => 'delete_comment_metadata',
				),
				'content_table' => $this->wpdb->prefix . 'comments',
				'id_field' => 'comment_ID',
				'meta_table' => $this->wpdb->prefix . 'commentmeta',
				'meta_join_field' => 'comment_id',
				'where' => '',
				'ignore_keys' => array(),
			);
		} else { // This is for custom post types.
			$object_table_structure = array(
				'object_name' => 'post',
				'content_methods' => array(
					'create' => 'wp_insert_post',
					'read' => 'get_posts',
					'update' => 'wp_update_post',
					'delete' => 'wp_delete_post',
				),
				'meta_methods' => array(
					'create' => 'add_post_meta',
					'read' => 'get_post_meta',
					'update' => 'update_post_meta',
					'delete' => 'delete_post_meta',
				),
				'content_table' => $this->wpdb->prefix . 'posts',
				'id_field' => 'ID',
				'meta_table' => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where' => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys' => array(),
			);
		} // End if().

		return $object_table_structure;
	}

	/**
	 * Get WordPress fields for an object
	 *
	 * @param string $wordpress_object The type of WordPress object.
	 * @param string $id_field The field of that object that corresponds with its ID in the database.
	 * @return array $object_fields
	 */
	public function get_wordpress_object_fields( $wordpress_object, $id_field = 'ID' ) {

		$object_table_structure = $this->get_wordpress_table_structure( $wordpress_object );

		$meta_table = $object_table_structure['meta_table'];
		$meta_methods = $object_table_structure['meta_methods'];
		$content_table = $object_table_structure['content_table'];
		$content_methods = $object_table_structure['content_methods'];
		$id_field = $object_table_structure['id_field'];
		$object_name = $object_table_structure['object_name'];
		$where = $object_table_structure['where'];
		$ignore_keys = $object_table_structure['ignore_keys'];

		$object_fields = array();

		// Try to find the object fields in cache before acquiring it from other source.
		if ( true === $this->options['cache'] && 'write' !== $this->options['cache'] ) {
			$cached = $this->cache_get( $wordpress_object, array( 'data', 'meta' ) );
			if ( is_array( $cached ) ) {
				$object_fields['data'] = $cached;
				$object_fields['from_cache'] = true;
				$object_fields['cached'] = true;
			} else {
				$object_fields['data'] = $this->object_fields( $object_name, $id_field, $content_table, $content_methods, $meta_table, $meta_methods, $where, $ignore_keys );
				if ( ! empty( $object_fields['data'] ) ) {
					$object_fields['cached'] = $this->cache_set( $wordpress_object, array( 'data', 'meta' ), $object_fields['data'], $this->options['cache_expiration'] );
				} else {
					$object_fields['cached'] = false;
				}
				$object_fields['from_cache'] = false;
			}
		} else {
			$object_fields['data'] = $this->object_fields( $object_name, $id_field, $content_table, $content_methods, $meta_table, $meta_methods, $where, $ignore_keys );
			$object_fields['from_cache'] = false;
			$object_fields['cached'] = false;
		}

		/*
		 * Developers can use this hook to change the WordPress object field array.
		 * The returned $object_fields needs to be an array like is described earlier in this method:
		 *     $object_fields = array( 'data' => array(), 'from_cache' => bool, 'cached' => bool );
		 * This is useful for custom objects that do not use the normal metadata table structure.
		 */
		$object_fields = apply_filters( 'object_sync_for_salesforce_wordpress_object_fields', $object_fields, $wordpress_object );

		return $object_fields['data'];

	}

	/**
	 * Get WordPress data based on what object it is
	 *
	 * @param string $object_type The type of object.
	 * @param string $object_id The ID of the object.
	 * @return array $wordpress_object
	 */
	public function get_wordpress_object_data( $object_type, $object_id ) {

		$wordpress_object = array();

		if ( 'user' === $object_type ) {
			$data = get_userdata( $object_id );
		} elseif ( 'post' === $object_type || 'attachment' === $object_type ) {
			$data = get_post( $object_id );
		} elseif ( 'category' === $object_type || 'tag' === $object_type || 'post_tag' === $object_type ) {
			$data = get_term( $object_id );
		} elseif ( 'comment' === $object_type ) {
			$data = get_comment( $object_id );
		} else { // This is for custom post types.
			$data = get_post( $object_id );
		}

		$fields = $this->get_wordpress_object_fields( $object_type );
		foreach ( $fields as $key => $value ) {
			$field = $value['key'];
			$wordpress_object[ $field ] = $data->{$field};
		}

		// Developers can use this hook to change the WordPress object,
		// including any formatting that needs to happen to the data.
		// The returned $wordpress_object needs to be an array like described above.
		// This is useful for custom objects or custom formatting.
		$wordpress_object = apply_filters( 'object_sync_for_salesforce_wordpress_object_data', $wordpress_object );

		return $wordpress_object;

	}

	/**
	 * Check to see if this API call exists in the cache
	 * if it does, return the transient for that key
	 *
	 * @param string $url The API call we'd like to make.
	 * @param array  $args The arguents of the API call.
	 * @return get_transient $cachekey
	 */
	public function cache_get( $url, $args ) {
		if ( is_array( $args ) ) {
			$args[] = $url;
			array_multisort( $args );
		} else {
			$args .= $url;
		}
		$cachekey = md5( wp_json_encode( $args ) );
		return get_transient( $cachekey );
	}

	/**
	 * Create a cache entry for the current result, with the url and args as the key
	 *
	 * @param string $url The API query URL.
	 * @param array  $args The arguments passed on the API query.
	 * @param array  $data The data received.
	 * @param string $cache_expiration How long to keep the cache result around for.
	 * @return Bool whether or not the value was set
	 * @link https://developer.wordpress.org/reference/functions/set_transient/
	 */
	public function cache_set( $url, $args, $data, $cache_expiration = '' ) {
		if ( is_array( $args ) ) {
			$args[] = $url;
			array_multisort( $args );
		} else {
			$args .= $url;
		}
		$cachekey = md5( wp_json_encode( $args ) );
		// Cache_expiration is how long it should be stored in the cache.
		// If we didn't give a custom one, use the default.
		if ( '' === $cache_expiration ) {
			$cache_expiration = $this->options['cache_expiration'];
		}
		return set_transient( $cachekey, $data, $cache_expiration );
	}

	/**
	 * If there is a WordPress setting for how long to keep this specific cache, return it and set the object property
	 * Otherwise, return seconds in 24 hours
	 *
	 * @param string $option_key The cache item to keep around.
	 * @param int    $expire The default time after which to expire the cache.
	 * @return The cache expiration saved in the database.
	 */
	public function cache_expiration( $option_key, $expire ) {
		$cache_expiration = get_option( $option_key, $expire );
		return $cache_expiration;
	}

	/**
	 * Get all the fields for an object
	 * The important thing here is returning the fields as an array:
	 * $all_fields = array( 'key' => 'key name', 'table' => 'table name', 'methods' => array( 'create' => '', 'read' => '', 'update' => '', 'delete' => '' ) );
	 * if there's a better way to do this than the mess of queries below, we should switch to that when we can
	 * we just need to make sure we get all applicable fields for the object itself, as well as its meta fields
	 *
	 * @param string $object_name THe name of the object type.
	 * @param string $id_field The database filed that contains its ID.
	 * @param string $content_table The table that normally contains such objects.
	 * @param array  $content_methods Unused, but included as part of the return.
	 * @param string $meta_table The table where meta values for this object type are contained.
	 * @param array  $meta_methods Unused, but included as part of the return.
	 * @param string $where SQL query.
	 * @param array  $ignore_keys Fields to ignore from the database.
	 * @return array $all_fields The fields for the object.
	 */
	private function object_fields( $object_name, $id_field, $content_table, $content_methods, $meta_table, $meta_methods, $where, $ignore_keys ) {
		// These two queries load all the fields from the specified object unless they have been specified as ignore fields.
		// They also load the fields that are meta_keys from the specified object's meta table.
		// Maybe a box for a custom query, since custom fields get done in so many ways.
		// Eventually this would be the kind of thing we could use fields api for, if it ever gets done.
		$data_fields = $this->wpdb->get_col( "DESC {$content_table}", 0 );

		if ( is_array( $meta_table ) ) {
			$tax_table = $meta_table[1];
			$meta_table = $meta_table[0];
		}
		$select_meta = '
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
			if ( ! in_array( $value, $ignore_keys, true ) ) {
				$all_fields[] = array(
					'key' => $value,
					'table' => $content_table,
					'methods' => $content_methods,
				);
			}
		}

		foreach ( $meta_fields as $key => $value ) {
			if ( ! in_array( $value->meta_key, $ignore_keys, true ) ) {
				$all_fields[] = array(
					'key' => $value->meta_key,
					'table' => $meta_table,
					'methods' => $meta_methods,
				);
			}
		}

		if ( 'term' === $object_name ) {
			$taxonomy = $this->wpdb->get_col( "DESC {$tax_table}", 0 );
			foreach ( $taxonomy as $key => $value ) {
				$exists = array_search( $value, array_column( $all_fields, 'key' ), true );
				if ( 0 !== $exists ) {
					$all_fields[] = array(
						'key' => $value,
						'table' => $tax_table,
						'methods' => $content_methods,
					);
				}
			}
		}

		return $all_fields;

	}

	/**
	 * Create a new object of a given type.
	 *
	 * @param string $name Object type name, E.g., user, post, comment.
	 * @param array  $params Values of the fields to set for the object.
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
				$result = $this->post_create( $params, $id_field );
				break;
			case 'attachment':
				$result = $this->attachment_create( $params, $id_field );
				break;
			case 'category':
			case 'tag':
			case 'post_tag':
				$result = $this->term_create( $params, $name, $id_field );
				break;
			case 'comment':
				$result = $this->comment_create( $params, $id_field );
				break;
			default:
				/*
				 * Developers can use this hook to create objects with their own methods.
				 * The returned $result needs to be an array like this.
				 * $id_field should be the database key; i.e. 'ID' and the value should be the new item's id, or whatever WordPress returns from the method (sometimes this can be an error)
				 * $success should be a boolean value
					$result = array( 'data' => array( $id_field => $post_id, 'success' => $success ), 'errors' => $errors );
				 * use hook like: add_filter( 'object_sync_for_salesforce_create_custom_wordpress_item', add_object, 10, 1 );
				 * the one param is: array( 'name' => objecttype, 'params' => array_of_params, 'id_field' => idfield )
				 */
				// Check to see if someone is calling the filter, and apply it if so.
				if ( ! has_filter( 'object_sync_for_salesforce_create_custom_wordpress_item' ) ) {
					$result = $this->post_create( $params, $id_field, $name );
				} else {
					$result = apply_filters( 'object_sync_for_salesforce_create_custom_wordpress_item', array(
						'params' => $params,
						'name' => $name,
						'id_field' => $id_field,
					) );
				}
				break;
		} // End switch().

		return $result;

	}


	/**
	 * Create new records or update existing records.
	 *
	 * The new records or updated records are based on the value of the specified
	 * field.  If the value is not unique, REST API returns a 300 response with
	 * the list of matching records.
	 *
	 * @param string $name Object type name, E.g., user, post, comment.
	 * @param string $key The field to check if this record should be created or updated.
	 * @param string $value The value for this record of the field specified for $key.
	 * @param array  $methods What WordPress methods do we use to get the data, if there are any. otherwise, maybe will have to do a wpdb query.
	 * @param array  $params Values of the fields to set for the object.
	 * @param bool   $push_drafts Whether to save WordPress drafts when pushing to Salesforce.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
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
	public function object_upsert( $name, $key, $value, $methods = array(), $params, $push_drafts = false, $check_only = false ) {

		$structure = $this->get_wordpress_table_structure( $name );
		$id_field = $structure['id_field'];

		// If key is set, remove from $params to avoid SQL errors.
		if ( isset( $params[ $key ] ) ) {
			unset( $params[ $key ] );
		}

		// Allow developers to change both the key and value by which objects should be matched.
		$key = apply_filters( 'object_sync_for_salesforce_modify_upsert_key', $key );
		$value = apply_filters( 'object_sync_for_salesforce_modify_upsert_value', $value );

		switch ( $name ) {
			case 'user':
				$result = $this->user_upsert( $key, $value, $methods, $params, $id_field, $push_drafts, $check_only );
				break;
			case 'post':
				$result = $this->post_upsert( $key, $value, $methods, $params, $id_field, $push_drafts, $name, $check_only );
				break;
			case 'attachment':
				$result = $this->attachment_upsert( $key, $value, $methods, $params, $id_field, $check_only );
				break;
			case 'category':
			case 'tag':
			case 'post_tag':
				$result = $this->term_upsert( $key, $value, $methods, $params, $name, $id_field, $push_drafts, $check_only );
				break;
			case 'comment':
				$result = $this->comment_upsert( $key, $value, $methods, $params, $id_field, $push_drafts, $check_only );
				break;
			default:
				/*
				 * Developers can use this hook to upsert objects with their own methods.
				 * The returned $result needs to be an array like this:
				 * $id_field should be the database key; i.e. 'ID' and the value should be the item's id, or whatever WordPress returns from the method (sometimes this can be an error)
				 * $success should be a boolean value
				 *     $result = array( 'data' => array( $id_field => $post_id, 'success' => $success ), 'errors' => $errors );
				 * Use hook like this:
				 *     add_filter( 'object_sync_for_salesforce_upsert_custom_wordpress_item', add_object, 10, 1 );
				 * The one param is:
				 *     array( 'key' => key, 'value' => value, 'methods' => methods, 'params' => array_of_params, 'id_field' => idfield, 'push_drafts' => pushdrafts, 'name' => name, 'check_only' => $check_only )
				*/
				// Check to see if someone is calling the filter, and apply it if so.
				if ( ! has_filter( 'object_sync_for_salesforce_upsert_custom_wordpress_item' ) ) {
					$result = $this->post_upsert( $key, $value, $methods, $params, $id_field, $push_drafts, $name, $check_only );
				} else {
					$result = apply_filters( 'object_sync_for_salesforce_upsert_custom_wordpress_item', array(
						'key' => $key,
						'value' => $value,
						'methods' => $methods,
						'params' => $params,
						'id_field' => $id_field,
						'push_drafts' => $push_drafts,
						'name' => $name,
						'check_only' => $check_only,
					) );
				}
				break;
		} // End switch().

		return $result;

	}

	/**
	 * Update an existing object.
	 *
	 * @param string $name Object type name, E.g., user, post, comment.
	 * @param string $id WordPress id of the object.
	 * @param array  $params Values of the fields to set for the object.
	 *
	 * part of CRUD for WordPress objects
	 *
	 * @return array
	 *   data:
	 *     success: 1
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
				// User id does not come through by default, but we need it to pass to wp method.
				$result = $this->user_update( $id, $params, $id_field );
				break;
			case 'post':
				$result = $this->post_update( $id, $params, $id_field );
				break;
			case 'attachment':
				$result = $this->attachment_update( $id, $params, $id_field );
				break;
			case 'category':
			case 'tag':
			case 'post_tag':
				$result = $this->term_update( $id, $params, $name, $id_field );
				break;
			case 'comment':
				$result = $this->comment_update( $id, $params, $id_field );
				break;
			default:
				/*
				 * Developers can use this hook to update objects with their own methods.
				 * The returned $result needs to be an array like this:
				 *     $id_field should be the database key; i.e. 'ID' and the value should be the updated item's id, or whatever WordPress returns from the method (sometimes this can be an error)
				 * $success should be a boolean value
				 *     $result = array( 'data' => array( $id_field => $post_id, 'success' => $success ), 'errors' => $errors );
				 * Use hook like this:
				 *     add_filter( 'object_sync_for_salesforce_update_custom_wordpress_item', add_object, 10, 1 );
				 * The one param is:
				 *     array( 'key' => key, 'value' => value, 'name' => objecttype, 'params' => array_of_params, 'push_drafts' => pushdrafts, 'methods' => methods )
				 */
				// Check to see if someone is calling the filter, and apply it if so.
				if ( ! has_filter( 'object_sync_for_salesforce_update_custom_wordpress_item' ) ) {
					$result = $this->post_update( $id, $params, $id_field, $name );
				} else {
					$result = apply_filters( 'object_sync_for_salesforce_update_custom_wordpress_item', array(
						'id' => $id,
						'params' => $params,
						'name' => $name,
						'id_field' => $id_field,
					) );
				}
				break;
		} // End switch().

		return $result;
	}

	/**
	 * Delete a WordPress object.
	 *
	 * @param string $name Object type name, E.g., user, post, comment.
	 * @param string $id WordPress id of the object.
	 *
	 * @return array
	 *   data:
	 *     success: 1
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
			case 'post_tag':
				$success = $this->term_delete( $id, $name );
				break;
			case 'comment':
				$success = $this->comment_delete( $id );
				break;
			default:
				/*
				 * Developers can use this hook to delete objects with their own methods.
				 * The returned $success is an object of the correct type, or a FALSE
				 * Use hook like:
				 *     add_filter( 'object_sync_for_salesforce_delete_custom_wordpress_item', add_object, 10, 1 );
				 * The one param is:
				 *     array( 'id' => id, 'name' => objecttype )
				 */
				// Check to see if someone is calling the filter, and apply it if so.
				if ( ! has_filter( 'object_sync_for_salesforce_delete_custom_wordpress_item' ) ) {
					$success = $this->post_delete( $id );
				} else {
					$success = apply_filters( 'object_sync_for_salesforce_delete_custom_wordpress_item', array(
						'id' => $id,
						'name' => $name,
					) );
				}

				$success = $this->post_delete( $id );
				break;
		} // End switch().

		$result = array(
			'data' => array(
				'success' => $success,
			),
			'errors' => array(),
		);
		return $result;
	}

	/**
	 * Create a new WordPress user.
	 *
	 * @param array  $params array of user data params.
	 * @param string $id_field The column in the DB that holdes the user ID.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function user_create( $params, $id_field = 'ID' ) {

		// Allow username to be email address or username.
		// The username could be autogenerated before this point for the sake of URLs.
		$username = $params['user_email']['value'];
		$email_address = $params['user_email']['value'];
		if ( isset( $params['user_login']['value'] ) ) { // User_login is used by username_exists.
			$username = $params['user_login']['value'];
		} else {
			$params['user_login'] = array(
				'value' => $username,
				'method_modify' => 'wp_insert_user',
				'method_read' => 'get_user_by',
			);
		}

		// This is a new user.
		if ( false === username_exists( $username ) ) {

			// Create the user
			// WordPress sends a password reset link so this password doesn't get used, but it does exist in the database, which is helpful to prevent access before the user uses their password reset email.
			$params['user_pass'] = array(
				'value' => wp_generate_password( 12, false ),
				'method_modify' => 'wp_insert_user',
				'method_read' => 'get_user_by',
			);

			foreach ( $params as $key => $value ) {
				if ( 'wp_insert_user' === $value['method_modify'] ) {
					$content[ $key ] = $value['value'];
					unset( $params[ $key ] );
				}
			}

			$user_id = wp_insert_user( $content );

			if ( is_wp_error( $user_id ) ) {
				$success = false;
				$errors = $user_id;
			} else {
				$success = true;
				$errors = array();
				foreach ( $params as $key => $value ) {
					$method = $value['method_modify'];
					$meta_id = $method( $user_id, $key, $value['value'] );
					if ( false === $meta_id ) {
						$success = false;
						$errors[] = array(
							'message' => sprintf(
								// translators: %1$s is a method name.
								esc_html__( 'Tried to upsert meta with method %1$s.', 'object-sync-for-salesforce' ),
								esc_html( $method )
							),
							'key' => $key,
							'value' => $value,
						);
					}
				}

				// Developers can use this hook to set any other user data - permissions, etc.
				do_action( 'object_sync_for_salesforce_set_more_user_data', $user_id, $params, 'create' );

				// Send notification of new user.
				// todo: Figure out what permissions ought to get notifications for this and make sure it works the right way.
				wp_new_user_notification( $user_id, null, 'admin user' );

			}
		} else {
			$user_id = username_exists( $username );
		} // End if().

		if ( is_wp_error( $user_id ) ) {
			$success = false;
			$errors = $user_id;
		} else {
			$success = true;
			$errors = array();
		}

		$result = array(
			'data' => array(
				$id_field => $user_id,
				'success' => $success,
			),
			'errors' => $errors,
		);

		return $result;

	}

	/**
	 * Create a new WordPress user or update it if a match is found.
	 *
	 * @param string $key What key we are looking at for possible matches.
	 * @param string $value What value we are looking at for possible matches.
	 * @param array  $methods What WordPress methods do we use to get the data, if there are any. otherwise, maybe will have to do a wpdb query.
	 * @param array  $params Array of user data params. This is generated by Object_Sync_Sf_Mapping::map_params().
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 * @param bool   $push_drafts Whether to save WordPress drafts when pushing to Salesforce.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function user_upsert( $key, $value, $methods = array(), $params, $id_field = 'ID', $push_drafts = false, $check_only = false ) {

		// If the key is user_email, we need to make it just email because that is how the WordPress method reads it.
		$method = $methods['method_match'];
		if ( '' !== $method ) {
			// This should give us the user object.
			$user = $method( str_replace( 'user_', '', $key ), $value );
			if ( isset( $user->{$id_field} ) ) {
				// User does exist after checking the matching value. we want its id.
				$user_id = $user->{$id_field};

				if ( true === $check_only ) {
					// We are just checking to see if there is a match.
					return $user_id;
				}

				// On the prematch fields, we specify the method_update param.
				if ( isset( $methods['method_update'] ) ) {
					$method = $methods['method_update'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
			} elseif ( false === $check_only ) {
				// User does not exist after checking the matching value. create it.
				// On the prematch fields, we specify the method_create param.
				if ( isset( $methods['method_create'] ) ) {
					$method = $methods['method_create'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
				$result = $this->user_create( $params );
				return $result;
			} else {
				// Check only is true but there's not a user yet.
				return null;
			} // End if().
		} else {
			// There is no method by which to check the user. we can check other ways here.
			$params[ $key ] = array(
				'value' => $value,
				'method_modify' => $methods['method_modify'],
				'method_read' => $methods['method_read'],
			);

			// Allow username to be email address or username.
			// The username could be autogenerated before this point for the sake of URLs.
			if ( isset( $params['user_email']['value'] ) ) {
				$username = $params['user_email']['value'];
				$email_address = $params['user_email']['value'];
			}
			if ( isset( $params['user_login']['value'] ) ) { // user_login is used by username_exists.
				$username = $params['user_login']['value'];
			}

			$existing_id = username_exists( $username ); // Returns an id if there is a result.

			// User does not exist after more checking. we want to create it.
			if ( false === $existing_id && false === $check_only ) {
				$result = $this->user_create( $params );
				return $result;
			} elseif ( true === $check_only ) {
				// We are just checking to see if there is a match.
				return $existing_id;
			} else {
				// User does exist based on username, and we aren't doing a check only. we want to update the wp user here.
				$user_id = $existing_id;
			}
		} // End if().

		if ( isset( $user_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->user_update( $user_id, $params );
			return $result;
		}

		// Create log entry for lack of a user id.
		if ( isset( $this->logging ) ) {
			$logging = $this->logging;
		} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
			$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
		}
		$logging->setup(
			// todo: can we get any more specific about this?
			esc_html__( 'Error: Users: Tried to run user_upsert, and ended up without a user id', 'object-sync-for-salesforce' ),
			'',
			0,
			0,
			'error'
		);

	}

	/**
	 * Update a WordPress user.
	 *
	 * @param string $user_id The ID for the user to be updated. This value needs to be in the array that is sent to wp_update_user.
	 * @param array  $params Array of user data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 *
	 * @return array
	 *   data:
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function user_update( $user_id, $params, $id_field = 'ID' ) {
		$content = array();
		$content[ $id_field ] = $user_id;
		foreach ( $params as $key => $value ) {
			if ( 'wp_update_user' === $value['method_modify'] ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		$user_id = wp_update_user( $content );

		if ( is_wp_error( $user_id ) ) {
			$success = false;
			$errors = $user_id;
		} else {
			$success = true;
			$errors = array();
			foreach ( $params as $key => $value ) {
				$method = $value['method_modify'];
				$meta_id = $method( $user_id, $key, $value['value'] );
				if ( false === $meta_id ) {
					$success = false;
					$errors[] = array(
						'key' => $key,
						'value' => $value,
					);
				}
			}

			// Developers can use this hook to set any other user data - permissions, etc.
			do_action( 'object_sync_for_salesforce_set_more_user_data', $user_id, $params, 'update' );

		}

		$result = array(
			'data' => array(
				$id_field => $user_id,
				'success' => $success,
			),
			'errors' => $errors,
		);
		return $result;
	}

	/**
	 * Delete a WordPress user.
	 *
	 * @param int $id User ID.
	 * @param int $reassign If we should reassign any posts to other users. We don't change this from NULL anywhere in this plugin.
	 *
	 * @return boolean true if successful
	 */
	private function user_delete( $id, $reassign = null ) {
		// According to https://codex.wordpress.org/Function_Reference/wp_delete_user we have to include user.php first; otherwise it throws undefined error.
		require_once( './wp-admin/includes/user.php' );
		$result = wp_delete_user( $id, $reassign );
		return $result;
	}

	/**
	 * Create a new WordPress post.
	 *
	 * @param array  $params Array of post data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 * @param string $post_type Optional string for custom post type, if applicable.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function post_create( $params, $id_field = 'ID', $post_type = '' ) {

		// This is a new post; it does not exist in WordPress
		if ( ! function_exists( 'post_exists' ) ) {
			require_once( ABSPATH . 'wp-admin/includes/post.php' );
		}
		$post_exists = post_exists( $params['post_title']['value'], $params['post_content']['value'], $params['post_date']['value'] );

		foreach ( $params as $key => $value ) {
			if ( 'wp_insert_post' === $value['method_modify'] || 0 === $post_exists ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		if ( '' !== $post_type ) {
			$content['post_type'] = $post_type;
		}

		// WordPress post creation will fail with an object of 0 if there is no title or content
		// I think we should allow this to happen and not make users' data decisions, so
		// if we're receiving nothing for either of these, create a blank one so it doesn't fail
		// here we have to use $content because $params has already been unset
		if ( ! isset( $content['post_title'] ) ) {
			$content['post_title'] = ' ';
		}
		if ( ! isset( $content['post_content'] ) ) {
			$content['post_content'] = ' ';
		}

		if ( 0 !== $post_exists ) {
			$post_id = $post_exists;
		} else {
			$post_id = wp_insert_post( $content, true ); // return an error instead of a 0 id
		}

		if ( is_wp_error( $post_id ) ) {
			$success = false;
			$errors = $post_id;
		} else {
			$success = true;
			$errors = array();
			// If it's a custom post type, fix the methods.
			if ( isset( $params['RecordTypeId']['value'] ) ) {
				$params['RecordTypeId']['method_modify'] = 'update_post_meta';
				$params['RecordTypeId']['method_read'] = 'get_post_meta';
			}
			if ( is_array( $params ) && ! empty( $params ) ) {
				foreach ( $params as $key => $value ) {
					$method = $value['method_modify'];
					$meta_id = $method( $post_id, $key, $value['value'] );
					if ( false === $meta_id ) {
						$success = false;
						$errors[] = array(
							'key' => $key,
							'value' => $value,
						);
					}
				}
			}

			// Developers can use this hook to set any other post data.
			do_action( 'object_sync_for_salesforce_set_more_post_data', $post_id, $params, 'create' );

		}

		if ( is_wp_error( $post_id ) ) {
			$success = false;
			$errors = $post_id;
		} else {
			$success = true;
			$errors = array();
		}

		$result = array(
			'data' => array(
				$id_field => $post_id,
				'success' => $success,
			),
			'errors' => $errors,
		);

		return $result;

	}

	/**
	 * Create a new WordPress post or update it if a match is found.
	 *
	 * @param string $key What key we are looking at for possible matches.
	 * @param string $value What value we are looking at for possible matches.
	 * @param array  $methods What WordPress methods do we use to get the data, if there are any. otherwise, maybe will have to do a wpdb query.
	 * @param array  $params Array of post data params.
	 * @param string $id_field optional string of what the ID field is, if it is ever not ID.
	 * @param bool   $push_drafts Indicates whether we should match against draft posts.
	 * @param string $post_type Optional string for custom post type, if applicable.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function post_upsert( $key, $value, $methods = array(), $params, $id_field = 'ID', $push_drafts = false, $post_type = 'post', $check_only = false ) {

		$method = $methods['method_match'];

		if ( '' !== $method ) {
			// By default, posts use get_posts as the method. args can be like this.
			// The args don't really make sense, and are inconsistently documented.
			// This should give us the post object.
			$args = array();
			if ( 'post_title' === $key ) {
				$params['post_title'] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
				$args['name'] = sanitize_title( $value );
			} else {
				$args[ $key ] = $value;
			}
			$args['post_type'] = $post_type;
			$post_statuses = array( 'publish' );
			if ( true === $push_drafts ) {
				$post_statuses[] = 'draft';
			}
			$args['post_status'] = $post_statuses;

			$posts = $method( $args );

			if ( isset( $posts[0]->{$id_field} ) ) {
				// Post does exist after checking the matching value. We want its id.
				$post_id = $posts[0]->{$id_field};

				if ( true === $check_only ) {
					// We are just checking to see if there is a match.
					return $post_id;
				}

				// On the prematch fields, we specify the method_update param.
				if ( isset( $methods['method_update'] ) ) {
					$method = $methods['method_update'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
			} elseif ( false === $check_only ) {
				// Post does not exist after checking the matching value. create it.
				// On the prematch fields, we specify the method_create param.
				if ( isset( $methods['method_create'] ) ) {
					$method = $methods['method_create'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
				$result = $this->post_create( $params, $id_field, $post_type );
				return $result;
			} else {
				// Check only is true but there's not a post yet.
				return null;
			} // End if().
		} else {
			// There is no method by which to check the post. we can check other ways here.
			$params[ $key ] = array(
				'value' => $value,
				'method_modify' => $methods['method_modify'],
				'method_read' => $methods['method_read'],
			);

			// If we have a title, use it to check for existing post.
			if ( isset( $params['post_title']['value'] ) ) {
				$title = $params['post_title']['value'];
			}

			// If we have content, use it to check for existing post.
			if ( isset( $params['post_content']['value'] ) ) {
				$content = $params['post_content']['value'];
			} else {
				$content = '';
			}

			// If we have a date, use it to check for existing post.
			if ( isset( $params['post_date']['value'] ) ) {
				$date = $params['post_date']['value'];
			} else {
				$date = '';
			}
			if ( ! function_exists( 'post_exists' ) ) {
				require_once( ABSPATH . 'wp-admin/includes/post.php' );
			}
			$existing_id = post_exists( $title, $content, $date ); // Returns an id if there is a result. Returns 0 if not.

			// Post does not exist after more checking. maybe we want to create it.
			if ( 0 === $existing_id && false === $check_only ) {
				$result = $this->post_create( $params, $id_field, $post_type );
				return $result;
			} elseif ( true === $check_only ) {
				// We are just checking to see if there is a match.
				return $existing_id;
			} else {
				// Post does exist based on fields, and we aren't doing a check only. we want to update the wp post here.
				$post_id = $existing_id;
			}

			return $result;

		} // End if().

		if ( isset( $post_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->post_update( $post_id, $params, $id_field, $post_type );
			return $result;
		}
		// Create log entry for lack of a post id.
		if ( isset( $this->logging ) ) {
			$logging = $this->logging;
		} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
			$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
		}
		$logging->setup(
			// todo: can we be more explicit here about what post upsert failed?
			esc_html__( 'Error: Posts: Tried to run post_upsert, and ended up without a post id', 'object-sync-for-salesforce' ),
			'',
			0,
			0,
			'error'
		);

	}

	/**
	 * Update a WordPress post.
	 *
	 * @param string $post_id The ID for the post to be updated. This value needs to be in the array that is sent to wp_update_post.
	 * @param array  $params Array of post data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 * @param string $post_type Optional string for custom post type, if applicable.
	 *
	 * @return array
	 *   data:
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function post_update( $post_id, $params, $id_field = 'ID', $post_type = '' ) {
		$content = array();
		$content[ $id_field ] = $post_id;
		foreach ( $params as $key => $value ) {
			if ( 'wp_update_post' === $value['method_modify'] ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		if ( '' !== $post_type ) {
			$content['post_type'] = $post_type;
		}

		$post_id = wp_update_post( $content, true ); // return an error instead of a 0 id

		if ( is_wp_error( $post_id ) ) {
			$success = false;
			$errors = $post_id;
		} else {
			$success = true;
			$errors = array();
			// If it's a custom post type, fix the methods.
			if ( isset( $params['RecordTypeId']['value'] ) ) {
				$params['RecordTypeId']['method_modify'] = 'update_post_meta';
				$params['RecordTypeId']['method_read'] = 'get_post_meta';
			}
			if ( is_array( $params ) && ! empty( $params ) ) {
				foreach ( $params as $key => $value ) {
					$method = $value['method_modify'];
					$meta_id = $method( $post_id, $key, $value['value'] );
					if ( false === $meta_id ) {
						$success = false;
						$errors[] = array(
							'key' => $key,
							'value' => $value,
						);
					}
				}
			}

			// Developers can use this hook to set any other post data.
			do_action( 'object_sync_for_salesforce_set_more_post_data', $post_id, $params, 'update' );

		}

		$result = array(
			'data' => array(
				$id_field => $post_id,
				'success' => $success,
			),
			'errors' => $errors,
		);
		return $result;
	}

	/**
	 * Delete a WordPress post.
	 *
	 * @param int  $id Post ID.
	 * @param bool $force_delete If we should bypass the trash. We don't change this from FALSE anywhere in this plugin.
	 *
	 * @return mixed post object if successful, false if failed
	 */
	private function post_delete( $id, $force_delete = false ) {
		$result = wp_delete_post( $id, $force_delete );
		return $result;
	}

	/**
	 * Create a new WordPress attachment.
	 *
	 * @param array  $params Array of attachment data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function attachment_create( $params, $id_field = 'ID' ) {

		if ( ! function_exists( 'post_exists' ) ) {
			require_once( ABSPATH . 'wp-admin/includes/post.php' );
		}
		$attachment_exists = post_exists( $params['post_title']['value'], $params['post_content']['value'], $params['post_date']['value'] );

		// WP requires post_title, post_content (can be empty), post_status, and post_mime_type to create an attachment.
		foreach ( $params as $key => $value ) {
			if ( 'wp_insert_attachment' === $value['method_modify'] || 0 === $attachment_exists ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		// Developers can use this hook to pass filename and parent data for the attachment.
		$params = apply_filters( 'object_sync_for_salesforce_set_initial_attachment_data', $params );

		if ( isset( $params['filename']['value'] ) ) {
			$filename = $params['filename']['value'];
		} else {
			$filename = false;
		}

		if ( isset( $params['parent']['value'] ) ) {
			$parent = $params['parent']['value'];
		} else {
			$parent = 0;
		}

		if ( 0 !== $attachment_exists ) {
			$attachment_id = $attachment_exists;
		} else {
			$attachment_id = wp_insert_attachment( $content, $filename, $parent );
		}

		if ( is_wp_error( $attachment_id ) ) {
			$success = false;
			$errors = $attachment_id;
		} else {
			$success = true;
			$errors = array();

			if ( false !== $filename ) {
				// According to https://codex.wordpress.org/Function_Reference/wp_insert_attachment we need this file.
				require_once( ABSPATH . 'wp-admin/includes/image.php' );
				// Generate metadata for the attachment.
				$attach_data = wp_generate_attachment_metadata( $attachment_id, $filename );
				wp_update_attachment_metadata( $attachment_id, $attach_data );
			}

			if ( 0 !== $parent ) {
				set_post_thumbnail( $parent_post_id, $attachment_id );
			}

			// Developers can use this hook to set any other attachment data.
			do_action( 'object_sync_for_salesforce_set_more_attachment_data', $attachment_id, $params, 'create' );

		}

		$result = array(
			'data' => array(
				$id_field => $attachment_id,
				'success' => $success,
			),
			'errors' => $errors,
		);

		return $result;

	}

	/**
	 * Create a new WordPress attachment or update it if a match is found.
	 *
	 * @param string $key What key we are looking at for possible matches.
	 * @param string $value What value we are looking at for possible matches.
	 * @param array  $methods What WordPress methods do we use to get the data, if there are any. otherwise, maybe will have to do a wpdb query.
	 * @param array  $params Array of attachment data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function attachment_upsert( $key, $value, $methods = array(), $params, $id_field = 'ID', $check_only = false ) {

		$method = $methods['method_match'];

		if ( '' !== $method ) {
			// Get_posts is more helpful here, so that is the method attachment uses for 'read'.
			// By default, posts use get_posts as the method. args can be like this.
			// The args don't really make sense, and are inconsistently documented.
			// This should give us the post object.
			$args = array();
			if ( 'post_title' === $key ) {
				$params['post_title'] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
				$args['name'] = sanitize_title( $value );
			} else {
				$args[ $key ] = $value;
			}
			$args['post_type'] = 'attachment';

			$posts = $method( $args );

			if ( isset( $posts[0]->{$id_field} ) ) {
				// Attachment does exist after checking the matching value. we want its id.
				$attachment_id = $posts[0]->{$id_field};

				if ( true === $check_only ) {
					// We are just checking to see if there is a match.
					return $attachment_id;
				}

				// On the prematch fields, we specify the method_update param.
				if ( isset( $methods['method_update'] ) ) {
					$method = $methods['method_update'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
			} elseif ( false === $check_only ) {
				// Attachment does not exist after checking the matching value. create it.
				// On the prematch fields, we specify the method_create param.
				if ( isset( $methods['method_create'] ) ) {
					$method = $methods['method_create'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
				$result = $this->attachment_create( $params );
				return $result;
			} else {
				// Check only is true but there's not an attachment yet.
				return null;
			} // End if().
		} else {
			// There is no method by which to check the post. we can check other ways here.
			$params[ $key ] = array(
				'value' => $value,
				'method_modify' => $methods['method_modify'],
				'method_read' => $methods['method_read'],
			);

			// If we have a title, use it to check for existing post.
			if ( isset( $params['post_title']['value'] ) ) {
				$title = $params['post_title']['value'];
			}

			// If we have content, use it to check for existing post.
			if ( isset( $params['post_content']['value'] ) ) {
				$content = $params['post_content']['value'];
			} else {
				$content = '';
			}

			// If we have a date, use it to check for existing post.
			if ( isset( $params['post_date']['value'] ) ) {
				$date = $params['post_date']['value'];
			} else {
				$date = '';
			}

			if ( ! function_exists( 'post_exists' ) ) {
				require_once( ABSPATH . 'wp-admin/includes/post.php' );
			}
			$existing_id = post_exists( $title, $content, $date ); // Returns an id if there is a result. Returns 0 if not.

			// Attachment does not exist after more checking. maybe we want to create it.
			if ( 0 === $existing_id && false === $check_only ) {
				$result = $this->attachment_create( $params );
				return $result;
			} elseif ( true === $check_only ) {
				// We are just checking to see if there is a match.
				return $existing_id;
			} else {
				// Attachment does exist based on fields, and we aren't doing a check only. we want to update the wp attachment here.
				$attachment_id = $existing_id;
			}

			return $result;

		} // End if().

		if ( isset( $attachment_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->attachment_update( $attachment_id, $params );
			return $result;
		}

		// Create log entry for lack of an attachment id.
		if ( isset( $this->logging ) ) {
			$logging = $this->logging;
		} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
			$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
		}
		$logging->setup(
			esc_html__( 'Error: Attachment: Tried to run attachment_upsert, and ended up without an attachment id', 'object-sync-for-salesforce' ),
			'',
			0,
			0,
			'error'
		);

	}

	/**
	 * Update a WordPress attachment.
	 *
	 * @param string $attachment_id The ID for the attachment to be updated. This value needs to be in the array that is sent to the update methods.
	 * @param array  $params Array of attachment data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 *
	 * @return array
	 *   data:
	 *     success: 1
	 *   "errors" : [ ],
	 *
	 * Note: this method uses wp_insert_attachment for core content fields as there isn't a corresponding method for updating these rows
	 * it does use wp_update_attachment_metadata for the meta fields, though.
	 * Developers should use hooks to change this, if it does not meet their needs.
	 */
	private function attachment_update( $attachment_id, $params, $id_field = 'ID' ) {
		$content = array();
		$content[ $id_field ] = $attachment_id;
		foreach ( $params as $key => $value ) {
			if ( 'wp_insert_attachment' === $value['method_modify'] ) { // Should also be insert attachment maybe.
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		if ( isset( $params['filename']['value'] ) ) {
			$filename = $params['filename']['value'];
		} else {
			$filename = false;
		}

		if ( isset( $params['parent']['value'] ) ) {
			$parent = $params['parent']['value'];
		} else {
			$parent = 0;
		}

		$attachment_id = wp_insert_attachment( $content, $filename, $parent );

		if ( is_wp_error( $attachment_id ) ) {
			$success = false;
			$errors = $attachment_id;
		} else {
			$success = true;
			$errors = array();

			if ( false !== $filename ) {
				// According to https://codex.wordpress.org/Function_Reference/wp_insert_attachment we need this file.
				require_once( ABSPATH . 'wp-admin/includes/image.php' );
				// Generate metadata for the attachment.
				$attach_data = wp_generate_attachment_metadata( $attachment_id, $filename );
			}

			// Put the data from salesforce into the meta array.
			$attach_new_data = array();
			foreach ( $params as $key => $value ) {
				$method = $value['method_modify'];
				$attach_new_data[ $key ] = $value['value'];
			}

			if ( isset( $attach_data ) ) {
				$attach_data = array_merge( $attach_data, $attach_new_data );
			} else {
				$attach_data = $attach_new_data;
			}

			$meta_updated = wp_update_attachment_metadata( $attachment_id, $attach_data );

			if ( false === $meta_updated ) {
				$success = false;
				$errors[] = array(
					'key' => $key,
					'value' => $value,
				);
			}

			if ( 0 !== $parent ) {
				set_post_thumbnail( $parent_post_id, $attachment_id );
			}

			// Developers can use this hook to set any other attachment data.
			do_action( 'object_sync_for_salesforce_set_more_attachment_data', $attachment_id, $params, 'update' );

		} // End if().

		$result = array(
			'data' => array(
				$id_field => $attachment_id,
				'success' => $success,
			),
			'errors' => $errors,
		);
		return $result;
	}

	/**
	 * Delete a WordPress attachment.
	 *
	 * @param int  $id Attachment ID.
	 * @param bool $force_delete If we should bypass the trash. We don't change this from FALSE anywhere in this plugin.
	 *
	 * @return mixed
	 *   attachment object if successful, false if failed
	 */
	private function attachment_delete( $id, $force_delete = false ) {
		$result = wp_delete_attachment( $id, $force_delete );
		return $result;
	}

	/**
	 * Create a new WordPress term.
	 *
	 * @param array  $params Array of term data params.
	 * @param string $taxonomy The taxonomy to which to add the term. this is required.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function term_create( $params, $taxonomy, $id_field = 'ID' ) {
		if ( 'tag' === $taxonomy ) {
			$taxonomy = 'post_tag';
		}
		$args = array();

		if ( isset( $params['parent']['value'] ) ) {
			$parent = $params['parent']['value'];
		} else {
			$parent = 0;
		}
		// Check to see if this is a new term.
		if ( false === term_exists( $params['name']['value'], $taxonomy, $parent ) ) {
			foreach ( $params as $key => $value ) {
				if ( 'name' === $key ) {
					$name = $value['value'];
					unset( $params[ $key ] );
				}
				if ( 'wp_insert_term' === $value['method_modify'] && 'name' !== $key ) {
					$args[ $key ] = $value['value'];
					unset( $params[ $key ] );
				}
			}
			if ( isset( $name ) ) {
				$term = wp_insert_term( $name, $taxonomy, $args );
			}
		} else {
			$term = $term_exists;
		} // End if().

		if ( is_wp_error( $term ) ) {
			$success = false;
			$errors = $term;
		} else {
			$term_id = $term[ "$id_field" ];
			$success = true;
			$errors = array();
			foreach ( $params as $key => $value ) {
				$method = $value['method_modify'];
				$meta_id = $method( $term_id, $key, $value['value'] );
				if ( false === $meta_id ) {
					$success = false;
					$errors[] = array(
						'message' => sprintf(
							// translators: %1$s is a method name.
							esc_html__( 'Tried to create meta with method %1$s.', 'object-sync-for-salesforce' ),
							esc_html( $method )
						),
						'key' => $key,
						'value' => $value,
					);
				}
			}

			// Developers can use this hook to set any other term data.
			do_action( 'object_sync_for_salesforce_set_more_term_data', $term_id, $params, 'create' );

		}

		if ( is_wp_error( $term ) ) {
			$success = false;
			$errors = $term;
		} else {
			$success = true;
			$errors = array();
		}

		$result = array(
			'data' => array(
				$id_field => $term_id,
				'success' => $success,
			),
			'errors' => $errors,
		);

		return $result;

	}

	/**
	 * Create a new WordPress term or update it if a match is found.
	 *
	 * @param string $key What key we are looking at for possible matches.
	 * @param string $value What value we are looking at for possible matches.
	 * @param array  $methods What WordPress methods do we use to get the data, if there are any. otherwise, maybe will have to do a wpdb query.
	 * @param array  $params Array of term data params.
	 * @param string $taxonomy The taxonomy to which to add the term. this is required..
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 * @param bool   $push_drafts Whether to save WordPress drafts when pushing to Salesforce.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function term_upsert( $key, $value, $methods = array(), $params, $taxonomy, $id_field = 'ID', $push_drafts = false, $check_only = false ) {
		if ( 'tag' === $taxonomy ) {
			$taxonomy = 'post_tag';
		}
		$method = $methods['method_match'];
		if ( '' !== $method ) {
			// This should give us the term object.
			$term = $method( $key, $value, $taxonomy ); // We need to put the taxonomy in there probably.
			if ( isset( $term->{$id_field} ) ) {
				// Term does exist after checking the matching value. we want its id.
				$term_id = $term->{$id_field};

				if ( true === $check_only ) {
					// We are just checking to see if there is a match.
					return $term_id;
				}

				// On the prematch fields, we specify the method_update param.
				if ( isset( $methods['method_update'] ) ) {
					$method = $methods['method_update'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
			} elseif ( false === $check_only ) {
				// Term does not exist after checking the matching value. Create it.
				// On the prematch fields, we specify the method_create param.
				if ( isset( $methods['method_create'] ) ) {
					$method = $methods['method_create'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
				$result = $this->term_create( $params, $taxonomy, $id_field );
				return $result;
			} else {
				// Check only is true but there's not a term yet.
				return null;
			} // End if().
		} else {
			// There is no method by which to check the term. we can check other ways here.
			$params[ $key ] = array(
				'value' => $value,
				'method_modify' => $methods['method_modify'],
				'method_read' => $methods['method_read'],
			);

			if ( isset( $params['name']['value'] ) ) {
				$term = $params['name']['value'];
			}

			if ( isset( $params['parent']['value'] ) ) {
				$parent = $params['parent']['value'];
			} else {
				$parent = 0;
			}

			// Returns an id if there is a result. Returns null if it does not exist.
			// wpcom_vip_term_exists is cached, and therefore preferred.
			if ( function_exists( 'wpcom_vip_term_exists' ) ) {
				$existing_id = wpcom_vip_term_exists( $term, $taxonomy, $parent );
			} else {
				$existing_id = term_exists( $term, $taxonomy, $parent );
			}

			// Term does not exist after more checking. maybe we want to create it.
			if ( null === $existing_id && false === $check_only ) {
				$result = $this->term_create( $params, $taxonomy, $id_field );
				return $result;
			} elseif ( true === $check_only ) {
				// We are just checking to see if there is a match.
				return $existing_id;
			} else {
				// Term does exist based on criteria, and we aren't doing a check only. we want to update the wp term here.
				$term_id = $existing_id;
			}
		} // End if().

		if ( isset( $term_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->term_update( $term_id, $params, $taxonomy, $id_field );
			return $result;
		}
		// Create log entry for lack of a term id.
		if ( isset( $this->logging ) ) {
			$logging = $this->logging;
		} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
			$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
		}
		$logging->setup(
			esc_html__( 'Error: Terms: Tried to run term_upsert, and ended up without a term id', 'object-sync-for-salesforce' ),
			'',
			0,
			0,
			'error'
		);

	}

	/**
	 * Update a WordPress term.
	 *
	 * @param string $term_id The ID for the term to be updated. This value needs to be in the array that is sent to wp_update_term.
	 * @param array  $params Array of term data params.
	 * @param string $taxonomy The taxonomy to which to add the term. this is required.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 *
	 * @return array
	 *   data:
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function term_update( $term_id, $params, $taxonomy, $id_field = 'ID' ) {
		if ( 'tag' === $taxonomy ) {
			$taxonomy = 'post_tag';
		}
		$args = array();
		foreach ( $params as $key => $value ) {
			if ( 'wp_update_term' === $value['method_modify'] ) {
				$args[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}
		$term = wp_update_term( $term_id, $taxonomy, $args );

		if ( is_wp_error( $term ) ) {
			$success = false;
			$errors = $term;
		} else {
			$term_id = $term[ "$id_field" ];
			$success = true;
			$errors = array();
			foreach ( $params as $key => $value ) {
				$method = $value['method_modify'];
				$meta_id = $method( $term_id, $key, $value['value'] );
				if ( false === $meta_id ) {
					$success = false;
					$errors[] = array(
						'message' => sprintf(
							// translators: %1$s is a method name.
							esc_html__( 'Tried to update meta with method %1$s.', 'object-sync-for-salesforce' ),
							esc_html( $method )
						),
						'key' => $key,
						'value' => $value,
					);
				}
			}

			// Developers can use this hook to set any other term data.
			do_action( 'object_sync_for_salesforce_set_more_term_data', $term_id, $params, 'update' );

		}

		if ( is_wp_error( $term ) ) {
			$success = false;
			$errors = $term;
		} else {
			$success = true;
			$errors = array();
		}

		$result = array(
			'data' => array(
				$id_field => $term_id,
				'success' => $success,
			),
			'errors' => $errors,
		);

		return $result;

	}

	/**
	 * Delete a WordPress term.
	 *
	 * @param string $term_id The ID for the term to be updated. This value needs to be in the array that is sent to wp_update_term.
	 * @param string $taxonomy The taxonomy from which to delete the term. this is required.
	 *
	 * @return bool True if successful, false if failed.
	 */
	private function term_delete( $term_id, $taxonomy ) {
		if ( 'tag' === $taxonomy ) {
			$taxonomy = 'post_tag';
		}
		$result = wp_delete_term( $term_id, $taxonomy );
		return $result;
	}

	/**
	 * Create a new WordPress comment.
	 *
	 * @param array  $params Array of comment data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not comment_ID.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function comment_create( $params, $id_field = 'comment_ID' ) {
		$comment_exists = comment_exists( $params['comment_author']['value'], $params['comment_date']['value'], $params['timezone']['value'] );
		foreach ( $params as $key => $value ) {
			if ( 'wp_new_comment' === $value['method_modify'] ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		// Fields that are required for comments, even if they are empty values.
		if ( ! isset( $content['comment_author'] ) ) {
			$content['comment_author'] = '';
		}
		if ( ! isset( $content['comment_author_IP'] ) ) {
			$content['comment_author_IP'] = '';
		}
		if ( ! isset( $content['comment_author_email'] ) ) {
			$content['comment_author_email'] = '';
		}
		if ( ! isset( $content['comment_author_url'] ) ) {
			$content['comment_author_url'] = '';
		}
		if ( ! isset( $content['comment_type'] ) ) {
			$content['comment_type'] = '';
		}

		if ( null !== $comment_exists ) {
			$comment_id = $comment_exists;
		} else {
			$comment_id = wp_new_comment( $content );
		}

		if ( is_wp_error( $comment_id ) ) {
			$success = false;
			$errors = $comment_id;
		} else {
			$success = true;
			$errors = array();
			foreach ( $params as $key => $value ) {
				$method = $value['method_modify'];
				$meta_id = $method( $comment_id, $key, $value['value'] );
				if ( false === $meta_id ) {
					$success = false;
					$errors[] = array(
						'message' => sprintf(
							// translators: %1$s is a method name.
							esc_html__( 'Tried to add meta with method %1$s.', 'object-sync-for-salesforce' ),
							esc_html( $method )
						),
						'key' => $key,
						'value' => $value,
					);
				}
			}

			// Developers can use this hook to set any other comment data.
			do_action( 'object_sync_for_salesforce_set_more_comment_data', $comment_id, $params, 'create' );

		}

		if ( is_wp_error( $comment_id ) ) {
			$success = false;
			$errors = $comment_id;
		} else {
			$success = true;
			$errors = array();
		}

		$result = array(
			'data' => array(
				$id_field => $comment_id,
				'success' => $success,
			),
			'errors' => $errors,
		);

		return $result;

	}

	/**
	 * Create a new WordPress comment or update it if a match is found.
	 *
	 * @param string $key What key we are looking at for possible matches.
	 * @param string $value What value we are looking at for possible matches.
	 * @param array  $methods What WordPress methods do we use to get the data, if there are any. otherwise, maybe will have to do a wpdb query.
	 * @param array  $params Array of comment data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not comment_ID.
	 * @param bool   $push_drafts Whether to save WordPress drafts when pushing to Salesforce.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function comment_upsert( $key, $value, $methods, $params, $id_field = 'comment_ID', $push_drafts = false, $check_only = false ) {
		$method = $methods['method_match'];
		if ( 'get_comment' === $method ) {
			$method = 'get_comments';
		}
		if ( '' !== $method ) {
			// This should give us the comment object.
			$match = array();
			if ( 'comment_author' === $key ) {
				$match['author__in'] = array( $value );
			} else {
				$key = str_replace( 'comment_', '', $key );
				$match[ $key ] = $value;
			}
			$comments = $method( $match );

			if ( 1 === count( $comments ) ) {
				$comment = $comments[0];
				// Comment does exist after checking the matching value. we want its id.
				$comment_id = $comment->{$id_field};

				if ( true === $check_only ) {
					// We are just checking to see if there is a match.
					return $comment_id;
				}

				// On the prematch fields, we specify the method_update param.
				if ( isset( $methods['method_update'] ) ) {
					$method = $methods['method_update'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
			} elseif ( count( $comments ) > 1 ) {
				$status = 'error';
				// Create log entry for multiple matches.
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
					$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
				}
				$logging->setup(
					sprintf(
						// translators: %1$s is a number. %2$s is a key. %3$s is the value of that key. %4$s is a var_export'd array of comments.
						esc_html__( 'Error: Comments: there are %1$s comment matches for the Salesforce key %2$s with the value of %3$s. Here they are: %4$s', 'object-sync-for-salesforce' ),
						absint( count( $comments ) ),
						esc_html( $key ),
						esc_html( $value ),
						esc_html( var_export( $comments ) ) // Debugging code in production because having useful error messages is good.
					),
					'',
					0,
					0,
					$status
				);
			} elseif ( false === $check_only ) {
				// Comment does not exist after checking the matching value. Create it.
				// On the prematch fields, we specify the method_create param.
				if ( isset( $methods['method_create'] ) ) {
					$method = $methods['method_create'];
				} else {
					$method = $methods['method_modify'];
				}
				$params[ $key ] = array(
					'value' => $value,
					'method_modify' => $method,
					'method_read' => $methods['method_read'],
				);
				$result = $this->comment_create( $params, $id_field );
				return $result;
			} else {
				// Check only is true but there's not a comment yet.
				return null;
			} // End if().
		} else {
			// There is no method by which to check the comment. We can check other ways here.
			$params[ $key ] = array(
				'value' => $value,
				'method_modify' => $methods['method_modify'],
				'method_read' => $methods['method_read'],
			);

			if ( isset( $params['comment_author']['value'] ) ) {
				$comment_author = $params['comment_author']['value'];
			}

			if ( isset( $params['comment_date']['value'] ) ) {
				$comment_date = $params['comment_date']['value'];
			}

			if ( isset( $params['timezone']['value'] ) ) {
				$timezone = $params['timezone']['value'];
			} else {
				$timezone = 'blog';
			}

			$existing_id = comment_exists( $comment_author, $comment_date, $timezone ); // Returns an id if there is a result. Uses $wpdb->get_var, so it returns null if there is no value

			// Comment does not exist after more checking. We want to create it.
			if ( null === $existing_id && false === $check_only ) {
				$result = $this->comment_create( $params, $id_field );
				return $result;
			} elseif ( true === $check_only ) {
				// We are just checking to see if there is a match.
				return $existing_id;
			} else {
				// Comment does exist based on username, and we aren't doing a check only. we want to update the wp user here.
				$comment_id = $existing_id;
			}
		} // End if() that sets up the parameters in the $params array.

		if ( isset( $comment_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->comment_update( $comment_id, $params, $id_field );
			return $result;
		}

		// Create log entry for lack of a comment id.
		if ( isset( $this->logging ) ) {
			$logging = $this->logging;
		} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
			$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
		}
		$logging->setup(
			esc_html__( 'Error: Comments: Tried to run comment_upsert, and ended up without a comment id', 'object-sync-for-salesforce' ),
			'',
			0,
			0,
			'error'
		);

	}

	/**
	 * Update a WordPress comment.
	 *
	 * @param string $comment_id The ID for the comment to be updated. This value needs to be in the array that is sent to wp_update_comment.
	 * @param array  $params Array of comment data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 *
	 * @return array
	 *   data:
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function comment_update( $comment_id, $params, $id_field = 'comment_ID' ) {
		$content = array();
		$content[ $id_field ] = $comment_id;
		foreach ( $params as $key => $value ) {
			if ( 'wp_update_comment' === $value['method_modify'] ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		$updated = wp_update_comment( $content );

		if ( 0 === $updated ) {
			$success = false;
			$errors = $updated;
		} else {
			$success = true;
			$errors = array();
			foreach ( $params as $key => $value ) {
				$method = $value['method_modify'];
				$meta_id = $method( $comment_id, $key, $value['value'] );
				if ( false === $meta_id ) {
					$success = false;
					$errors[] = array(
						'message' => sprintf(
							// Translators: %1$s is a method name.
							esc_html__( 'Tried to update meta with method %1$s.', 'object-sync-for-salesforce' ),
							esc_html( $method )
						),
						'key' => $key,
						'value' => $value,
					);
				}
			}

			// Developers can use this hook to set any other comment data.
			do_action( 'object_sync_for_salesforce_set_more_comment_data', $comment_id, $params, 'update' );

		}

		if ( is_wp_error( $updated ) ) {
			$success = false;
			$errors = $updated;
		} else {
			$success = true;
			$errors = array();
		}

		$result = array(
			'data' => array(
				$id_field => $comment_id,
				'success' => $success,
			),
			'errors' => $errors,
		);

		return $result;

	}

	/**
	 * Delete a WordPress comment.
	 *
	 * @param int  $id Comment ID.
	 * @param bool $force_delete If we should bypass the trash. We don't change this from FALSE anywhere in this plugin.
	 *
	 * @return boolean true if successful, false if failed.
	 */
	private function comment_delete( $id, $force_delete = false ) {
		$result = wp_delete_comment( $id, $force_delete );
		return $result;
	}

}

/**
 * WordpressException is a placeholder class in the event that we want to modify Exception for our own purposes.
 */
class WordpressException extends Exception {
}
