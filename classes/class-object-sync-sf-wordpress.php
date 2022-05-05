<?php
/**
 * Work with the WordPress data. This class can make read and write calls to the WordPress database, and also cache the responses.
 *
 * @class   Object_Sync_Sf_WordPress
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_WordPress class.
 */
class Object_Sync_Sf_WordPress {

	/**
	 * Current version of the plugin
	 *
	 * @var string
	 */
	public $version;

	/**
	 * The main plugin file
	 *
	 * @var string
	 */
	public $file;

	/**
	 * Global object of `$wpdb`, the WordPress database
	 *
	 * @var object
	 */
	public $wpdb;

	/**
	 * The plugin's slug so we can include it when necessary
	 *
	 * @var string
	 */
	public $slug;

	/**
	 * The plugin's prefix when saving options to the database
	 *
	 * @var string
	 */
	public $option_prefix;

	/**
	 * Object_Sync_Sf_Logging class
	 *
	 * @var object
	 */
	public $logging;

	/**
	 * Object_Sync_Sf_Mapping class
	 *
	 * @var object
	 */
	public $mappings;

	/**
	 * Supported WordPress objects
	 *
	 * @var array
	 */
	public $wordpress_objects;

	/**
	 * Method call options
	 *
	 * @var array
	 */
	public $options;

	/**
	 * Object_Sync_Sf_WordPress_Transient class
	 *
	 * @var object
	 */
	public $sfwp_transients;

	/**
	 * Whether the plugin is in debug mode
	 *
	 * @var string
	 */
	public $debug;

	/**
	 * Constructor for WordPress class
	 */
	public function __construct() {
		$this->version       = object_sync_for_salesforce()->version;
		$this->file          = object_sync_for_salesforce()->file;
		$this->wpdb          = object_sync_for_salesforce()->wpdb;
		$this->slug          = object_sync_for_salesforce()->slug;
		$this->option_prefix = object_sync_for_salesforce()->option_prefix;

		$this->logging  = object_sync_for_salesforce()->logging;
		$this->mappings = object_sync_for_salesforce()->mappings;

		add_action(
			'admin_init',
			function() {
				$this->wordpress_objects = $this->get_object_types();
			}
		);

		$this->options = array(
			'cache'            => true,
			'cache_expiration' => $this->cache_expiration( 'wordpress_data_cache', 86400 ),
			'type'             => 'read',
		);

		$this->sfwp_transients = new Object_Sync_Sf_WordPress_Transient( 'sfwp_transients' );

		$this->debug = get_option( $this->option_prefix . 'debug_mode', false );
		$this->debug = filter_var( $this->debug, FILTER_VALIDATE_BOOLEAN );

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
			function add_more_types( $wordpress_object_types ) {
				$wordpress_object_types[] = 'foo'; // this will add to the existing types.
				return $wordpress_object_types;
			}

			add_filter( 'object_sync_for_salesforce_remove_wordpress_types', 'wordpress_object_types', 10, 1 );
			function remove_types( $types_to_remove ) {
				$types_to_remove[] = 'revision'; // this adds to the array of types to ignore
				return $types_to_remove;
			}
		*/

		// this should include the available object types and send them to the hook.
		$wordpress_types_not_posts_include = array( 'user', 'comment', 'category', 'tag' );
		$wordpress_objects                 = array_merge( get_post_types(), $wordpress_types_not_posts_include );
		// this should be all the objects.
		$wordpress_objects = apply_filters( $this->option_prefix . 'add_more_wordpress_types', $wordpress_objects );

		// by default, only remove the revision, log, and scheduled-action types that we use in this plugin.
		$types_to_remove = apply_filters( $this->option_prefix . 'remove_wordpress_types', array( 'wp_log', 'scheduled-action', 'revision' ) );

		// if the hook filters out any types, remove them from the visible list.
		if ( ! empty( $types_to_remove ) ) {
			$wordpress_objects = array_diff( $wordpress_objects, $types_to_remove );
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
				'object_name'     => 'post',
				'content_methods' => array(
					'create' => 'wp_insert_attachment',
					'read'   => 'get_posts',
					'update' => 'wp_insert_attachment',
					'delete' => 'wp_delete_attachment',
					'match'  => 'get_posts',
				),
				'meta_methods'    => array(
					'create' => 'wp_generate_attachment_metadata',
					'read'   => 'wp_get_attachment_metadata',
					'update' => 'wp_update_attachment_metadata',
					'delete' => '',
					'match'  => 'WP_Query',
				),
				'content_table'   => $this->wpdb->prefix . 'posts',
				'id_field'        => 'ID',
				'meta_table'      => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where'           => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys'     => array(),
			);
		} elseif ( 'user' === $object_type ) {
			// User meta fields need to use update_user_meta for create as well, otherwise it'll just get created twice because apparently when the post is created it's already there.

			$user_meta_methods = array(
				'create' => 'update_user_meta',
				'read'   => 'get_user_meta',
				'update' => 'update_user_meta',
				'delete' => 'delete_user_meta',
			);

			$object_table_structure = array(
				'object_name'     => 'user',
				'content_methods' => array(
					'create' => 'wp_insert_user',
					'read'   => 'get_user_by',
					'update' => 'wp_update_user',
					'delete' => 'wp_delete_user',
					'match'  => 'get_user_by',
				),
				'meta_methods'    => $user_meta_methods,
				'content_table'   => $this->wpdb->prefix . 'users',
				'id_field'        => 'ID',
				'meta_table'      => $this->wpdb->prefix . 'usermeta',
				'meta_join_field' => 'user_id',
				'where'           => '',
				'ignore_keys'     => array( // Keep it simple and avoid security risks.
					'user_pass',
					'user_activation_key',
					'session_tokens',
				),
			);
		} elseif ( 'post' === $object_type ) {
			$object_table_structure = array(
				'object_name'     => 'post',
				'content_methods' => array(
					'create' => 'wp_insert_post',
					'read'   => 'get_posts',
					'update' => 'wp_update_post',
					'delete' => 'wp_delete_post',
					'match'  => 'get_posts',
				),
				'meta_methods'    => array(
					'create' => 'add_post_meta',
					'read'   => 'get_post_meta',
					'update' => 'update_post_meta',
					'delete' => 'delete_post_meta',
					'match'  => 'WP_Query',
				),
				'content_table'   => $this->wpdb->prefix . 'posts',
				'id_field'        => 'ID',
				'meta_table'      => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where'           => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys'     => array(),
			);
		} elseif ( 'category' === $object_type || 'tag' === $object_type || 'post_tag' === $object_type ) {
			// I am unsure why post_tag wasn't here for so long, but i figure it probably needs to be there.
			$object_table_structure = array(
				'object_name'     => 'term',
				'content_methods' => array(
					'create' => 'wp_insert_term',
					'read'   => 'get_term_by',
					'update' => 'wp_update_term',
					'delete' => 'wp_delete_term',
					'match'  => 'get_term_by',
				),
				'meta_methods'    => array(
					'create' => 'add_term_meta',
					'read'   => 'get_term_meta',
					'update' => 'update_term_meta',
					'delete' => 'delete_metadata',
					'match'  => 'WP_Term_Query',
				),
				'content_table'   => $this->wpdb->prefix . 'terms',
				'id_field'        => 'term_id',
				'meta_table'      => array( $this->wpdb->prefix . 'termmeta', $this->wpdb->prefix . 'term_taxonomy' ),
				'meta_join_field' => 'term_id',
				'where'           => '',
				'ignore_keys'     => array(),
			);
		} elseif ( 'comment' === $object_type ) {
			$object_table_structure = array(
				'object_name'     => 'comment',
				'content_methods' => array(
					'create' => 'wp_new_comment',
					'read'   => 'get_comments',
					'update' => 'wp_update_comment',
					'delete' => 'wp_delete_comment',
					'match'  => 'get_comments',
				),
				'meta_methods'    => array(
					'create' => 'add_comment_meta',
					'read'   => 'get_comment_meta',
					'update' => 'update_comment_meta',
					'delete' => 'delete_comment_metadata',
					'match'  => 'WP_Comment_Query',
				),
				'content_table'   => $this->wpdb->prefix . 'comments',
				'id_field'        => 'comment_ID',
				'meta_table'      => $this->wpdb->prefix . 'commentmeta',
				'meta_join_field' => 'comment_id',
				'where'           => '',
				'ignore_keys'     => array(),
			);
		} else { // This is for custom post types.
			$object_table_structure = array(
				'object_name'     => 'post',
				'content_methods' => array(
					'create' => 'wp_insert_post',
					'read'   => 'get_posts',
					'update' => 'wp_update_post',
					'delete' => 'wp_delete_post',
					'match'  => 'get_posts',
				),
				'meta_methods'    => array(
					'create' => 'add_post_meta',
					'read'   => 'get_post_meta',
					'update' => 'update_post_meta',
					'delete' => 'delete_post_meta',
					'match'  => 'WP_Query',
				),
				'content_table'   => $this->wpdb->prefix . 'posts',
				'id_field'        => 'ID',
				'meta_table'      => $this->wpdb->prefix . 'postmeta',
				'meta_join_field' => 'post_id',
				'where'           => 'AND ' . $this->wpdb->prefix . 'posts.post_type = "' . $object_type . '"',
				'ignore_keys'     => array(),
			);
		} // End if() statement.

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

		$meta_table      = $object_table_structure['meta_table'];
		$meta_methods    = maybe_unserialize( $object_table_structure['meta_methods'] );
		$content_table   = $object_table_structure['content_table'];
		$content_methods = maybe_unserialize( $object_table_structure['content_methods'] );
		$id_field        = $object_table_structure['id_field'];
		$object_name     = $object_table_structure['object_name'];
		$where           = $object_table_structure['where'];
		$ignore_keys     = $object_table_structure['ignore_keys'];

		$object_fields = array();

		// Try to find the object fields in cache before acquiring it from other source.
		if ( true === $this->options['cache'] && 'write' !== $this->options['cache'] ) {
			$cached = $this->cache_get( $wordpress_object, array( 'data', 'meta' ) );
			if ( is_array( $cached ) ) {
				$object_fields['data']       = $cached;
				$object_fields['from_cache'] = true;
				$object_fields['cached']     = true;
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
			$object_fields['data']       = $this->object_fields( $object_name, $id_field, $content_table, $content_methods, $meta_table, $meta_methods, $where, $ignore_keys );
			$object_fields['from_cache'] = false;
			$object_fields['cached']     = false;
		}

		/*
		 * Developers can use this hook to change the WordPress object field array.
		 * The returned $object_fields needs to be an array like is described earlier in this method:
		 *     $object_fields = array( 'data' => array(), 'from_cache' => bool, 'cached' => bool );
		 * This is useful for custom objects that do not use the normal metadata table structure.
		 */
		$object_fields = apply_filters( $this->option_prefix . 'wordpress_object_fields', $object_fields, $wordpress_object );

		return $object_fields['data'];

	}

	/**
	 * Get WordPress data based on what object it is
	 *
	 * @param string $object_type The type of object.
	 * @param int    $object_id The ID of the object.
	 * @param bool   $is_deleted Whether the WordPress object has been deleted.
	 * @return array $wordpress_object
	 */
	public function get_wordpress_object_data( $object_type, $object_id, $is_deleted = false ) {
		$wordpress_object       = array();
		$object_table_structure = $this->get_wordpress_table_structure( $object_type );

		$meta_table      = $object_table_structure['meta_table'];
		$meta_methods    = maybe_unserialize( $object_table_structure['meta_methods'] );
		$content_table   = $object_table_structure['content_table'];
		$content_methods = maybe_unserialize( $object_table_structure['content_methods'] );
		$id_field        = $object_table_structure['id_field'];
		$object_name     = $object_table_structure['object_name'];
		$where           = $object_table_structure['where'];
		$ignore_keys     = $object_table_structure['ignore_keys'];

		if ( true === $is_deleted ) {
			$wordpress_object              = array();
			$wordpress_object[ $id_field ] = $object_id;
			return $wordpress_object;
		}

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

		if ( ! is_object( $data ) ) {
			return $wordpress_object;
		}

		$fields = $this->get_wordpress_object_fields( $object_type );
		foreach ( $fields as $key => $value ) {
			$field                      = $value['key'];
			$wordpress_object[ $field ] = $data->{$field};
		}

		/*
		 * Allow developers to change the WordPress object, including any formatting that needs to happen to the data.
		 * The returned $wordpress_object needs to be an array like described above.
		 * This is useful for custom objects, hidden fields, or custom formatting.
		 * Here's an example of filters to add/modify data:
		 *
			add_filter( 'object_sync_for_salesforce_wordpress_object_data', 'modify_data', 10, 2 );
			function modify_data( $wordpress_object, $object_type ) {
				$wordpress_object['field_a'] = 'i am a field value that salesforce wants to store but WordPress does not care about';
				// Add field values to specific WordPress objects such as 'post', 'page', 'user', a Custom Post Type, etc.
				if ( 'user' === $object_type ) {
					$wordpress_object['field_b'] = 'i am a field value that salesforce wants to store but WordPress does not care about';
				}
				return $wordpress_object;
			}
		*/

		$wordpress_object = apply_filters( $this->option_prefix . 'wordpress_object_data', $wordpress_object, $object_type );

		return $wordpress_object;

	}

	/**
	 * Check to see if this API call exists in the cache
	 * if it does, return the transient for that key
	 *
	 * @param string $url The API call we'd like to make.
	 * @param array  $args The arguents of the API call.
	 * @return $this->sfwp_transients->get $cachekey
	 */
	public function cache_get( $url, $args ) {
		if ( is_array( $args ) ) {
			$args[] = $url;
			array_multisort( $args );
		} else {
			$args .= $url;
		}

		$cachekey = md5( wp_json_encode( $args ) );
		return $this->sfwp_transients->get( $cachekey );
	}

	/**
	 * Create a cache entry for the current result, with the url and args as the key
	 *
	 * @param string $url The API query URL.
	 * @param array  $args The arguments passed on the API query.
	 * @param array  $data The data received.
	 * @param string $cache_expiration How long to keep the cache result around for.
	 * @return Bool whether or not the value was set
	 * @link https://wordpress.stackexchange.com/questions/174330/transient-storage-location-database-xcache-w3total-cache
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
		return $this->sfwp_transients->set( $cachekey, $data, $cache_expiration );
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
		$data_fields      = $this->wpdb->get_col( "DESC {$content_table}", 0 );
		$data_field_types = $this->wpdb->get_col( "DESC {$content_table}", 1 ); // get the database field types.

		if ( is_array( $meta_table ) ) {
			$tax_table  = $meta_table[1];
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
		$all_fields  = array();

		// by default, WordPress fields are editable except for an object ID field.
		// use the filter below to change this for any given field.
		// if a field is not editable, it will show in the fieldmap screen with a lock, and will be removed when saving data into WordPress.

		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		add_filter( 'object_sync_for_salesforce_wordpress_field_is_editable', 'wordpress_field_is_editable', 10, 2 );
		function wordpress_field_is_editable( $editable, $field_name ) {
			if ( 'ID' === $field_name ) {
				$editable = true;
			}
			return $editable;
		}
		*/

		foreach ( $data_fields as $key => $value ) {
			if ( ! in_array( $value, $ignore_keys, true ) ) {
				$editable = true;
				if ( $value === $id_field ) {
					$editable = false;
				}
				$editable     = apply_filters( $this->option_prefix . 'wordpress_field_is_editable', $editable, $value );
				$all_fields[] = array(
					'key'      => $value,
					'table'    => $content_table,
					'methods'  => serialize( $content_methods ),
					'type'     => $data_field_types[ $key ],
					'editable' => $editable,
				);
			}
		}

		foreach ( $meta_fields as $key => $value ) {
			if ( ! in_array( $value->meta_key, $ignore_keys, true ) ) {
				$editable = true;
				if ( $value === $id_field ) {
					$editable = false;
				}
				$editable     = apply_filters( $this->option_prefix . 'wordpress_field_is_editable', $editable, $value->meta_key );
				$all_fields[] = array(
					'key'      => $value->meta_key,
					'table'    => $meta_table,
					'methods'  => serialize( $meta_methods ),
					'editable' => $editable,
				);
			}
		}

		if ( 'term' === $object_name ) {
			$taxonomy = $this->wpdb->get_col( "DESC {$tax_table}", 0 );
			foreach ( $taxonomy as $key => $value ) {
				$exists = array_search( $value, array_column( $all_fields, 'key' ), true );
				if ( 0 !== $exists ) {
					$editable = true;
					if ( $value === $id_field ) {
						$editable = false;
					}
					$editable     = apply_filters( $this->option_prefix . 'wordpress_field_is_editable', $editable, $value );
					$all_fields[] = array(
						'key'      => $value,
						'table'    => $tax_table,
						'methods'  => serialize( $content_methods ),
						'editable' => $editable,
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
		$id_field  = $structure['id_field'];

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
				if ( ! has_filter( $this->option_prefix . 'create_custom_wordpress_item' ) ) {
					$result = $this->post_create( $params, $id_field, $name );
				} else {
					$result = apply_filters(
						$this->option_prefix . 'create_custom_wordpress_item',
						array(
							'params'   => $params,
							'name'     => $name,
							'id_field' => $id_field,
						)
					);
				}
				break;
		} // End switch() method.

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
	 * @param bool   $pull_to_drafts Whether to save to WordPress drafts when pulling from Salesforce.
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
	public function object_upsert( $name, $key, $value, $methods, $params, $pull_to_drafts = false, $check_only = false ) {

		$structure = $this->get_wordpress_table_structure( $name );
		$id_field  = $structure['id_field'];

		// If key is set, remove from $params to avoid SQL errors.
		if ( isset( $params[ $key ] ) ) {
			unset( $params[ $key ] );
		}

		// Allow developers to change both the key and value by which objects should be matched.
		$key   = apply_filters( $this->option_prefix . 'modify_upsert_key', $key );
		$value = apply_filters( $this->option_prefix . 'modify_upsert_value', $value );

		switch ( $name ) {
			case 'user':
				$result = $this->user_upsert( $key, $value, $methods, $params, $id_field, $pull_to_drafts, $check_only );
				break;
			case 'post':
				$result = $this->post_upsert( $key, $value, $methods, $params, $id_field, $pull_to_drafts, $name, $check_only );
				break;
			case 'attachment':
				$result = $this->attachment_upsert( $key, $value, $methods, $params, $id_field, $check_only );
				break;
			case 'category':
			case 'tag':
			case 'post_tag':
				$result = $this->term_upsert( $key, $value, $methods, $params, $name, $id_field, $check_only );
				break;
			case 'comment':
				$result = $this->comment_upsert( $key, $value, $methods, $params, $id_field, $pull_to_drafts, $check_only );
				break;
			default:
				/*
				 * Developers can use this hook to upsert objects with their own methods.
				 * The returned $result needs to be an array like this:
				 * $id_field should be the database key; i.e. 'ID' and the value should be the item's id, or whatever WordPress returns from the method (sometimes this can be an error)
				 * $success should be a boolean value
				 *     $result = array( 'data' => array( $id_field => $post_id, 'success' => $success ), 'errors' => $errors );
				 * Use hook like this:
				 *     add_filter( 'object_sync_for_salesforce_upsert_custom_wordpress_item', upsert_object, 10, 1 );
				 * The one param is:
				 *     array( 'key' => key, 'value' => value, 'methods' => methods, 'params' => array_of_params, 'id_field' => idfield, 'pull_to_drafts' => pulltodrafts, 'name' => name, 'check_only' => $check_only )
				*/
				// Check to see if someone is calling the filter, and apply it if so.
				if ( ! has_filter( $this->option_prefix . 'upsert_custom_wordpress_item' ) ) {
					$result = $this->post_upsert( $key, $value, $methods, $params, $id_field, $pull_to_drafts, $name, $check_only );
				} else {
					$result = apply_filters(
						$this->option_prefix . 'upsert_custom_wordpress_item',
						array(
							'key'            => $key,
							'value'          => $value,
							'methods'        => $methods,
							'params'         => $params,
							'id_field'       => $id_field,
							'pull_to_drafts' => $pull_to_drafts,
							'name'           => $name,
							'check_only'     => $check_only,
						)
					);
				}
				break;
		} // End switch() method.

		if ( 'missing_id' === $result['errors'] ) {
			$type = $result['data']['type'];
			// Create log entry for lack of an object id to upsert.
			if ( isset( $this->logging ) ) {
				$logging = $this->logging;
			} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
				$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
			}

			$status = 'error';
			$title  = sprintf(
				// translators: placeholders are: 1) the log status, 2) uppercase object type, 3) the object type.
				esc_html__( '%1$s: %2$s: Tried to run %3$s_upsert, and ended up without the %3$s id', 'object-sync-for-salesforce' ),
				ucfirst( esc_attr( $status ) ),
				ucfirst( esc_attr( $type ) ),
				esc_attr( $type )
			);

			$logging->setup(
				$title,
				'',
				0,
				0,
				$status
			);
		}

		return $result;
	}

	/**
	 * Update an existing object. Part of CRUD for WordPress objects
	 *
	 * @param string $name Object type name, E.g., user, post, comment.
	 * @param int    $id WordPress id of the object.
	 * @param array  $params Values of the fields to set for the object.
	 * @param array  $mapping_object is the object map connecting the records.
	 * @return array
	 *   data:
	 *     success: 1
	 *   "errors" : [ ],
	 *   from_cache:
	 *   cached:
	 *   is_redo:
	 */
	public function object_update( $name, $id, $params, $mapping_object = array() ) {

		$structure = $this->get_wordpress_table_structure( $name );
		$id_field  = $structure['id_field'];

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
				 *     add_filter( 'object_sync_for_salesforce_update_custom_wordpress_item', update_object, 10, 1 );
				 * The one param is:
				 *     array( 'id' => id, 'params' => array_of_params, 'name' => objecttype, 'id_field' => idfield )
				 */
				// Check to see if someone is calling the filter, and apply it if so.
				if ( ! has_filter( $this->option_prefix . 'update_custom_wordpress_item' ) ) {
					$result = $this->post_update( $id, $params, $id_field, $name );
				} else {
					$result = apply_filters(
						$this->option_prefix . 'update_custom_wordpress_item',
						array(
							'id'       => $id,
							'params'   => $params,
							'name'     => $name,
							'id_field' => $id_field,
						)
					);
				}
				break;
		} // End switch() method.

		if ( isset( $result['errors'] ) && ! empty( $result['errors'] ) ) {
			$status = 'error';
			if ( ! isset( $mapping_object['salesforce_id'] ) ) {
				$title = sprintf(
					// translators: 1) is log status, 2) is WordPress object type, 3) is WordPress id value.
					esc_html__( '%1$s: WordPress update for %2$s ID %3$s was unsuccessful with these errors:', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $name ),
					esc_attr( $id )
				);
			} else {
				$title = sprintf(
					// translators: 1) is log status, 2) is WordPress object type, 3) is WordPress id value, 4) is Salesforce ID value.
					esc_html__( '%1$s: WordPress update for %2$s ID %3$s from Salesforce record %4$s was unsuccessful with these errors:', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $name ),
					esc_attr( $id ),
					esc_attr( $mapping_object['salesforce_id'] )
				);
			}

			if ( isset( $this->logging ) ) {
				$logging = $this->logging;
			} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
				$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
			}

			$body  = '';
			$body .= '<h2>' . esc_html__( 'Errors from WordPress result:', 'object-sync-for-salesforce' ) . '</h2>';
			$body .= esc_html( print_r( $result['errors'], true ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
			if ( is_array( $params ) && ! empty( $params ) ) {
				$body .= '<h2>' . esc_html__( 'Parameters sent to WordPress:', 'object-sync-for-salesforce' ) . '</h2>';
				$body .= esc_html( print_r( $params, true ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
			}

			$error_log = array(
				'title'   => $title,
				'message' => $body,
				'trigger' => 0,
				'parent'  => '',
				'status'  => $status,
			);
			$logging->setup( $error_log );
		}

		return $result;
	}

	/**
	 * Delete a WordPress object.
	 *
	 * @param string $name Object type name, E.g., user, post, comment.
	 * @param int    $id WordPress id of the object.
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
		$id_field  = $structure['id_field'];

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
				 *     add_filter( 'object_sync_for_salesforce_delete_custom_wordpress_item', delete_object, 10, 1 );
				 * The one param is:
				 *     array( 'id' => id, 'name' => objecttype )
				 */
				// Check to see if someone is calling the filter, and apply it if so.
				if ( ! has_filter( $this->option_prefix . 'delete_custom_wordpress_item' ) ) {
					$success = $this->post_delete( $id );
				} else {
					$success = apply_filters(
						$this->option_prefix . 'delete_custom_wordpress_item',
						array(
							'id'   => $id,
							'name' => $name,
						)
					);
				}

				$success = $this->post_delete( $id );
				break;
		} // End switch() method.

		$result = array(
			'data'   => array(
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
		$username      = $params['user_email']['value'];
		$email_address = $params['user_email']['value'];
		if ( isset( $params['user_login']['value'] ) ) { // User_login is used by username_exists.
			$username = $params['user_login']['value'];
		} else {
			$params['user_login'] = array(
				'value'         => $username,
				'method_modify' => 'wp_insert_user',
				'method_read'   => 'get_user_by',
			);
		}

		// This is a new user.
		if ( false === username_exists( $username ) ) {

			// Create the user
			// WordPress sends a password reset link so this password doesn't get used, but it does exist in the database, which is helpful to prevent access before the user uses their password reset email.
			$params['user_pass'] = array(
				'value'         => wp_generate_password( 12, false ),
				'method_modify' => 'wp_insert_user',
				'method_read'   => 'get_user_by',
			);
			// Load all params with a method_modify of the object structure's content_method into $content.
			$content   = array();
			$structure = $this->get_wordpress_table_structure( 'user' );
			foreach ( $params as $key => $value ) {
				if ( in_array( $value['method_modify'], $structure['content_methods'], true ) ) {
					$content[ $key ] = $value['value'];
					unset( $params[ $key ] );
				}
			}

			$user_id = wp_insert_user( $content );

			if ( is_wp_error( $user_id ) ) {
				$success = false;
				$errors  = $user_id;
			} else {
				$meta_result = $this->create_wp_meta( $params, $user_id, 'user' );
				$success     = $meta_result['success'];
				$errors      = $meta_result['errors'];

				// Developers can use this hook to set any other user data - permissions, etc.
				do_action( $this->option_prefix . 'set_more_user_data', $user_id, $params, 'create' );

				// Send notification of new user.
				// todo: Figure out what permissions ought to get notifications for this and make sure it works the right way.
				wp_new_user_notification( $user_id, null, 'both' );

			}
		} else {
			$user_id = username_exists( $username );
		} // End if() statement.

		if ( is_wp_error( $user_id ) ) {
			$success = false;
			$errors  = $user_id;
		} else {
			$success = true;
			$errors  = array();
		}

		$result = array(
			'data'   => array(
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
	 * @param bool   $pull_to_drafts Whether to save to WordPress drafts when pulling from Salesforce.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function user_upsert( $key, $value, $methods, $params, $id_field = 'ID', $pull_to_drafts = false, $check_only = false ) {

		// If the key is user_email, we need to make it just email because that is how the WordPress method reads it.
		$method = isset( $methods['method_match'] ) ? $methods['method_match'] : '';
		if ( '' !== $method ) {
			// These methods should give us the user object if we are matching for one.
			// if we are trying to match to a meta field, the method is an object.
			if ( class_exists( $method ) ) {
				$args        = array(
					'meta_query' => array(
						array(
							'key'   => $key,
							'value' => $value,
						),
					),
				);
				$match_query = new $method( $args );
				$users       = $match_query->get_results();
				if ( ! empty( $users ) ) {
					$user = $users[0];
				}
			} else {
				$user = $method( str_replace( 'user_', '', $key ), $value );
			}

			if ( isset( $user ) && isset( $user->{$id_field} ) ) {
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
				);
				$result         = $this->user_create( $params );
				return $result;
			} else {
				// Check only is true but there's not a user yet.
				return null;
			} // End if() statement.
		} else {
			// There is no method by which to check the user. we can check other ways here.
			$params[ $key ] = array(
				'value'         => $value,
				'method_modify' => $methods['method_modify'],
				'method_read'   => $methods['method_read'],
			);

			// Allow username to be email address or username.
			// The username could be autogenerated before this point for the sake of URLs.
			if ( isset( $params['user_email']['value'] ) ) {
				$username      = $params['user_email']['value'];
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
		} // End if() statement.

		if ( isset( $user_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->user_update( $user_id, $params );
		} else {
			$result = array(
				'errors' => 'missing_id',
				'data'   => array(
					'type' => 'user',
				),
			);
		}
		return $result;
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
		$content              = array();
		$content[ $id_field ] = $user_id;
		foreach ( $params as $key => $value ) {

			// if the update value for email already exists on another user, don't fail this update; keep the user's email address.
			if ( 'user_email' === $key && email_exists( $value['value'] ) ) {
				unset( $params[ $key ] );
				continue;
			}

			// if the update value for login already exists on another user, don't fail this update; keep the user's login.
			if ( 'user_login' === $key && username_exists( $value['value'] ) ) {
				unset( $params[ $key ] );
				continue;
			}

			if ( 'wp_update_user' === $value['method_modify'] ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		$user_id = wp_update_user( $content );

		if ( is_wp_error( $user_id ) ) {
			$success = false;
			$errors  = $user_id;
		} else {
			$meta_result = $this->update_wp_meta( $params, $user_id, 'user' );
			$success     = $meta_result['success'];
			$errors      = $meta_result['errors'];
			// Developers can use this hook to set any other user data - permissions, etc.
			do_action( $this->option_prefix . 'set_more_user_data', $user_id, $params, 'update' );
		} // End if() statement.

		$result = array(
			'data'   => array(
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
		// According to https://developer.wordpress.org/reference/functions/wp_delete_user/ we have to include user.php first; otherwise it throws undefined error.
		require_once ABSPATH . 'wp-admin/includes/user.php';
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
	private function post_create( $params, $id_field = 'ID', $post_type = 'post' ) {
		// Load all params with a method_modify of the object structure's content_method into $content.
		$content   = array();
		$structure = $this->get_wordpress_table_structure( $post_type );
		foreach ( $params as $key => $value ) {
			if ( in_array( $value['method_modify'], $structure['content_methods'], true ) ) {
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
		// here we have to use $content because $params has already been unset.
		if ( ! isset( $content['post_title'] ) ) {
			$content['post_title'] = ' ';
		}
		if ( ! isset( $content['post_content'] ) ) {
			$content['post_content'] = ' ';
		}

		if ( 'tribe_events' === $content['post_type'] && function_exists( 'tribe_create_event' ) ) {
			// borrowing some code from https://github.com/tacjtg/rhp-tribe-events/blob/master/rhp-tribe-events.php.
			if ( isset( $params['_EventStartDate'] ) ) {
				$content = $this->append_tec_event_dates( $params['_EventStartDate']['value'], 'start', $content );
				unset( $params['_EventStartDate'] );
			}
			if ( isset( $params['_EventEndDate'] ) ) {
				$content = $this->append_tec_event_dates( $params['_EventEndDate']['value'], 'end', $content );
				unset( $params['_EventEndDate'] );
			}
			$post_id = tribe_create_event( $content );
		} else {
			$post_id = wp_insert_post( $content, true ); // return an error instead of a 0 id.
		}

		if ( is_wp_error( $post_id ) ) {
			$success = false;
			$errors  = $post_id;
		} else {
			// If it's a custom record type, fix the methods.
			if ( isset( $params['RecordTypeId']['value'] ) ) {
				$params['RecordTypeId']['method_modify'] = 'update_post_meta';
				$params['RecordTypeId']['method_read']   = 'get_post_meta';
			}
			$meta_result = $this->create_wp_meta( $params, $post_id, 'post' );
			$success     = $meta_result['success'];
			$errors      = $meta_result['errors'];
			// Developers can use this hook to set any other post data.
			do_action( $this->option_prefix . 'set_more_post_data', $post_id, $params, 'create' );
		} // End if() statement.

		if ( is_wp_error( $post_id ) ) {
			$success = false;
			$errors  = $post_id;
		} else {
			$success = true;
			$errors  = array();
		}

		$result = array(
			'data'   => array(
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
	 * @param bool   $pull_to_drafts Whether to save to WordPress drafts when pulling from Salesforce.
	 * @param string $post_type Optional string for custom post type, if applicable.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function post_upsert( $key, $value, $methods, $params, $id_field = 'ID', $pull_to_drafts = false, $post_type = 'post', $check_only = false ) {

		$method = isset( $methods['method_match'] ) ? $methods['method_match'] : '';
		if ( '' !== $method ) {
			// By default, posts use get_posts as the method. args can be like this.
			// The args don't really make sense, and are inconsistently documented.
			// These methods should give us the post object.
			$args = array();
			if ( 'post_title' === $key ) {
				$params['post_title'] = array(
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
				);
				$args['name']         = sanitize_title( $value );
			} else {
				$args[ $key ] = $value;
			}
			$args['post_type'] = $post_type;
			$post_statuses     = array( 'publish' );

			if ( true === filter_var( $pull_to_drafts, FILTER_VALIDATE_BOOLEAN ) ) {
				$post_statuses[] = 'draft';
			}
			$args['post_status'] = $post_statuses;

			// if we are trying to match to a meta field, the method is an object.
			if ( class_exists( $method ) ) {
				unset( $args[ $key ] );
				$args['meta_query'] = array(
					array(
						'key'   => $key,
						'value' => $value,
					),
				);
				$match_query        = new $method( $args );
				$posts              = $match_query->get_results();
			} else {
				$posts = $method( $args );
			}

			if ( isset( $posts ) && isset( $posts[0]->{$id_field} ) ) {
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
				);
				$result         = $this->post_create( $params, $id_field, $post_type );
				return $result;
			} else {
				// Check only is true but there's not a post yet.
				return null;
			} // End if() statement.
		} else {
			// There is no method by which to check the post. we can check other ways here.
			$params[ $key ] = array(
				'value'         => $value,
				'method_modify' => $methods['method_modify'],
				'method_read'   => $methods['method_read'],
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

		} // End if() statement.

		if ( isset( $post_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->post_update( $post_id, $params, $id_field, $post_type );
		} else {
			$result = array(
				'errors' => 'missing_id',
				'data'   => array(
					'type' => 'post',
				),
			);
		}
		return $result;
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
		$content              = array();
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

		$post_id = wp_update_post( $content, true ); // return an error instead of a 0 id.

		if ( is_wp_error( $post_id ) ) {
			$success = false;
			$errors  = $post_id;
		} else {
			// If it's a custom record type, fix the methods.
			if ( isset( $params['RecordTypeId']['value'] ) ) {
				$params['RecordTypeId']['method_modify'] = 'update_post_meta';
				$params['RecordTypeId']['method_read']   = 'get_post_meta';
			}
			$meta_result = $this->update_wp_meta( $params, $post_id, 'post' );
			$success     = $meta_result['success'];
			$errors      = $meta_result['errors'];
			// Developers can use this hook to set any other post data.
			do_action( $this->option_prefix . 'set_more_post_data', $post_id, $params, 'update' );
		} // End if() statement.

		$result = array(
			'data'   => array(
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
		// Load all params with a method_modify of the object structure's content_method into $content.
		$content   = array();
		$structure = $this->get_wordpress_table_structure( 'attachment' );
		// WP requires post_title, post_content (can be empty), post_status, and post_mime_type to create an attachment.
		foreach ( $params as $key => $value ) {
			if ( in_array( $value['method_modify'], $structure['content_methods'], true ) ) {
				$content[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}

		// Developers can use this hook to pass filename and parent data for the attachment.
		$params = apply_filters( $this->option_prefix . 'set_initial_attachment_data', $params );

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
			$errors  = $attachment_id;
		} else {
			$success = true;
			$errors  = array();

			if ( false !== $filename ) {
				// According to https://codex.wordpress.org/Function_Reference/wp_insert_attachment we need this file.
				require_once ABSPATH . 'wp-admin/includes/image.php';
				// Generate metadata for the attachment.
				$attach_data = wp_generate_attachment_metadata( $attachment_id, $filename );
				wp_update_attachment_metadata( $attachment_id, $attach_data );
			}

			if ( 0 !== $parent ) {
				set_post_thumbnail( $parent_post_id, $attachment_id );
			}

			// Developers can use this hook to set any other attachment data.
			do_action( $this->option_prefix . 'set_more_attachment_data', $attachment_id, $params, 'create' );

		}

		$result = array(
			'data'   => array(
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
	private function attachment_upsert( $key, $value, $methods, $params, $id_field = 'ID', $check_only = false ) {

		$method = isset( $methods['method_match'] ) ? $methods['method_match'] : '';
		if ( '' !== $method ) {
			// Get_posts is more helpful here, so that is the method attachment uses for 'read'.
			// By default, posts use get_posts as the method. args can be like this.
			// The args don't really make sense, and are inconsistently documented.
			// These methods should give us the post object.
			$args = array();
			if ( 'post_title' === $key ) {
				$params['post_title'] = array(
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
				);
				$args['name']         = sanitize_title( $value );
			} else {
				$args[ $key ] = $value;
			}
			$args['post_type'] = 'attachment';

			// if we are trying to match to a meta field, the method is an object.
			if ( class_exists( $method ) ) {
				unset( $args[ $key ] );
				$args['meta_query'] = array(
					array(
						'key'   => $key,
						'value' => $value,
					),
				);
				$match_query        = new $method( $args );
				$posts              = $match_query->get_results();
			} else {
				$posts = $method( $args );
			}

			if ( isset( $posts ) && isset( $posts[0]->{$id_field} ) ) {
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
				);
				$result         = $this->attachment_create( $params );
				return $result;
			} else {
				// Check only is true but there's not an attachment yet.
				return null;
			} // End if() statement.
		} else {
			// There is no method by which to check the post. we can check other ways here.
			$params[ $key ] = array(
				'value'         => $value,
				'method_modify' => $methods['method_modify'],
				'method_read'   => $methods['method_read'],
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

		} // End if() statement.

		if ( isset( $attachment_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->attachment_update( $attachment_id, $params );
		} else {
			$result = array(
				'errors' => 'missing_id',
				'data'   => array(
					'type' => 'attachment',
				),
			);
		}
		return $result;
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
		$content              = array();
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
			$errors  = $attachment_id;
		} else {
			$success = true;
			$errors  = array();

			if ( false !== $filename ) {
				// According to https://codex.wordpress.org/Function_Reference/wp_insert_attachment we need this file.
				require_once ABSPATH . 'wp-admin/includes/image.php';
				// Generate metadata for the attachment.
				$attach_data = wp_generate_attachment_metadata( $attachment_id, $filename );
			}

			// Put the data from salesforce into the meta array.
			$attach_new_data = array();
			foreach ( $params as $key => $value ) {
				$method                  = $value['method_modify'];
				$attach_new_data[ $key ] = $value['value'];
			}

			if ( isset( $attach_data ) ) {
				$attach_data = array_merge( $attach_data, $attach_new_data );
			} else {
				$attach_data = $attach_new_data;
			}

			$meta_updated = wp_update_attachment_metadata( $attachment_id, $attach_data );

			if ( false === $meta_updated ) {
				$success  = false;
				$errors[] = array(
					'key'   => $key,
					'value' => $value,
				);
			}

			if ( 0 !== $parent ) {
				set_post_thumbnail( $parent_post_id, $attachment_id );
			}

			// Developers can use this hook to set any other attachment data.
			do_action( $this->option_prefix . 'set_more_attachment_data', $attachment_id, $params, 'update' );

		} // End if() statement.

		$result = array(
			'data'   => array(
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
		// Load all params with a method_modify of the object structure's content_method into $content.
		$content   = array();
		$structure = $this->get_wordpress_table_structure( $taxonomy );
		$args      = array();
		foreach ( $params as $key => $value ) {
			if ( 'name' === $key ) {
				$name = $value['value'];
				unset( $params[ $key ] );
			}
			if ( in_array( $value['method_modify'], $structure['content_methods'], true ) && 'name' !== $key ) {
				$args[ $key ] = $value['value'];
				unset( $params[ $key ] );
			}
		}
		if ( isset( $name ) ) {
			$term = wp_insert_term( $name, $taxonomy, $args );
		}

		if ( is_wp_error( $term ) ) {
			$success = false;
			$errors  = $term;
		} else {
			$term_id     = $term[ "$id_field" ];
			$meta_result = $this->create_wp_meta( $params, $term_id, 'term' );
			$success     = $meta_result['success'];
			$errors      = $meta_result['errors'];
			// Developers can use this hook to set any other term data.
			do_action( $this->option_prefix . 'set_more_term_data', $term_id, $params, 'create' );
		} // End if() statement.

		if ( is_wp_error( $term ) ) {
			$success = false;
			$errors  = $term;
		} else {
			$success = true;
			$errors  = array();
		}

		$result = array(
			'data'   => array(
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
	 * @param bool   $pull_to_drafts Whether to save to WordPress drafts when pulling from Salesforce.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function term_upsert( $key, $value, $methods, $params, $taxonomy, $id_field = 'ID', $pull_to_drafts = false, $check_only = false ) {
		if ( 'tag' === $taxonomy ) {
			$taxonomy = 'post_tag';
		}
		$method = isset( $methods['method_match'] ) ? $methods['method_match'] : '';
		if ( '' !== $method ) {
			// These methods should give us the term object if we are matching for one.
			// If we are trying to match to a meta field, the method is an object.
			if ( class_exists( $method ) ) {
				$args        = array(
					'taxonomy'   => $taxonomy,
					'meta_key'   => $key,
					'meta_value' => $value,
				);
				$match_query = new $method( $args );
				$terms       = $match_query->get_terms();
				if ( ! empty( $terms ) ) {
					$term = $terms[0];
				}
			} else {
				$term = $method( $key, $value, $taxonomy ); // We need to put the taxonomy in there probably.
			}

			if ( isset( $term ) && isset( $term->{$id_field} ) ) {
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
				);
				$result         = $this->term_create( $params, $taxonomy, $id_field );
				return $result;
			} else {
				// Check only is true but there's not a term yet.
				return null;
			} // End if() statement.
		} else {
			// There is no method by which to check the term. we can check other ways here.
			$params[ $key ] = array(
				'value'         => $value,
				'method_modify' => $methods['method_modify'],
				'method_read'   => $methods['method_read'],
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
		} // End if() statement.

		if ( isset( $term_id ) ) {
			foreach ( $params as $key => $value ) {
				$params[ $key ]['method_modify'] = $methods['method_update'];
			}
			$result = $this->term_update( $term_id, $params, $taxonomy, $id_field );
		} else {
			$result = array(
				'errors' => 'missing_id',
				'data'   => array(
					'type' => 'term',
				),
			);
		}
		return $result;
	}

	/**
	 * Update a WordPress term.
	 *
	 * @param int    $term_id The ID for the term to be updated. This value needs to be in the array that is sent to wp_update_term.
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
			$errors  = $term;
		} else {
			$term_id     = $term[ "$id_field" ];
			$meta_result = $this->update_wp_meta( $params, $term_id, 'term' );
			$success     = $meta_result['success'];
			$errors      = $meta_result['errors'];
			// Developers can use this hook to set any other term data.
			do_action( $this->option_prefix . 'set_more_term_data', $term_id, $params, 'update' );
		} // End if() statement.

		if ( is_wp_error( $term ) ) {
			$success = false;
			$errors  = $term;
		} else {
			$success = true;
			$errors  = array();
		}

		$result = array(
			'data'   => array(
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
	 * @param int    $term_id The ID for the term to be updated. This value needs to be in the array that is sent to wp_update_term.
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
		// Load all params with a method_modify of the object structure's content_method into $content.
		$content   = array();
		$structure = $this->get_wordpress_table_structure( 'comment' );
		foreach ( $params as $key => $value ) {
			if ( in_array( $value['method_modify'], $structure['content_methods'], true ) ) {
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

		$comment_id = wp_new_comment( $content );

		if ( is_wp_error( $comment_id ) ) {
			$success = false;
			$errors  = $comment_id;
		} else {
			$meta_result = $this->create_wp_meta( $params, $comment_id, 'comment' );
			$success     = $meta_result['success'];
			$errors      = $meta_result['errors'];
			// Developers can use this hook to set any other comment data.
			do_action( $this->option_prefix . 'set_more_comment_data', $comment_id, $params, 'create' );
		} // End if() statement.

		if ( is_wp_error( $comment_id ) ) {
			$success = false;
			$errors  = $comment_id;
		} else {
			$success = true;
			$errors  = array();
		}

		$result = array(
			'data'   => array(
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
	 * @param bool   $pull_to_drafts Whether to save to WordPress drafts when pulling from Salesforce.
	 * @param bool   $check_only Allows this method to only check for matching records, instead of making any data changes.
	 *
	 * @return array
	 *   data:
	 *     ID : 123,
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function comment_upsert( $key, $value, $methods, $params, $id_field = 'comment_ID', $pull_to_drafts = false, $check_only = false ) {
		$method = isset( $methods['method_match'] ) ? $methods['method_match'] : '';
		if ( 'get_comment' === $method ) {
			$method = 'get_comments';
		}
		if ( '' !== $method ) {

			// These methods should give us the comment object if we are matching for one.
			// If we are trying to match to a meta field, the method is an object.
			if ( class_exists( $method ) ) {
				$args        = array(
					'meta_query' => array(
						array(
							'key'   => $key,
							'value' => $value,
						),
					),
				);
				$match_query = new $method( $args );
				$comments    = $match_query->get_comments();
				if ( ! empty( $comments ) ) {
					$comment = $users[0];
				}
			} else {
				$match = array();
				if ( 'comment_author' === $key ) {
					$match['author__in'] = array( $value );
				} else {
					$key           = str_replace( 'comment_', '', $key );
					$match[ $key ] = $value;
				}
				$comments = $method( $match );
			}

			if ( 1 === count( $comments ) && isset( $comments ) && isset( $comments[0]->{$id_field} ) ) {
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
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
						// translators: %1$s is the log status. %2$s is a number. %3$s is a key. %4$s is the value of that key. %5$s is a var_export'd array of comments.
						esc_html__( '%1$s: Comments: there are %2$s comment matches for the Salesforce key %3$s with the value of %4$s. Here they are: %5$s', 'object-sync-for-salesforce' ),
						ucfirst( esc_attr( $status ) ),
						absint( count( $comments ) ),
						esc_html( $key ),
						esc_html( $value ),
						esc_html( var_export( $comments ) ) // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export
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
					'value'         => $value,
					'method_modify' => $method,
					'method_read'   => $methods['method_read'],
				);
				$result         = $this->comment_create( $params, $id_field );
				return $result;
			} else {
				// Check only is true but there's not a comment yet.
				return null;
			} // End if() statement.
		} else {
			// There is no method by which to check the comment. We can check other ways here.
			$params[ $key ] = array(
				'value'         => $value,
				'method_modify' => $methods['method_modify'],
				'method_read'   => $methods['method_read'],
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

			$existing_id = comment_exists( $comment_author, $comment_date, $timezone ); // Returns an id if there is a result. Uses $wpdb->get_var, so it returns null if there is no value.

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
		} else {
			$result = array(
				'errors' => 'missing_id',
				'data'   => array(
					'type' => 'comment',
				),
			);
		}
		return $result;
	}

	/**
	 * Update a WordPress comment.
	 *
	 * @param int    $comment_id The ID for the comment to be updated. This value needs to be in the array that is sent to wp_update_comment.
	 * @param array  $params Array of comment data params.
	 * @param string $id_field Optional string of what the ID field is, if it is ever not ID.
	 *
	 * @return array
	 *   data:
	 *     success: 1
	 *   "errors" : [ ],
	 */
	private function comment_update( $comment_id, $params, $id_field = 'comment_ID' ) {
		$content              = array();
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
			$errors  = $updated;
		} else {
			$meta_result = $this->update_wp_meta( $params, $comment_id, 'comment' );
			$success     = $meta_result['success'];
			$errors      = $meta_result['errors'];
			// Developers can use this hook to set any other comment data.
			do_action( $this->option_prefix . 'set_more_comment_data', $comment_id, $params, 'update' );
		} // End if() statement.

		if ( is_wp_error( $updated ) ) {
			$success = false;
			$errors  = $updated;
		} else {
			$success = true;
			$errors  = array();
		}

		$result = array(
			'data'   => array(
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

	/**
	 * Standard method for creating meta values
	 * This works for users, posts, terms, and comments. It does not work for attachments.
	 *
	 * @param array        $params the values to be saved.
	 * @param int|wp_error $parent_object_id the WordPress object ID that this metadata is associated with. It shouldn't ever end up here as an error, but it's worth documenting.
	 * @param string       $parent_object_type the WordPress object type.
	 *
	 * @return array $meta_result contains the success flag and the array of errors
	 */
	private function create_wp_meta( $params, $parent_object_id, $parent_object_type ) {
		$success = true;
		$errors  = array();
		if ( ! is_wp_error( $parent_object_id ) && is_array( $params ) && ! empty( $params ) ) {
			foreach ( $params as $key => $value ) {

				// if the value is empty, skip it.
				if ( '' === $value['value'] ) {
					continue;
				}

				$modify = $value['method_modify'];
				// Todo: we could provide a way for passing the values in a custom order here.
				$meta_id = $modify( $parent_object_id, $key, $value['value'] );
				if ( false === $meta_id ) {
					$success  = false;
					$errors[] = array(
						'message' => sprintf(
							// translators: 1) is the WordPress object type, 2) is the method that should be used to save the value.
							esc_html__( 'Tried to add %1$s meta with method %2$s.', 'object-sync-for-salesforce' ),
							esc_attr( $parent_object_type ),
							esc_html( $method )
						),
						'key'     => $key,
						'value'   => $value,
					);
				}
			} // End foreach.
		}
		$meta_result = array(
			'success' => $success,
			'errors'  => $errors,
		);
		return $meta_result;
	}

	/**
	 * Standard method for updating meta values
	 * This works for users, posts, terms, and comments. It does not work for attachments.
	 *
	 * @param array        $params the values to be saved.
	 * @param int|wp_error $parent_object_id the WordPress object ID that this metadata is associated with. It shouldn't ever end up here as an error, but it's worth documenting.
	 * @param string       $parent_object_type the WordPress object type.
	 *
	 * @return array $meta_result contains the success flag, the changed flag, and the array of errors
	 */
	private function update_wp_meta( $params, $parent_object_id, $parent_object_type ) {
		$success = true;
		$changed = false;
		$errors  = array();
		if ( ! is_wp_error( $parent_object_id ) && is_array( $params ) && ! empty( $params ) ) {
			$changed = true;
			foreach ( $params as $key => $value ) {
				$modify = $value['method_modify'];

				// if the value is empty, use the delete method to modify it.
				if ( '' === $value['value'] ) {
					$modify = isset( $value['method_delete'] ) ? $value['method_delete'] : $value['method_modify'];
				}

				$read = $value['method_read'];
				// todo: we could provide a way for passing the values in a custom order here.
				$meta_id = $modify( $parent_object_id, $key, $value['value'] );
				if ( false === $meta_id ) {
					$changed = false;
					// Check and make sure the stored value matches $value['value'], otherwise it's an error.
					// In some cases, such as picklists, WordPress is dealing with an array that came from Salesforce at this point, so we need to serialize the value before assuming it's an error.

					if ( is_array( $value['value'] ) ) {
						$new_value = maybe_serialize( $value['value'] );
					} else {
						$new_value = (string) $value['value'];
					}

					if ( is_array( $read( $parent_object_id, $key, true ) ) ) {
						$stored_value = maybe_serialize( $read( $parent_object_id, $key, true ) );
					} else {
						$stored_value = (string) $read( $parent_object_id, $key, true );
					}

					if ( $stored_value !== $new_value ) {
						$errors[] = array(
							'message' => sprintf(
								// Translators: 1) is the WordPress object type, 2) is the key of the meta field, 3) is the method that should be used to update the value, 4) is the already stored value, 5) is the new value the plugin tried to save.
								esc_html__( 'Unable to update %1$s meta key %2$s with method %3$s. The stored value is %4$s and the new value should be %5$s.', 'object-sync-for-salesforce' ),
								esc_attr( $parent_object_type ),
								esc_attr( $key ),
								esc_attr( $modify ),
								wp_kses_post( $stored_value ),
								wp_kses_post( $new_value )
							),
						);
					}
				}
			} // End foreach.
		}
		$meta_result = array(
			'success' => $success,
			'changed' => $changed,
			'errors'  => $errors,
		);
		return $meta_result;
	}

	/**
	 * Generate date formats for The Event Calendar plugin
	 *
	 * @param string $date the string value of the date from Salesforce.
	 * @param string $type this should be start or end.
	 * @param array  $content the other mapped params.
	 *
	 * @return array $content
	 */
	private function append_tec_event_dates( $date, $type, $content ) {
		if ( ( 'start' === $type || 'end' === $type ) && class_exists( 'Tribe__Date_Utils' ) ) {
			$dates                                      = array();
			$date_type                                  = ucfirst( $type );
			$timestamp                                  = strtotime( $date );
			$dates[ 'Event' . $date_type . 'Date' ]     = $timestamp;
			$dates[ 'Event' . $date_type . 'Hour' ]     = gmdate( Tribe__Date_Utils::HOURFORMAT, $timestamp );
			$dates[ 'Event' . $date_type . 'Minute' ]   = gmdate( Tribe__Date_Utils::MINUTEFORMAT, $timestamp );
			$dates[ 'Event' . $date_type . 'Meridian' ] = gmdate( Tribe__Date_Utils::MERIDIANFORMAT, $timestamp );
			$content                                    = $content + $dates;
		}
		return $content;
	}

}
