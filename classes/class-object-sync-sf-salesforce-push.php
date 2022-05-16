<?php
/**
 * Push data from WordPress into Salesforce
 *
 * @class   Object_Sync_Sf_Salesforce_Push
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Salesforce_Push class.
 */
class Object_Sync_Sf_Salesforce_Push {

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
	 * Login credentials for the Salesforce API; comes from wp-config or from the plugin settings
	 *
	 * @var array
	 */
	public $login_credentials;

	/**
	 * Array of what classes in the plugin can be scheduled to occur with `wp_cron` events
	 *
	 * @var array
	 */
	public $schedulable_classes;

	/**
	 * Object_Sync_Sf_Queue class
	 *
	 * @var object
	 */
	public $queue;

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
	 * Object_Sync_Sf_WordPress class
	 *
	 * @var object
	 */
	public $wordpress;

	/**
	 * Object_Sync_Sf_Salesforce class
	 * This contains Salesforce API methods
	 *
	 * @var array
	 */
	public $salesforce;

	/**
	 * Object_Sync_Sf_Sync_Transients class
	 *
	 * @var object
	 */
	public $sync_transients;

	/**
	 * Whether the plugin is in debug mode
	 *
	 * @var bool
	 */
	public $debug;

	/**
	 * The name of the ActionScheduler queue
	 *
	 * @var string
	 */
	public $schedule_name;

	/**
	 * Constructor for push class
	 */
	public function __construct() {
		$this->version             = object_sync_for_salesforce()->version;
		$this->file                = object_sync_for_salesforce()->file;
		$this->wpdb                = object_sync_for_salesforce()->wpdb;
		$this->slug                = object_sync_for_salesforce()->slug;
		$this->option_prefix       = object_sync_for_salesforce()->option_prefix;
		$this->login_credentials   = object_sync_for_salesforce()->login_credentials;
		$this->schedulable_classes = object_sync_for_salesforce()->schedulable_classes;

		$this->queue      = object_sync_for_salesforce()->queue;
		$this->logging    = object_sync_for_salesforce()->logging;
		$this->mappings   = object_sync_for_salesforce()->mappings;
		$this->wordpress  = object_sync_for_salesforce()->wordpress;
		$this->salesforce = object_sync_for_salesforce()->salesforce;

		$this->sync_transients = new Object_Sync_Sf_Sync_Transients();

		$this->schedule_name = 'salesforce_push';

		// Create action hooks for WordPress objects. We run this after plugins are loaded in case something depends on another plugin.
		add_action( 'plugins_loaded', array( $this, 'add_actions' ) );

		// use the option value for whether we're in debug mode.
		$this->debug = filter_var( get_option( $this->option_prefix . 'debug_mode', false ), FILTER_VALIDATE_BOOLEAN );

	}

	/**
	 * Create the action hooks based on what object maps exist from the admin settings.
	 * We do not have any actions for blogroll at this time.
	 */
	public function add_actions() {
		$db_version = get_option( $this->option_prefix . 'db_version', false );
		if ( $db_version === $this->version ) {
			foreach ( $this->mappings->get_fieldmaps( null, $this->mappings->active_fieldmap_conditions ) as $mapping ) {
				$object_type = $mapping['wordpress_object'];
				if ( 'user' === $object_type ) {
					if ( defined( 'ultimatemember_plugin_name' ) ) {
						add_action( 'um_user_register', array( $this, 'um_add_user' ), 11, 2 );
					} else {
						add_action( 'user_register', array( $this, 'add_user' ), 11, 1 );
					}
					add_action( 'profile_update', array( $this, 'edit_user' ), 11, 2 );
					add_action( 'delete_user', array( $this, 'delete_user' ) );
				} elseif ( 'post' === $object_type ) {
					add_action( 'save_post', array( $this, 'post_actions' ), 11, 2 );
					if ( class_exists( 'ACF' ) ) {
						// front end forms on ACF use this hook.
						add_action( 'acf/save_post', array( $this, 'acf_save' ), 10 );
					}
				} elseif ( 'attachment' === $object_type ) {
					add_action( 'add_attachment', array( $this, 'add_attachment' ) );
					add_action( 'edit_attachment', array( $this, 'edit_attachment' ) );
					add_action( 'delete_attachment', array( $this, 'delete_attachment' ) );
				} elseif ( 'category' === $object_type || 'tag' === $object_type || 'post_tag' === $object_type ) {
					add_action( 'create_term', array( $this, 'add_term' ), 11, 3 );
					add_action( 'edit_terms', array( $this, 'edit_term' ), 11, 2 );
					add_action( 'delete_term', array( $this, 'delete_term' ), 10, 4 );
				} elseif ( 'comment' === $object_type ) {
					add_action( 'comment_post', array( $this, 'add_comment' ), 11, 3 );
					add_action( 'edit_comment', array( $this, 'edit_comment' ) );
					add_action( 'delete_comment', array( $this, 'delete_comment' ) ); // to be clear: this only runs when the comment gets deleted from the trash, either manually or automatically.
				} else { // this is for custom post types
					// we still have to use save_post because save_post_type fails to pull in the metadata.
					add_action( 'save_post', array( $this, 'post_actions' ), 11, 2 );
					if ( class_exists( 'ACF' ) ) {
						// front end forms on ACF use this hook.
						add_action( 'acf/save_post', array( $this, 'acf_save' ), 10 );
					}
				}
			}
		}

		// hook that action-scheduler can call.
		add_action( $this->option_prefix . 'push_record', array( $this, 'salesforce_push_sync_rest' ), 10, 4 );

	}

	/**
	 * Method for ajax hooks to call for pushing manually
	 *
	 * @param string $object_type the WordPress object type.
	 * @param int    $wordpress_id the WordPress record ID.
	 * @param string $http_method the HTTP method that was called.
	 */
	public function manual_push( $object_type, $wordpress_id, $http_method ) {
		$object = $this->wordpress->get_wordpress_object_data( $object_type, $wordpress_id );
		// run the WordPress trigger that corresponds to the HTTP method.
		switch ( $http_method ) {
			case 'POST':
				$trigger = $this->mappings->sync_wordpress_create;
				break;
			case 'PUT':
				$trigger = $this->mappings->sync_wordpress_update;
				break;
			case 'DELETE':
				$trigger = $this->mappings->sync_wordpress_delete;
				break;
		}
		if ( isset( $trigger ) ) {
			$results = $this->salesforce_push_object_crud( $object_type, $object, $trigger, true );
			foreach ( $results as $result ) {
				if ( isset( $result['status'] ) && 'success' === $result['status'] ) {
					if ( 'POST' === $http_method || 'PUT' === $http_method ) {
						$code = '201';
					} elseif ( 'DELETE' === $http_method ) {
						$code = '204';
					}
				} else {
					$code = '405';
				}
			}
		} else {
			$code   = '405';
			$result = '';
		}
		$result = array(
			'code'   => $code,
			'result' => $results,
		);
		return $result;
	}

	/**
	 * Callback method for adding a user
	 *
	 * @param string $user_id the WordPress user ID.
	 */
	public function add_user( $user_id ) {
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id );
		$this->object_insert( $user, 'user' );
	}

	/**
	 * Callback method for adding a user via the Ultimate Member plugin
	 *
	 * @param string $user_id the WordPress user ID.
	 * @param array  $form_data the data that was sent to create the user.
	 */
	public function um_add_user( $user_id, $form_data = array() ) {
		// in at least some cases, the form data array does not have the ID field, and this can cause errors.
		// if we don't have the ID field value in the form data, add it so it acts like the others.
		$structure               = $this->wordpress->get_wordpress_table_structure( 'user' );
		$wordpress_id_field_name = $structure['id_field'];
		if ( ! isset( $form_data[ $wordpress_id_field_name ] ) ) {
			$form_data[ $wordpress_id_field_name ] = $user_id;
		}
		$this->object_insert( $form_data, 'user' );
	}

	/**
	 * Callback method for editing a user
	 *
	 * @param string $user_id the WordPress user ID.
	 * @param object $old_user_data the previously used user data.
	 */
	public function edit_user( $user_id, $old_user_data ) {
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id );
		$this->object_update( $user, 'user' );
	}

	/**
	 * Callback method for deleting a user
	 *
	 * @param string $user_id the WordPress user ID.
	 */
	public function delete_user( $user_id ) {
		// flag that this item has been deleted.
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id, true );
		$this->object_delete( $user, 'user' );
	}

	/**
	 * Callback method for saving a post with ACF. If it's a front end save, send the data to post_actions.
	 *
	 * @param int $post_id the ID of the post.
	 */
	public function acf_save( $post_id ) {
		if ( is_admin() ) {
			return;
		}
		$post = get_post( $post_id );
		if ( null !== $post ) {
			$this->post_actions( $post_id, $post );
		}
	}

	/**
	 * Callback method for posts of any type
	 * This can handle create, update, and delete actions
	 *
	 * @param string        $post_id the WordPress post ID.
	 * @param WP_Post|array $post the WordPress post object. For our purposes, it's never an array.
	 */
	public function post_actions( $post_id, $post ) {

		// if this runs on a non-object due to another operation, don't continue.
		if ( ! is_object( $post ) ) {
			return;
		}

		$post_type = $post->post_type;

		if ( isset( $post->post_status ) && 'auto-draft' === $post->post_status ) {
			return;
		}
		// this plugin does not sync log, revision, or scheduled-action posts with Salesforce since they're all included in this plugin for other purposes.
		if ( isset( $post->post_type ) && in_array( $post->post_type, array( 'wp_log', 'revision', 'scheduled-action' ), true ) ) {
			return;
		}
		if ( $post->post_modified_gmt === $post->post_date_gmt && 'trash' !== $post->post_status ) {
			$update = 0;
			$delete = 0;
		} elseif ( 'trash' !== $post->post_status ) {
			$update = 1;
			$delete = 0;
		} elseif ( 'trash' === $post->post_status ) {
			$update = 0;
			$delete = 1;
		}

		// add support for Woocommerce if it is installed.
		if ( defined( 'WC_VERSION' ) ) {
			// statuses to ignore.
			if ( isset( $post->post_status ) && in_array( $post->post_status, array( 'wc-pending' ), true ) ) {
				return;
			}
			// statuses to count as new. note that the api will also check to see if it already has been mapped before saving.
			if ( isset( $post->post_status ) && in_array( $post->post_status, array( 'wc-on-hold', 'wc-processing' ), true ) ) {
				$update = 0;
				$delete = 0;
			}
		}

		// if it is NOT a deletion, don't flag it as such.
		if ( 1 !== $delete ) {
			$post = $this->wordpress->get_wordpress_object_data( $post->post_type, $post_id );
		} else {
			// otherwise, flag that this item has been deleted.
			$post = $this->wordpress->get_wordpress_object_data( $post->post_type, $post_id, true );
		}
		if ( 1 === $update ) {
			$this->object_update( $post, $post_type );
		} elseif ( 1 === $delete ) {
			$this->object_delete( $post, $post_type );
		} else {
			$this->object_insert( $post, $post_type );
		}
	}

	/**
	 * Callback method for adding an attachment
	 *
	 * @param string $post_id the WordPress attachment ID.
	 */
	public function add_attachment( $post_id ) {
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id );
		$this->object_insert( $attachment, 'attachment' );
	}

	/**
	 * Callback method for editing an attachment
	 *
	 * @param string $post_id the WordPress attachment ID.
	 */
	public function edit_attachment( $post_id ) {
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id );
		$this->object_update( $attachment, 'attachment' );
	}

	/**
	 * Callback method for deleting an attachment
	 *
	 * @param string $post_id the WordPress attachment ID.
	 */
	public function delete_attachment( $post_id ) {
		// flag that this item has been deleted.
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id, true );
		$this->object_delete( $attachment, 'attachment' );
	}

	/**
	 * Callback method for adding a term
	 *
	 * @param string $term_id the term ID.
	 * @param string $tt_id the taxonomy ID.
	 * @param string $taxonomy the taxonomy name.
	 */
	public function add_term( $term_id, $tt_id, $taxonomy ) {
		$term = $this->wordpress->get_wordpress_object_data( $taxonomy, $term_id );
		$this->object_insert( $term, $taxonomy );
	}

	/**
	 * Callback method for editing a term
	 *
	 * @param string $term_id the term ID.
	 * @param string $taxonomy the taxonomy name.
	 */
	public function edit_term( $term_id, $taxonomy ) {
		$term = $this->wordpress->get_wordpress_object_data( $taxonomy, $term_id );
		$this->object_update( $term, $taxonomy );
	}

	/**
	 * Callback method for deleting a term
	 *
	 * @param int    $term (id).
	 * @param int    $tt_id the term taxonomy ID.
	 * @param string $taxonomy (slug).
	 * @param object $deleted_term the deleted term object.
	 */
	public function delete_term( $term, $tt_id, $taxonomy, $deleted_term ) {
		$deleted_term = (array) $deleted_term;
		$type         = $deleted_term['taxonomy'];
		$this->object_delete( $deleted_term, $type );
	}

	/**
	 * Callback method for adding a comment
	 *
	 * @param string $comment_id the WordPress comment ID.
	 * @param string $comment_approved if the comment was approved.
	 * @param array  $commentdata the data for the comment.
	 */
	public function add_comment( $comment_id, $comment_approved, $commentdata = array() ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_insert( $comment, 'comment' );
	}

	/**
	 * Callback method for editing a comment
	 *
	 * @param string $comment_id the WordPress comment ID.
	 */
	public function edit_comment( $comment_id ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_update( $comment, 'comment' );
	}

	/**
	 * Callback method for deleting a comment
	 *
	 * @param string $comment_id the WordPress comment ID.
	 */
	public function delete_comment( $comment_id ) {
		// flag that this item has been deleted.
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id, true );
		$this->object_delete( $comment, 'comment' );
	}

	/**
	 * Insert a new object
	 * This calls the overall push crud method, which controls queuing and sending data to the Salesforce class.
	 *
	 * @param array  $object the object data to send to WordPress.
	 * @param string $type the WordPress object type.
	 */
	private function object_insert( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_create );
	}

	/**
	 * Update an existing object
	 * This calls the overall push crud method, which controls queuing and sending data to the Salesforce class.
	 *
	 * @param array  $object the object data to send to WordPress.
	 * @param string $type the WordPress object type.
	 */
	private function object_update( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_update );
	}

	/**
	 * Delete an existing object
	 * This calls the overall push crud method, which controls queuing and sending data to the Salesforce class.
	 *
	 * @param array  $object the object data to send to WordPress.
	 * @param string $type the WordPress object type.
	 */
	private function object_delete( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_delete );
	}

	/**
	 * Push objects to Salesforce.
	 * This method decides whether to do the processing immediately or queue it to the schedule class (or skip it based on another plugin's activity)
	 *
	 * @param string $object_type Type of WordPress object.
	 * @param array  $object The WordPress data that needs to be sent to Salesforce.
	 * @param int    $sf_sync_trigger The trigger being responded to.
	 * @param bool   $manual check if we are calling this manually.
	 */
	private function salesforce_push_object_crud( $object_type, $object, $sf_sync_trigger, $manual = false ) {

		$structure               = $this->wordpress->get_wordpress_table_structure( $object_type );
		$wordpress_id_field_name = $structure['id_field'];

		$transients_to_delete = array();

		// load mappings that match this criteria
		// in this case, it's all mappings that correspond to the posted WordPress object.
		$sf_mappings = $this->mappings->get_fieldmaps(
			null, // id field must be null for multiples.
			array_merge(
				$this->mappings->active_fieldmap_conditions,
				array(
					'wordpress_object' => $object_type,
				)
			),
		);

		$results = array();

		foreach ( $sf_mappings as $fieldmap_key => $mapping ) { // for each mapping of this object.

			$transients_to_delete[ $fieldmap_key ] = array(
				'fieldmap'   => $mapping,
				'transients' => array(),
			);

			// there is a WordPress object to push.
			if ( isset( $object[ $wordpress_id_field_name ] ) ) {
				// todo: we might want to loop through these?
				$mapping_object = $this->mappings->load_all_by_wordpress( $object_type, $object[ $wordpress_id_field_name ] );
				if ( ! empty( $mapping_object ) ) {
					$mapping_object = $mapping_object[0];
				}

				// there is already a mapping object for this WordPress object.
				if ( isset( $mapping_object['id'] ) ) {
					// if there's already a transient for pulling this Salesforce record, its ID will be stored in the transient.
					$mapping_object_id_transient = $mapping_object['salesforce_id'];
					$transient_is_pulling        = (int) $this->sync_transients->get( 'salesforce_pulling_' . $mapping_object_id_transient, '', $mapping['id'] );
				} else {
					// there is not a mapping object for this WordPress object id yet
					// check for an existing transient for pulling this Salesforce record. If it exists, the Salesforce ID will be stored in the transient.
					$mapping_object_id_transient = $this->sync_transients->get( 'salesforce_pulling_object_id', '', $mapping['id'] );
					$transient_is_pulling        = (int) $this->sync_transients->get( 'salesforce_pulling_' . $mapping_object_id_transient, '', $mapping['id'] );
				}

				// if there is a valid transient value, we're currently pulling this record and not pushing it.
				if ( 1 === $transient_is_pulling ) {
					$salesforce_pulling = 1;
				} else {
					$salesforce_pulling = 0;
				}

				if ( 1 === $salesforce_pulling ) {
					// if it is pulling, delete the transient and continue on through the loop.
					// we need to either do this for every individual mapping object, or only do it when all the mapping objects are done.
					$transients_to_delete[ $fieldmap_key ]['transients'][] = $mapping_object_id_transient;
					if ( true === $this->debug ) {
						// create log entry for failed pull.
						$status = 'debug';
						$title  = sprintf(
							// translators: placeholders are: 1) the log status, 2) the mapping object ID transient.
							esc_html__( '%1$s: mapping object transient ID %2$s is currently pulling, so we do not push it.', 'object-sync-for-salesforce' ),
							ucfirst( esc_attr( $status ) ),
							$mapping_object_id_transient
						);
						$debug = array(
							'title'   => $title,
							'message' => '',
							'trigger' => $sf_sync_trigger,
							'parent'  => '',
							'status'  => $status,
						);
						$this->logging->setup( $debug );
					}

					continue;
				}
			} else {
				// if we don't have a WordPress object id, we've got no business doing stuff in Salesforce.
				$status = 'error';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status, 2) the name of the WordPress id field.
					esc_html__( '%1$s: Salesforce Push: unable to process queue item because it has no WordPress %2$s.', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $wordpress_id_field_name )
				);
				$result = array(
					'title'   => $title,
					'message' => print_r( $object, true ), // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
					'trigger' => $sf_sync_trigger,
					'parent'  => 0, // parent id goes here but we don't have one, so make it 0.
					'status'  => $status,
				);
				$this->logging->setup( $result );
				return $result;
			} // End if() statement.

			$map_sync_triggers = $mapping['sync_triggers'];

			$push_allowed = $this->is_push_allowed( $object_type, $object, $sf_sync_trigger, $mapping, $map_sync_triggers );

			if ( false === $push_allowed ) {

				// we need to get the WordPress id here so we can check to see if the object already has a map.
				$structure               = $this->wordpress->get_wordpress_table_structure( $object_type );
				$wordpress_id_field_name = $structure['id_field'];

				// this returns the WordPress rows that map to the individual Salesfoce row
				// we don't need to loop through these because we're just generating an error log for push not allowed.
				$mapping_object = $this->mappings->load_all_by_wordpress( $object_type, $object[ $wordpress_id_field_name ] );
				if ( ! empty( $mapping_object ) ) {
					$mapping_object = $mapping_object[0];
				}

				// hook to allow other plugins to define or alter the mapping object.
				$mapping_object = apply_filters( $this->option_prefix . 'push_mapping_object', $mapping_object, $object, $mapping );

				// are these objects already connected in WordPress?
				if ( isset( $mapping_object['id'] ) ) {
					$is_new = false;
				} else {
					$is_new = true;
				}

				$status = 'error';
				// create log entry for not allowed push.
				$op = '';
				switch ( $sf_sync_trigger ) {
					case $this->mappings->sync_wordpress_create:
						if ( true === $is_new ) {
							$op = 'Create';
						}
						break;
					case $this->mappings->sync_wordpress_update:
						if ( false === $is_new ) {
							$op = 'Update';
						}
						break;
					case $this->mappings->sync_wordpress_delete:
						if ( false === $is_new ) {
							$op = 'Delete';
						}
						break;
				}
				$log_status = 'notice';
				$title      = sprintf(
					// translators: placeholders are: 1) the log status, capitalized, 2) the name of the current operation, 3) the name of the WordPress object type, 4) the name of the WordPress ID field, 5) the value of the object's ID in WordPress, 6) the name of the Salesforce object.
					esc_html__( '%1$s: %2$s Salesforce %3$s with WordPress %4$s with %5$s of %6$s was not allowed by this fieldmap.', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $log_status ) ),
					esc_attr( $op ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ $wordpress_id_field_name ] ),
					esc_attr( $mapping['salesforce_object'] )
				);
				$result = array(
					'title'   => $title,
					'message' => '',
					'trigger' => $sf_sync_trigger,
					'parent'  => esc_attr( $object[ $wordpress_id_field_name ] ),
					'status'  => $log_status,
				);
				if ( '' !== $op ) {
					$this->logging->setup( $result );
				}
				$results[] = $result;
				continue;
			}

			// push drafts if the setting says so
			// post status is draft, or post status is inherit and post type is not attachment.
			if ( ( ! isset( $mapping['push_drafts'] ) || '1' !== $mapping['push_drafts'] ) && isset( $object['post_status'] ) && ( 'draft' === $object['post_status'] || ( 'inherit' === $object['post_status'] && 'attachment' !== $object['post_type'] ) ) ) {
				// skip this object if it is a draft and the fieldmap settings told us to ignore it.
				continue;
			}

			if ( isset( $mapping['push_async'] ) && ( '1' === $mapping['push_async'] ) && false === $manual ) {
				// this item is async and we want to save it to the queue.

				// if we determine that the below code does not perform well, worst case scenario is we could save $data to a custom table, and pass the id to the callback method.
				/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
				$data = array(
					'object_type'     => $object_type,
					'object'          => $object,
					'mapping'         => $mapping['id'],
					'sf_sync_trigger' => $sf_sync_trigger,
				);*/

				// add a queue action to push data to Salesforce
				// this means we don't need the frequency for this method anymore, I think.
				$this->queue->add(
					$this->schedulable_classes[ $this->schedule_name ]['callback'],
					array(
						'object_type'     => $object_type,
						'object'          => filter_var( $object[ $wordpress_id_field_name ], FILTER_VALIDATE_INT ),
						'mapping'         => filter_var( $mapping['id'], FILTER_VALIDATE_INT ),
						'sf_sync_trigger' => $sf_sync_trigger,
					),
					$this->schedule_name
				);

				$log_status = 'success';
				$title      = sprintf(
					// translators: placeholders are: 1) the log status, 2) the name of the WordPress object type, 3) the name of the WordPress ID field, 4) the value of the object's ID in WordPress, 5) the name of the Salesforce object.
					esc_html__( '%1$s: Add to queue: Push WordPress %2$s with %3$s of %4$s to Salesforce %5$s.', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $log_status ) ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ $wordpress_id_field_name ] ),
					esc_attr( $mapping['salesforce_object'] )
				);

				$result    = array(
					'title'   => $title,
					'message' => '',
					'trigger' => $sf_sync_trigger,
					'parent'  => esc_attr( $object[ $wordpress_id_field_name ] ),
					'status'  => $log_status,
				);
				$results[] = $result;
			} else {
				// this one is not async. do it immediately.
				$push      = $this->salesforce_push_sync_rest( $object_type, $object, $mapping, $sf_sync_trigger );
				$results[] = $push;
			} // End if() statement.
		} // End foreach() on fieldmaps.

		// delete transients that we've already processed for this WordPress object.
		foreach ( $transients_to_delete as $key => $value ) {
			$fieldmap_id = $value['fieldmap']['id'];
			$transients  = $value['transients'];
			foreach ( $transients as $transient_end ) {
				$this->sync_transients->delete( 'salesforce_pulling_' . $transient_end, '', $fieldmap_id );
			}
			$pulling_id = $this->sync_transients->get( 'salesforce_pulling_object_id', '', $fieldmap_id );
			if ( in_array( $pulling_id, $transients, true ) ) {
				$this->sync_transients->delete( 'salesforce_pulling_object_id', '', $fieldmap_id );
			}
		}

		return $results;
	}

	/**
	 * Sync WordPress objects and Salesforce objects using the REST API.
	 *
	 * @param string    $object_type Type of WordPress object.
	 * @param array|int $object The WordPress object data or its ID value.
	 * @param array     $mapping Salesforce field mapping data array or ID.
	 * @param int       $sf_sync_trigger Trigger for this sync.
	 * @return true or exit the method
	 */
	public function salesforce_push_sync_rest( $object_type, $object, $mapping, $sf_sync_trigger ) {

		// when using async, this task receives the WordPress object id value as an integer. otherwise, it receives the WordPress object data as an array.
		if ( is_int( $object ) ) {
			$wordpress_id = $object;
			// if this is NOT a deletion, try to get all of the object's data.
			if ( $sf_sync_trigger !== $this->mappings->sync_wordpress_delete ) {
				$object = $this->wordpress->get_wordpress_object_data( $object_type, $wordpress_id );
			} else {
				// otherwise, flag it as a delete and limit what we try to get.
				$object = $this->wordpress->get_wordpress_object_data( $object_type, $wordpress_id, true );
			}
		}

		if ( is_int( $mapping ) ) {
			$mapping_id = $mapping;
			$mapping    = $this->mappings->get_fieldmaps( $mapping_id );
		}

		// If Salesforce is not authorized, don't do anything.
		// it's unclear to me if we need to do something else here or if this is sufficient. This is all Drupal does.
		if ( true !== $this->salesforce['is_authorized'] ) {
			return;
		}

		$sfapi = $this->salesforce['sfapi'];

		// we need to get the WordPress id here so we can check to see if the object already has a map.
		$structure               = $this->wordpress->get_wordpress_table_structure( $object_type );
		$wordpress_id_field_name = $structure['id_field'];

		// check to make sure we have a value for the WordPress ID.
		if ( ! isset( $object[ $wordpress_id_field_name ] ) ) {
			// create log entry for missing WordPress ID.
			$status = 'error';
			$title  = sprintf(
				// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object, 4) the name of the WordPress object type, 5) the WordPress id field name.
				esc_html__( '%1$s: %2$s Salesforce %3$s. The WordPress %4$s %5$s is missing. It may have been deleted.', 'object-sync-for-salesforce' ),
				ucfirst( esc_attr( $status ) ),
				esc_attr( $op ),
				esc_attr( $mapping['salesforce_object'] ),
				esc_attr( $mapping['wordpress_object'] ),
				esc_attr( $wordpress_id_field_name )
			);
			$result = array(
				'title'   => $title,
				'message' => print_r( $object, true ), // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
				'trigger' => $sf_sync_trigger,
				'parent'  => 0,
				'status'  => $status,
			);
			$this->logging->setup( $result );
		}

		// this returns the row that maps the individual WordPress row to the individual Salesfoce row
		// todo: we might need to loop through these?
		$mapping_object = $this->mappings->load_all_by_wordpress( $object_type, $object[ $wordpress_id_field_name ] );
		if ( ! empty( $mapping_object ) ) {
			$mapping_object = $mapping_object[0];
		}

		// hook to allow other plugins to define or alter the mapping object.
		$mapping_object = apply_filters( $this->option_prefix . 'push_mapping_object', $mapping_object, $object, $mapping );

		// we already have the data from WordPress at this point; we just need to work with it in Salesforce.
		$synced_object = array(
			'wordpress_object' => $object,
			'mapping_object'   => $mapping_object,
			'queue_item'       => false,
			'mapping'          => $mapping,
		);

		$op     = '';
		$result = '';

		// deleting mapped objects.
		if ( $sf_sync_trigger === $this->mappings->sync_wordpress_delete ) {
			if ( isset( $mapping_object['id'] ) ) {
				$op = 'Delete';

				$mapping_objects = $this->mappings->load_object_maps_by_salesforce_id( $mapping_object['salesforce_id'], $mapping );

				// only delete if there are no additional mapping objects for this record.
				if ( 1 === count( $mapping_objects ) ) {

					$frequencies = $this->queue->get_frequencies();
					$seconds     = reset( $frequencies )['frequency'] + 60;

					// right here we should set the pushing transient.
					$this->sync_transients->set( 'salesforce_pushing_' . $mapping_object['salesforce_id'], '', $mapping['id'], 1, $seconds );
					$this->sync_transients->set( 'salesforce_pushing_object_id', '', $mapping['id'], $mapping_object['salesforce_id'] );

					try {
						$api_result = $sfapi->object_delete( $mapping['salesforce_object'], $mapping_object['salesforce_id'] );
					} catch ( Object_Sync_Sf_Exception $e ) {
						$status = 'error';
						// create log entry for failed delete.
						$title = sprintf(
							// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object, 4) the Salesforce Id value, 5) the name of the WordPress object type, 6) the WordPress id field name, 7) the WordPress object id value.
							esc_html__( '%1$s: %2$s Salesforce %3$s %4$s (WordPress %5$s with %6$s of %7$s)', 'object-sync-for-salesforce' ),
							ucfirst( esc_attr( $status ) ),
							esc_attr( $op ),
							esc_attr( $mapping['salesforce_object'] ),
							esc_attr( $mapping_object['salesforce_id'] ),
							esc_attr( $mapping['wordpress_object'] ),
							esc_attr( $wordpress_id_field_name ),
							esc_attr( $object[ "$wordpress_id_field_name" ] )
						);
						$result = array(
							'title'   => $title,
							'message' => $e->getMessage(),
							'trigger' => $sf_sync_trigger,
							'parent'  => $object[ "$wordpress_id_field_name" ],
							'status'  => $status,
						);
						$this->logging->setup( $result );

						// hook for push fail.
						do_action( $this->option_prefix . 'push_fail', $op, $sfapi->response, $synced_object, $wordpress_id_field_name );

					}

					if ( ! isset( $e ) ) {
						// create log entry for successful delete if the result had no errors.
						$status = 'success';
						$title  = sprintf(
							// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object, 4) the Salesforce Id value, 5) the name of the WordPress object type, 6) the WordPress id field name, 7) the WordPress object id value.
							esc_html__( '%1$s: %2$s Salesforce %3$s %4$s (WordPress %5$s with %6$s of %7$s)', 'object-sync-for-salesforce' ),
							ucfirst( esc_attr( $status ) ),
							esc_attr( $op ),
							esc_attr( $mapping['salesforce_object'] ),
							esc_attr( $mapping_object['salesforce_id'] ),
							esc_attr( $mapping['wordpress_object'] ),
							esc_attr( $wordpress_id_field_name ),
							esc_attr( $object[ "$wordpress_id_field_name" ] )
						);
						$result = array(
							'title'   => $title,
							'message' => '',
							'trigger' => $sf_sync_trigger,
							'parent'  => $object[ "$wordpress_id_field_name" ],
							'status'  => $status,
						);
						$this->logging->setup( $result );

						// hook for push success.
						do_action( $this->option_prefix . 'push_success', $op, $sfapi->response, $synced_object, $mapping_object['salesforce_id'], $wordpress_id_field_name );
					}
				} else {
					$more_ids = '<p>' . esc_html__( 'The Salesforce record was not deleted because there are multiple WordPress IDs that match this Salesforce ID. They are:', 'object-sync-for-salesforce' ) . '</p>';

					$more_ids .= '<ul>';
					foreach ( $mapping_objects as $match ) {
						$more_ids .= '<li>' . $match['wordpress_id'] . '</li>';
					}
					$more_ids .= '</ul>';

					$more_ids .= '<p>' . esc_html__( 'The map row between this WordPress object and the Salesforce object, as stored in the WordPress database, will be deleted, and this WordPress object has been deleted, but Salesforce will remain untouched.', 'object-sync-for-salesforce' ) . '</p>';

					$status = 'notice';
					$title  = sprintf(
						// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object, 4) the Salesforce Id value, 5) the name of the WordPress object type, 6) the WordPress id field name, 7) the WordPress object id value.
						esc_html__( '%1$s: %2$s on Salesforce %3$s with Id of %4$s was stopped because there are other Salesforce records mapped to WordPress %5$s with %6$s of %7$s', 'object-sync-for-salesforce' ),
						ucfirst( esc_attr( $status ) ),
						esc_attr( $op ),
						esc_attr( $mapping['salesforce_object'] ),
						esc_attr( $mapping_object['salesforce_id'] ),
						esc_attr( $mapping['wordpress_object'] ),
						esc_attr( $wordpress_id_field_name ),
						esc_attr( $object[ "$wordpress_id_field_name" ] )
					);
					$result = array(
						'title'   => $title,
						'message' => $more_ids,
						'trigger' => $sf_sync_trigger,
						'parent'  => $object[ "$wordpress_id_field_name" ],
						'status'  => $status,
					);
					$this->logging->setup( $result );

				} // End if() statement.

				// right here we should change the pushing_object_id transient to the Salesforce Id value.
				if ( isset( $api_result['code'] ) && (int) 204 === $api_result['code'] ) {
					$this->sync_transients->set( 'salesforce_pushing_' . $mapping_object['salesforce_id'], '', $mapping['id'], 1 );
					$this->sync_transients->set( 'salesforce_pushing_object_id', '', $mapping['id'], $mapping_object['salesforce_id'] );
				}

				// delete the map row from WordPress after the Salesforce row has been deleted
				// we delete the map row even if the Salesforce delete failed, because the WordPress object is gone.
				$this->mappings->delete_object_map( $mapping_object['id'] );

			} // End if(). there is no map row

			return $result;
		} // End if() statement.

		// are these objects already connected in WordPress?
		if ( isset( $mapping_object['id'] ) ) {
			$is_new = false;
		} else {
			$is_new = true;
		}

		// map the WordPress values to Salesforce fields.
		$params = $this->mappings->map_params( $mapping, $object, $sf_sync_trigger, false, $is_new, $wordpress_id_field_name );

		// hook to allow other plugins to modify the $params array
		// use hook to map fields between the WordPress and Salesforce objects
		// returns $params.
		$params = apply_filters( $this->option_prefix . 'push_params_modify', $params, $mapping, $object, $sf_sync_trigger, false, $is_new );

		// if we don't get any params, there are no fields that should be sent to Salesforce.
		if ( empty( $params ) ) {

			// if the parameters array is empty at this point, we should create a log entry to that effect.
			// I think it should be a debug message, unless we learn from users that it should be raised to an error.
			if ( true === $this->debug ) {
				$status = 'debug';
				$title  = sprintf(
					// translators: %1$s is the log status.
					esc_html__( '%1$s Mapping: according to the current plugin settings, there are no parameters in the current dataset that can be pushed to Salesforce.', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) )
				);
				$body = sprintf(
					// translators: placeholders are: 1) the fieldmap row ID, 2) the name of the WordPress object, 3) the name of the Salesforce object.
					'<p>' . esc_html__( 'There is a fieldmap with ID of %1$s and it maps the WordPress %2$s object to the Salesforce %3$s object.', 'object-sync-for-salesforce' ) . '</p>',
					absint( $mapping['id'] ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $mapping['salesforce_object'] )
				);
				// whether it's a new mapping object or not.
				if ( false === $is_new ) {
					// this one is not new.
					$body .= sprintf(
						// translators: placeholders are: 1) the mapping object row ID, 2) the name of the WordPress object, 3) the ID of the WordPress object, 4) the ID of the Salesforce object it was trying to map.
						'<p>' . esc_html__( 'There is an existing object map with ID of %1$s and it is mapped to the WordPress %2$s with ID of %3$s and the Salesforce object with ID of %4$s.', 'object-sync-for-salesforce' ) . '</p>',
						absint( $mapping_object['id'] ),
						esc_attr( $mapping_object['wordpress_object'] ),
						esc_attr( $mapping_object['wordpress_id'] ),
						esc_attr( $mapping_object['salesforce_id'] )
					);
				} else {
					// this one is new.
					$body .= sprintf(
						// translators: placeholders are: 1) the name of the WordPress object, 2) the ID of the WordPress object, 3) the Salesforce object type.
						'<p>' . esc_html__( 'The plugin was trying to push the WordPress %1$s with ID of %2$s to the Salesforce %3$s object type.', 'object-sync-for-salesforce' ) . '</p>',
						esc_attr( $mapping['wordpress_object'] ),
						esc_attr( $object[ $wordpress_id_field_name ] ),
						esc_attr( $mapping['salesforce_object'] )
					);
				}
				$body .= sprintf(
					// translators: placeholders are 1) the object's data that was attempted.
					'<p>' . esc_html__( 'The WordPress object data that was attempted: %1$s', 'object-sync-for-salesforce' ) . '</p>',
					print_r( $object, true ) // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
				);
				$this->logging->setup(
					$title,
					$body,
					$sf_sync_trigger,
					0,
					$status
				);
			} // end debug mode check.

			return;
		} // end if params are empty.

		// if there is a prematch WordPress field - ie email - on the fieldmap object.
		if ( isset( $params['prematch'] ) && is_array( $params['prematch'] ) ) {
			$prematch_field_wordpress  = $params['prematch']['wordpress_field'];
			$prematch_field_salesforce = $params['prematch']['salesforce_field'];
			$prematch_value            = $params['prematch']['value'];
			unset( $params['prematch'] );
		}

		// if there is an external key field in Salesforce - ie mailchimp user id - on the fieldmap object.
		if ( isset( $params['key'] ) && is_array( $params['key'] ) ) {
			$key_field_wordpress  = $params['key']['wordpress_field'];
			$key_field_salesforce = $params['key']['salesforce_field'];
			$key_value            = $params['key']['value'];
			unset( $params['key'] );
		}

		$frequencies  = $this->queue->get_frequencies();
		$seconds      = reset( $frequencies )['frequency'] + 60;
		$saved_params = filter_var( get_option( $this->option_prefix . 'missing_required_data_id_' . $object[ $wordpress_id_field_name ], false ), FILTER_VALIDATE_BOOLEAN );

		// start the is_new stuff.
		if ( true === $is_new || true === $saved_params ) {
			if ( true === $saved_params ) {
				delete_option( $this->option_prefix . 'missing_required_data_id_' . $object[ $wordpress_id_field_name ] );
			}
			// right here we should set the pushing transient
			// this means we have to create the mapping object here as well, and update it with the correct IDs after successful response
			// create the mapping object between the rows.
			$temporary_map_id  = $this->mappings->generate_temporary_id( 'push' );
			$mapping_object_id = $this->create_object_map( $object, $wordpress_id_field_name, $temporary_map_id, $mapping, true );
			$this->sync_transients->set( 'salesforce_pushing_' . $temporary_map_id, '', $mapping['id'], 1, $seconds );
			$this->sync_transients->set( 'salesforce_pushing_object_id', '', $mapping['id'], $temporary_map_id );
			$mapping_object  = array();
			$mapping_objects = $this->mappings->get_all_object_maps(
				array(
					'id' => $mapping_object_id,
				)
			);
			if ( isset( $mapping_objects[0] ) && is_array( $mapping_objects[0] ) ) {
				$mapping_object = $mapping_objects[0];
			}

			// setup SF record type. CampaignMember objects get their Campaign's type
			// i am still a bit confused about this.
			if ( $mapping['salesforce_record_type_default'] !== $this->mappings->salesforce_default_record_type && empty( $params['RecordTypeId'] ) && ( 'CampaignMember' !== $mapping['salesforce_object'] ) ) {
				$params['RecordTypeId'] = $mapping['salesforce_record_type_default'];
			}

			try {

				// hook to allow other plugins to modify the $salesforce_id string here
				// use hook to change the object that is being matched to developer's own criteria
				// ex: match a Salesforce Contact based on a connected email address object
				// returns a $salesforce_id.
				// it should keep NULL if there is no match
				// the function that calls this hook needs to check the mapping to make sure the WordPress object is the right type.
				$salesforce_id = apply_filters( $this->option_prefix . 'find_sf_object_match', null, $object, $mapping, 'push' );

				// hook to allow other plugins to do something right before Salesforce data is saved
				// ex: run WordPress methods on an object if it exists, or do something in preparation for it if it doesn't.
				do_action( $this->option_prefix . 'pre_push', $salesforce_id, $mapping, $object, $wordpress_id_field_name, $params );

				// hook to allow other plugins to change params on update actions only
				// use hook to map fields between the WordPress and Salesforce objects
				// returns $params.
				$params = apply_filters( $this->option_prefix . 'push_update_params_modify', $params, $salesforce_id, $mapping, $object, $mapping['wordpress_object'] );

				if ( isset( $prematch_field_wordpress ) || isset( $key_field_wordpress ) || null !== $salesforce_id ) {

					// if either prematch criteria exists, make the values queryable.

					if ( isset( $prematch_field_wordpress ) ) {
						// a prematch has been specified, attempt an upsert().
						// prematch values with punctuation need to be escaped.
						$encoded_prematch_value = rawurlencode( $prematch_value );
						// for at least 'email' fields, periods also need to be escaped:
						// see https://developer.salesforce.com/forums?id=906F000000099xPIAQ.
						$encoded_prematch_value = str_replace( '.', '%2E', $encoded_prematch_value );
					}

					if ( isset( $key_field_wordpress ) ) {
						// an external key has been specified, attempt an upsert().
						// external key values with punctuation need to be escaped.
						$encoded_key_value = rawurlencode( $key_value );
						// for at least 'email' fields, periods also need to be escaped:
						// see https://developer.salesforce.com/forums?id=906F000000099xPIAQ.
						$encoded_key_value = str_replace( '.', '%2E', $encoded_key_value );
					}

					if ( isset( $prematch_field_wordpress ) ) {
						$upsert_key   = $prematch_field_salesforce;
						$upsert_value = $encoded_prematch_value;
					} elseif ( isset( $key_field_wordpress ) ) {
						$upsert_key   = $key_field_salesforce;
						$upsert_value = $encoded_key_value;
					}

					if ( null !== $salesforce_id ) {
						$upsert_key   = 'Id';
						$upsert_value = $salesforce_id;
					}

					$op = 'Upsert';

					$api_result = $sfapi->object_upsert( $mapping['salesforce_object'], $upsert_key, $upsert_value, $params );

					// Handle upsert responses.
					switch ( $sfapi->response['code'] ) {
						// On Upsert:update retrieved object.
						case '204':
							$sf_object       = $sfapi->object_readby_external_id(
								$mapping['salesforce_object'],
								$upsert_key,
								$upsert_value,
								array(
									'cache' => false,
								)
							);
							$salesforce_data = $sf_object['data'];
							break;
						// Handle duplicate records.
						case '300':
							$api_result['data']['errorCode'] = $sfapi->response['error'] . ' (' . $upsert_key . ':' . $upsert_value . ')';
							break;
					}
				} else {
					// No key or prematch field exists on this field map object, create a new object in Salesforce.
					$op         = 'Create';
					$api_result = $sfapi->object_create( $mapping['salesforce_object'], $params );
				} // End if() statement.
			} catch ( Object_Sync_Sf_Exception $e ) {
				// create log entry for failed create or upsert.
				$status = 'error';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object, 4) the Salesforce Id value if there is one, 5) the name of the WordPress object type, 6) the WordPress id field name, 7) the WordPress object id value.
					esc_html__( '%1$s: %2$s Salesforce %3$s %4$s (WordPress %5$s with %6$s of %7$s)', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $op ),
					esc_attr( $mapping['salesforce_object'] ),
					isset( $salesforce_id ) ? ' ' . esc_attr( $salesforce_id ) : '',
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ "$wordpress_id_field_name" ] )
				);
				$result = array(
					'title'   => $title,
					'message' => $e->getMessage(),
					'trigger' => $sf_sync_trigger,
					'parent'  => $object[ "$wordpress_id_field_name" ],
					'status'  => $status,
				);
				$this->logging->setup( $result );

				// hook for push fail.
				do_action( $this->option_prefix . 'push_fail', $op, $sfapi->response, $synced_object );

				return;
			} // End try() method.

			// Salesforce api call was successful
			// this means the object has already been created/updated in Salesforce
			// this is not redundant because this is where it creates the object mapping rows in WordPress if the object does not already have one (we are still inside $is_new === TRUE here).

			if ( empty( $api_result['data']['errorCode'] ) ) {

				if ( ! isset( $salesforce_data ) ) {
					// if we didn't set $salesforce_data already, set it now.
					$sf_object       = $sfapi->object_read(
						$mapping['salesforce_object'],
						$api_result['data']['id'],
						array(
							'cache' => false,
						)
					);
					$salesforce_data = $sf_object['data'];
				}

				$salesforce_id = $salesforce_data['Id'];
				$status        = 'success';
				$title         = sprintf(
					// translators: placeholders are: 1) the log status ,2) what operation is happening, 3) the name of the Salesforce object, 4) the Salesforce Id value, 5) the name of the WordPress object type, 6) the WordPress id field name, 7) the WordPress object id value.
					esc_html__( '%1$s: %2$s Salesforce %3$s %4$s (WordPress %5$s with %6$s of %7$s)', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $op ),
					esc_attr( $mapping['salesforce_object'] ),
					esc_attr( $salesforce_id ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ "$wordpress_id_field_name" ] )
				);
				$result = array(
					'title'   => $title,
					'message' => '',
					'trigger' => $sf_sync_trigger,
					'parent'  => $object[ "$wordpress_id_field_name" ],
					'status'  => $status,
				);
				$this->logging->setup( $result );

				// right here we should change the pushing transient to the LastModifiedDate for the Salesforce object.
				if ( isset( $salesforce_data['LastModifiedDate'] ) ) {
					$this->sync_transients->set( 'salesforce_pushing_' . $salesforce_id, '', $mapping['id'], strtotime( $salesforce_data['LastModifiedDate'] ) );
					$this->sync_transients->set( 'salesforce_pushing_object_id', '', $mapping['id'], $salesforce_id );
				}

				// update that mapping object.
				$mapping_object['salesforce_id']     = $salesforce_id;
				$mapping_object['last_sync_message'] = esc_html__( 'Mapping object updated via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__;
				$mapping_object_updated              = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

				// save the mapping object to the synced object.
				$synced_object['mapping_object'] = $mapping_object;

				// hook for push success.
				do_action( $this->option_prefix . 'push_success', $op, $sfapi->response, $synced_object, $salesforce_id, $wordpress_id_field_name );
			} else {

				// create log entry for failed create or upsert
				// this is part of the drupal module but I am failing to understand when it would ever fire, since the catch should catch the errors
				// if we see this in the log entries, we can understand what it does, but probably not until then.
				$status = 'error';
				$title  = sprintf(
					// translators: placeholders are: 1) error code the Salesforce API returned, 2) what operation is happening, 3) the name of the WordPress object type, 4) the WordPress id field name, 5) the WordPress object id value.
					esc_html__( '%1$s error syncing: %2$s to Salesforce (WordPress %3$s with %4$s of %5$s)', 'object-sync-for-salesforce' ),
					esc_attr( $api_result['data']['errorCode'] ),
					esc_attr( $op ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ "$wordpress_id_field_name" ] )
				);
				$body = sprintf(
					// translators: placeholders are 1) the name of the Salesforce object type, 2) the error message returned from the Salesforce APIs, 3) the parameters that were attempted.
					'<p>' . esc_html__( 'Object: %1$s', 'object-sync-for-salesforce' ) . '</p><p>' . esc_html__( 'Message: %2$s', 'object-sync-for-salesforce' ) . '</p><p>' . esc_html__( 'Params: %3$s', 'object-sync-for-salesforce' ) . '</p>',
					esc_attr( $mapping['salesforce_object'] ),
					esc_html( $api_result['data']['message'] ),
					print_r( $params, true ) // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
				);
				if ( isset( $upsert_key ) && isset( $upsert_value ) ) {
					$body .= sprintf(
						// translators: placeholders are 1) the upsert key attempted, 2) the upsert value attempted.
						'<p>' . esc_html__( 'Upsert key: %1$s', 'object-sync-for-salesforce' ) . '</p><p>' . esc_html__( 'Upsert value: %2$s', 'object-sync-for-salesforce' ) . '</p>',
						esc_attr( $upsert_key ),
						esc_attr( $upsert_value )
					);
				}
				$result = array(
					'title'   => $title,
					'message' => $body,
					'trigger' => $sf_sync_trigger,
					'parent'  => $object[ "$wordpress_id_field_name" ],
					'status'  => $status,
				);
				$this->logging->setup( $result );

				// hook for push fail.
				do_action( $this->option_prefix . 'push_fail', $op, $sfapi->response, $synced_object );

				return $result;
			} // End if() statement.
		} else {
			// $is_new is false here; we are updating an already mapped object

			// right here we should set the pushing transient.
			$this->sync_transients->set( 'salesforce_pushing_' . $mapping_object['salesforce_id'], '', $mapping['id'], 1, $seconds );
			$this->sync_transients->set( 'salesforce_pushing_object_id', '', $mapping['id'], $mapping_object['salesforce_id'] );

			// there is an existing object link
			// if the last sync is greater than the last time this object was updated, skip it
			// this keeps us from doing redundant syncs.
			$mapping_object['object_updated'] = current_time( 'mysql' );
			if ( $mapping_object['last_sync'] > $mapping_object['object_updated'] ) {
				$status = 'notice';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the WordPress object type, 4) the WordPress id field name, 5) the WordPress object id value, 6) the Salesforce Id value.
					esc_html__( '%1$s: %2$s: Did not sync WordPress %3$s with %4$s of %5$s with Salesforce Id %6$s because the last sync timestamp was greater than the object updated timestamp.', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $op ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ "$wordpress_id_field_name" ] ),
					esc_attr( $mapping_object['salesforce_id'] )
				);
				$body = sprintf(
					// translators: placeholders are 1) when a sync on this mapping last occured, 2) when the object was last updated.
					'<p>' . esc_html__( 'Last sync time: %1$s', 'object-sync-for-salesforce' ) . '</p><p>' . esc_html__( 'Object updated time: %2$s', 'object-sync-for-salesforce' ) . '</p>',
					esc_attr( $mapping_object['last_sync'] ),
					esc_html( $mapping_object['object_updated'] )
				);
				$result = array(
					'title'   => $title,
					'message' => $body,
					'trigger' => $sf_sync_trigger,
					'parent'  => 0, // parent id goes here but we don't have one, so make it 0.
					'status'  => $status,
				);
				$this->logging->setup( $result );
				return $result;
			}

			// try to make a Salesforce update call.
			try {

				// hook to allow other plugins to do something right before Salesforce data is saved
				// ex: run WordPress methods on an object if it exists, or do something in preparation for it if it doesn't.
				do_action( $this->option_prefix . 'pre_push', $mapping_object['salesforce_id'], $mapping, $object, $wordpress_id_field_name, $params );

				// hook to allow other plugins to change params on update actions only
				// use hook to map fields between the WordPress and Salesforce objects
				// returns $params.
				$params = apply_filters( $this->option_prefix . 'push_update_params_modify', $params, $mapping_object['salesforce_id'], $mapping, $object, $mapping['wordpress_object'] );

				$op         = 'Update';
				$api_result = $sfapi->object_update( $mapping['salesforce_object'], $mapping_object['salesforce_id'], $params );

				$mapping_object['last_sync_status']  = $this->mappings->status_success;
				$mapping_object['last_sync_message'] = esc_html__( 'Mapping object updated via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__;

				$status = 'success';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object, 4) the Salesforce Id value, 5) the name of the WordPress object type, 6) the WordPress id field name, 7) the WordPress object id value.
					esc_html__( '%1$s: %2$s Salesforce %3$s %4$s (WordPress %5$s with %6$s of %7$s)', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $op ),
					esc_attr( $mapping['salesforce_object'] ),
					esc_attr( $mapping_object['salesforce_id'] ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ "$wordpress_id_field_name" ] )
				);
				$result = array(
					'title'   => $title,
					'message' => '',
					'trigger' => $sf_sync_trigger,
					'parent'  => 0, // parent id goes here but we don't have one, so make it 0.
					'status'  => $status,
				);
				$this->logging->setup( $result );

				// hook for push success.
				do_action( $this->option_prefix . 'push_success', $op, $sfapi->response, $synced_object, $mapping_object['salesforce_id'], $wordpress_id_field_name );

			} catch ( Object_Sync_Sf_Exception $e ) {
				// create log entry for failed update.
				$status = 'error';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object, 4) the Salesforce Id value, 5) the name of the WordPress object type, 6) the WordPress id field name, 7) the WordPress object id value.
					esc_html__( '%1$s: %2$s Salesforce %3$s %4$s (WordPress %5$s with %6$s of %7$s)', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $op ),
					esc_attr( $mapping['salesforce_object'] ),
					esc_attr( $mapping_object['salesforce_id'] ),
					esc_attr( $mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					esc_attr( $object[ "$wordpress_id_field_name" ] )
				);
				$result = array(
					'title'   => $title,
					'message' => $e->getMessage(),
					'trigger' => $sf_sync_trigger,
					'parent'  => $object[ "$wordpress_id_field_name" ],
					'status'  => $status,
				);
				$this->logging->setup( $result );

				$mapping_object['last_sync_status']  = $this->mappings->status_error;
				$mapping_object['last_sync_message'] = $e->getMessage();

				// hook for push fail.
				do_action( $this->option_prefix . 'push_fail', $op, $sfapi->response, $synced_object );

			} // End try() method.

			if ( ! isset( $salesforce_data ) ) {
				// if we didn't set $salesforce_data already, set it now.
				$sf_object       = $sfapi->object_read(
					$mapping['salesforce_object'],
					$mapping_object['salesforce_id'],
					array(
						'cache' => false,
					)
				);
				$salesforce_data = $sf_object['data'];
			}

			// right here we should change the pushing transient to the LastModifiedDate for the Salesforce object.
			if ( isset( $salesforce_data['LastModifiedDate'] ) ) {
				$this->sync_transients->set( 'salesforce_pushing_' . $mapping_object['salesforce_id'], '', $mapping['id'], strtotime( $salesforce_data['LastModifiedDate'] ) );
				$this->sync_transients->set( 'salesforce_pushing_object_id', '', $mapping['id'], $mapping_object['salesforce_id'] );
			}

			// tell the mapping object - whether it is new or already existed - how we just used it.
			$mapping_object['last_sync_action'] = 'push';
			$mapping_object['last_sync']        = current_time( 'mysql' );

			// update that mapping object.
			$map_result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

		} // End if(). this is the end of the if is_new stuff

		return $result;

	}

	/**
	 * Create an object map between a WordPress object and a Salesforce object
	 *
	 * @param array  $wordpress_object Array of the WordPress object's data.
	 * @param string $id_field_name How this object names its primary field. ie Id or comment_id or whatever.
	 * @param string $salesforce_id Unique identifier for the Salesforce object.
	 * @param array  $field_mapping The row that maps the object types together, including which fields match which other fields.
	 * @param bool   $pending check if it is a pending action or the full object map has already been created.
	 * @return int   $wpdb->insert_id This is the database row for the map object.
	 */
	private function create_object_map( $wordpress_object, $id_field_name, $salesforce_id, $field_mapping, $pending = false ) {

		if ( true === $pending ) {
			$action = 'pending';
		} else {
			$action = 'created';
		}

		// Create object map and save it. Only do this if we have a valid WordPress ID.
		if ( isset( $wordpress_object[ $id_field_name ] ) ) {
			$mapping_object = $this->mappings->create_object_map(
				array(
					'wordpress_id'      => $wordpress_object[ $id_field_name ], // WordPress unique id.
					'salesforce_id'     => $salesforce_id, // Salesforce unique id. we don't care what kind of object it is at this point.
					'wordpress_object'  => $field_mapping['wordpress_object'], // keep track of what kind of wp object this is.
					'last_sync'         => current_time( 'mysql' ),
					'last_sync_action'  => 'push',
					'last_sync_status'  => $this->mappings->status_success,
					'last_sync_message' => sprintf(
						// translators: placeholder is for the action that occurred on the mapping object (pending or created).
						esc_html__( 'Mapping object %1$s via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__,
						esc_attr( $action )
					),
					'action'            => $action,
				)
			);
			return $mapping_object;
		}
	}

	/**
	 * Find out if push is allowed for this record
	 *
	 * @param string $object_type WordPress object type.
	 * @param array  $object Array of the WordPress object's data.
	 * @param string $sf_sync_trigger The current operation's trigger.
	 * @param array  $mapping the fieldmap that maps the two object types.
	 * @param array  $map_sync_triggers the enabld map triggers.
	 * @return bool $push_allowed Whether all this stuff allows the $api_result to be pushed to Salesforce
	 */
	private function is_push_allowed( $object_type, $object, $sf_sync_trigger, $mapping, $map_sync_triggers ) {

		// default is push is allowed.
		$push_allowed = true;

		// if the current fieldmap does not allow the wp create trigger, we need to check if there is an object map for the WordPress object ID. if not, set push_allowed to false.
		if ( ! in_array( $this->mappings->sync_wordpress_create, $map_sync_triggers, true ) ) {
			$structure               = $this->wordpress->get_wordpress_table_structure( $object_type );
			$wordpress_id_field_name = $structure['id_field'];
			$object_map              = array();
			// we only need to check against the first mapping object, if it exists. we don't need to loop through them.
			$object_maps = $this->mappings->load_all_by_wordpress( $object_type, $object[ $wordpress_id_field_name ] );
			if ( ! empty( $object_maps ) ) {
				$object_map = $object_maps[0];
			}
			if ( empty( $object_map ) ) {
				$push_allowed = false;
			}
		}

		// check if this is a Salesforce sync trigger.
		if ( ! in_array( $sf_sync_trigger, $map_sync_triggers, true ) ) {
			$push_allowed = false;
		}

		// hook to allow other plugins to prevent a push per-mapping.
		$push_allowed = apply_filters( $this->option_prefix . 'push_object_allowed', $push_allowed, $object_type, $object, $sf_sync_trigger, $mapping );

		// example to keep from pushing the user with ID of 1.
		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		add_filter( 'object_sync_for_salesforce_push_object_allowed', 'check_user', 10, 5 );
		// can always reduce this number if all the arguments are not necessary
		function check_user( $push_allowed, $object_type, $object, $sf_sync_trigger, $mapping ) {
			if ( 'user' === $object_type && 1 === $object['ID'] ) { // do not add user 1 to salesforce
				$push_allowed = false;
			}
			return $push_allowed;
		}
		*/

		return $push_allowed;
	}

}
