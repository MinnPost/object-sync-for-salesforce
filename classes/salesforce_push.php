<?php

class Salesforce_Push {

	protected $wpdb;
	protected $version;
	protected $login_credentials;
	protected $text_domain;
	protected $salesforce;
	protected $mappings;
	protected $logging;
	protected $schedulable_classes;

	/**
	* @var string
	*/
	public $schedule_name; // allow for naming the queue in case there are multiple queues

	/**
	* Functionality for pushing WordPress objects into Salesforce
	*
	* @param object $wpdb
	* @param string $version
	* @param array $login_credentials
	* @param string $text_domain
	* @param object $wordpress
	* @param object $salesforce
	* @param object $mappings
	* @param object $schedule
	* @param string $schedule_name
	* @param object $logging
	* @param array $schedulable_classes
	* @throws \Exception
	*/
	public function __construct( $wpdb, $version, $login_credentials, $text_domain, $wordpress, $salesforce, $mappings, $logging, $schedulable_classes ) {
		$this->wpdb = &$wpdb;
		$this->version = $version;
		$this->login_credentials = $login_credentials;
		$this->text_domain = $text_domain;
		$this->wordpress = $wordpress;
		$this->salesforce = $salesforce;
		$this->mappings = $mappings;
		$this->logging = $logging;
		$this->schedulable_classes = $schedulable_classes;

		$this->schedule_name = 'salesforce_push';
		$this->schedule = $this->schedule();
		$this->add_actions();

	}

	/**
	* Create the action hooks based on what object maps exist from the admin settings
	* is wordpress going to actually keep that blogroll stuff? currently we are not doing anything with it here
	*
	*/
	private function add_actions() {
		$db_version = get_option( 'salesforce_rest_api_db_version', false );
		if ( $db_version === $this->version ) {
			foreach ( $this->mappings->get_fieldmaps() as $mapping ) {
				$object_type = $mapping['wordpress_object'];
				if ( $object_type === 'user' ) {
		    		add_action( 'user_register', array( &$this, 'add_user' ) );
		    		add_action( 'profile_update', array( &$this, 'edit_user' ), 10, 2 );
		    		add_action( 'delete_user', array( &$this, 'delete_user' ) );
		    	} elseif ( $object_type === 'post' ) {
		    		add_action( 'save_post', array( &$this, 'post_actions' ), 10, 2 );
		    	} elseif ( $object_type === 'attachment' ) {
		    		add_action( 'add_attachment', array( &$this, 'add_attachment' ) );
		    		add_action( 'edit_attachment', array( &$this, 'edit_attachment' ) );
		    		add_action( 'delete_attachment', array( &$this, 'delete_attachment' ) );
		    	} elseif ( $object_type === 'category' || $object_type === 'tag' ) {
					add_action( 'create_term', array( &$this, 'add_term' ), 10, 3 );
					add_action( 'edit_terms', array( &$this, 'edit_term' ), 10, 2 );
					add_action( 'delete_term', array( &$this, 'delete_term' ), 10, 4 );
				} elseif ( $object_type === 'comment' ) {
					add_action( 'comment_post', array( &$this, 'add_comment' ), 10, 3 );
					add_action( 'edit_comment', array( &$this, 'edit_comment' ) );
					add_action( 'delete_comment', array( &$this, 'delete_comment' ) ); // to be clear: this only runs when the comment gets deleted from the trash, either manually or automatically
				} else { // this is for custom post types
					add_action( 'save_post_' . $object_type, array( &$this, 'post_actions' ), 10, 2 );
				}
			}
		}
	}

	/**
	* Callback method for adding a user
	*
	* @param string $user_id
	*/
	public function add_user( $user_id ) {
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id );
		$this->object_insert( $user, 'user' );
	}

	/**
	* Callback method for editing a user
	*
	* @param string $user_id
	* @param object $old_user_data
	*/
	public function edit_user( $user_id, $old_user_data ) {
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id );
		$this->object_update( $user, 'user' );
	}

	/**
	* Callback method for deleting a user
	*
	* @param string $user_id
	*/
	public function delete_user( $user_id ) {
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id );
		$this->object_delete( $user, 'user' );
	}

	/**
	* Callback method for posts of any type
	* This can handle create, update, and delete actions
	*
	* @param string $post_id
	* @param object $post
	*/
	public function post_actions( $post_id, $post ) {
		if ( isset( $post->post_status ) && $post->post_status === 'auto-draft' ) {
			return;
		}
		// this plugin does not sync log posts with salesforce
		if ( isset( $post->post_type ) && $post->post_type === 'wp_log' ) {
			return;
		}
	    if ( $post->post_modified_gmt == $post->post_date_gmt && $post->post_status !== 'trash' ){
	        $update = 0;
	        $delete = 0;
	    } elseif ( $post->post_status !== 'trash' ) {
	        $update = 1;
	        $delete = 0;
	    } elseif ( $post->post_status === 'trash' ) {
	    	$update = 0;
	    	$delete = 1;
	    }
	    $post = $this->wordpress->get_wordpress_object_data( 'post', $post_id );
		if ( $update === 1 ) {
			$this->object_update( $post, 'post' );
		} elseif ( $delete === 1) {
			$this->object_delete( $post, 'post' );
		} else {
			$this->object_insert( $post, 'post' );
		}
	}

	/**
	* Callback method for adding an attachment
	*
	* @param string $post_id
	*/
	public function add_attachment( $post_id ) {
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id );
		$this->object_insert( $attachment, 'attachment' );
	}

	/**
	* Callback method for editing an attachment
	*
	* @param string $post_id
	*/
	public function edit_attachment( $post_id ) {
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id );
		$this->object_update( $attachment, 'attachment' );
	}

	/**
	* Callback method for editing an attachment
	*
	* @param string $post_id
	*/
	public function delete_attachment( $post_id ) {
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id );
		$this->object_delete( $attachment, 'attachment' );
	}

	/**
	* Callback method for adding a term
	*
	* @param string $term_id
	* @param string $tt_id
	* @param string $taxonomy
	*/
	public function add_term( $term_id, $tt_id, $taxonomy ) {
		$term = $this->wordpress->get_wordpress_object_data( $taxonomy, $term_id );
		$this->object_insert( $term, $taxonomy );
	}

	/**
	* Callback method for editing a term
	*
	* @param string $term_id
	* @param string $taxonomy
	*/
	public function edit_term( $term_id, $taxonomy ) {
		$term = $this->wordpress->get_wordpress_object_data( $taxonomy, $term_id );
		$this->object_update( $term, $taxonomy );
	}

	/**
	* Callback method for deleting a term
	*
	* @param string $term_id
	* @param int $term_taxonomy_id
	* @param string $taxonomy_slug
	* @param object $already_deleted_term
	*/
	public function delete_term( $term_id, $term_taxonomy_id, $taxonomy_slug, $already_deleted_term ) {
		$term = $this->wordpress->get_wordpress_object_data( $taxonomy, $term_id );
		$this->object_delete( $term, $taxonomy );
	}

	/**
	* Callback method for adding a comment
	*
	* @param string $comment_id
	* @param int|string comment_approved
	* @param array $commentdata
	*/
	public function add_comment( $comment_id, $comment_approved, $commentdata ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_insert( $comment, 'comment' );
	}

	/**
	* Callback method for editing a comment
	*
	* @param string $comment_id
	*/
	public function edit_comment( $comment_id ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_update( $comment, 'comment' );
	}

	/**
	* Callback method for deleting a comment
	*
	* @param string $comment_id
	*/
	public function delete_comment( $comment_id ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_delete( $comment, 'comment' );
	}

	/**
	* Insert a new object
	* This calls the overall push crud method, which controls queuing and sending data to the Salesforce class
	*/
	private function object_insert( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_create );
	}

	/**
	* Update an existing object
	* This calls the overall push crud method, which controls queuing and sending data to the Salesforce class
	*/
	private function object_update( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_update );
	}

	/**
	* Delete an existing object
	* This calls the overall push crud method, which controls queuing and sending data to the Salesforce class
	*/
	private function object_delete( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_delete );
	}

	/**
	* Push objects to Salesforce.
	* This method decides whether to do the processing immediately or queue it to the schedule class (or skip it based on another plugin's activity)
	*
	* @param string $object_type
	*   Type of WordPress object.
	* @param object $object
	*   The object object.
	* @param int $sf_sync_trigger
	*   The trigger being responded to.
	*
	*/
	private function salesforce_push_object_crud( $object_type, $object, $sf_sync_trigger ) {
		// load mappings that match this criteria
		// in this case, it's all mappings that correspond to the posted wordpress object
		$sf_mappings = $this->mappings->get_fieldmaps(
			NULL, // id field must be null for multiples
			array(
				'wordpress_object' => $object_type
			)
		);

		foreach ( $sf_mappings as $mapping ) { // for each mapping of this object
			$map_sync_triggers = $mapping['sync_triggers'];
			if ( isset( $map_sync_triggers ) && isset( $sf_sync_trigger ) && in_array( $sf_sync_trigger, $map_sync_triggers ) ) { // wp or sf crud event

				// hook to allow other plugins to prevent a push per-mapping.
				$push_allowed = apply_filters( 'salesforce_rest_api_push_object_allowed', TRUE, $object_type, $object, $sf_sync_trigger, $mapping );

				// example to keep from pushing the user with id of 1
				/*
				add_filter( 'salesforce_rest_api_push_object_allowed', 'check_user', 10, 5 );
				// can always reduce this number if all the arguments are not necessary
				function check_user( $push_allowed, $object_type, $object, $sf_sync_trigger, $mapping ) {
					if ( $object_type === 'user' && $object['Id'] === 1 ) {
						return FALSE;
					}
				}
				*/

				if ( $push_allowed === FALSE ) {
					continue;
				}

				// ignore drafts if the setting says so
				// post status is draft, or post status is inherit and post type is not attachment
				if ( isset( $mapping['ignore_drafts'] ) && $mapping['ignore_drafts'] === '1' && isset( $object['post_status'] ) && ( $object['post_status'] === 'draft'  || ( $object['post_status'] === 'inherit' && $object['post_type'] !== 'attachment' ) ) ) {
					// skip this object if it is a draft and the fieldmap settings told us to ignore it
					continue;
				}
				if ( isset( $mapping['push_async'] ) && ( $mapping['push_async'] === '1' ) ) {
		  			// this item is async and we want to save it to the queue
					$data = array(
						'object_type' => $object_type,
						'object' => $object,
						'mapping' => $mapping,
						'sf_sync_trigger' => $sf_sync_trigger
					);

					// create new schedule based on the options for this current class
					// this will use the existing schedule if it already exists; otherwise it'll create one
					$this->schedule->use_schedule( $this->schedule_name );
					$this->schedule->push_to_queue( $data );
					$this->schedule->save()->dispatch();

				} else {
					// this one is not async. do it immediately.
					$push = $this->salesforce_push_sync_rest( $object_type, $object, $mapping, $sf_sync_trigger );
		  		}
			} // if the trigger does not match our requirements, skip it
		}
	}

	private function schedule() {
		if ( ! class_exists( 'Wordpress_Salesforce_Schedule' ) && file_exists( plugin_dir_path( __FILE__ ) . '../vendor/autoload.php' ) ) {
			require_once plugin_dir_path( __FILE__ ) . '../vendor/autoload.php';
			require_once plugin_dir_path( __FILE__ ) . '../classes/schedule.php';
		}
		$schedule = new Wordpress_Salesforce_Schedule( $this->wpdb, $this->version, $this->login_credentials, $this->text_domain, $this->wordpress, $this->salesforce, $this->mappings, $this->schedule_name, $this->logging, $this->schedulable_classes );
		$this->schedule = $schedule;
		return $schedule;
	}

	/**
	* Sync WordPress objects and Salesforce objects using the REST API.
	*
	* @param string $object_type
	*   Type of WordPress object.
	* @param object $object
	*   The object object.
	* @param object $mapping
	*   Salesforce mapping object.
	* @param int $sf_sync_trigger
	*   Trigger for this sync.
	*
	* @return true or exit the method
	*
	*/
	public function salesforce_push_sync_rest( $object_type, $object, $mapping, $sf_sync_trigger ) {

		$structure = $this->wordpress->get_wordpress_table_structure( $object_type );
		$object_id_field = $structure['id_field'];

		$exists_query = 'SELECT ' . $object_id_field . ' FROM ' . $structure['content_table'] . ' WHERE ' . $object_id_field . ' = ' . $object["$object_id_field"];
		$object_exists = $this->wpdb->get_row( $exists_query );
		if ( $object_exists === NULL ) {
			// remove it from the schedule
			$this->schedule->cancel_by_name( $this->schedule_name );

			// we should also delete the mapping object since the wordpress item is gone
			// this returns the row that maps the individual wordpress row to the individual salesforce row
			$mapping_object = $this->mappings->load_by_wordpress( $mapping['wordpress_object'], $object["$object_id_field"] );

			if ( isset( $mapping_object['id'] ) ) {
				$this->mappings->delete_object_map( $mapping_object['id'] );
			} else {
				$mapping_object['salesforce_id'] = 'unknown';
			}

			// create a log entry
			$status = 'notice';
			// create log entry for failed delete
			if ( isset( $this->logging ) ) {
				$logging = $this->logging;
			} else if ( class_exists( 'Salesforce_Logging' ) ) {
				$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
			}

			$logging->setup(
				__( ucfirst( $status ) . ': Unable to delete WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id_field . ' of ' . $object["$object_id_field"] . ' (Salesforce ' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ') because the WordPress object has already been deleted.', $this->text_domain ),
				'',
				$sf_sync_trigger,
				$object["$object_id_field"],
				$status
			);

			return;
		}

		// if salesforce is not authorized, don't do anything.
		// it's unclear to me if we need to do something else here or if this is sufficient. this is all drupal does.
		if ( $this->salesforce['is_authorized'] !== TRUE ) {
			return;
		}

		$sfapi = $this->salesforce['sfapi'];

		// we need to get the wordpress id here so we can check to see if the object already has a map
		$structure = $this->wordpress->get_wordpress_table_structure( $object_type );
		$object_id = $structure['id_field'];

		// this returns the row that maps the individual wordpress row to the individual salesforce row
		$mapping_object = $this->mappings->load_by_wordpress( $object_type, $object["$object_id"] );

		// hook to allow other plugins to define or alter the mapping object
		$mapping_object = apply_filters( 'salesforce_rest_api_push_mapping_object', $mapping_object, $object, $mapping );

		// make sure these data versions are integers bc php's mysql is weird
		if ( isset( $mapping_object['salesforce_data_version'] ) ) {
			$mapping_object['salesforce_data_version'] = absint( $mapping_object['salesforce_data_version'] );
		} else {
			$mapping_object['salesforce_data_version'] = 0;
		}
		if ( isset( $mapping_object['wordpress_data_version'] ) ) {
			$mapping_object['wordpress_data_version'] = absint( $mapping_object['wordpress_data_version'] );
			// always increase the wp version because this is a push call
			$mapping_object['wordpress_data_version']++;
		} else {
			// because this is a push, start at 1 if there is no wp data version
			$mapping_object['wordpress_data_version'] = 1;
		}

		// the wordpress and salesforce versions of the data are the same. don't do anything.
		if ( $mapping_object['wordpress_data_version'] === $mapping_object['salesforce_data_version'] ) {
			// if there is an actual mapping object row, update it so the version numbers will be correct
			// if we are sending data to wordpress, this happens after that data gets saved
			if ( isset( $mapping_object['id'] ) ) {
				$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );
			}
			return; // do not continue pushing data
		}

		// continue the push because wp and sf data versions are not equal
		$synced_object = array(
			'wordpress_object' => $object,
			'mapping_object' => $mapping_object,
			'queue_item' => FALSE,
			'mapping' => $mapping,
		);

		$op = '';

		// deleting mapped objects
		if ( $sf_sync_trigger == $this->mappings->sync_wordpress_delete ) {
			if ( isset( $mapping_object['id'] ) ) {
				$op = 'Delete';

				$salesforce_check = $this->mappings->load_by_salesforce( $mapping_object['salesforce_id'] );

				if ( count( $salesforce_check ) == count( $salesforce_check, COUNT_RECURSIVE ) ) {
					try {
						$result = $sfapi->object_delete( $mapping['salesforce_object'], $mapping_object['salesforce_id'] );
					}
					catch ( SalesforceException $e ) {
						$status = 'error';
						// create log entry for failed delete
						if ( isset( $this->logging ) ) {
							$logging = $this->logging;
						} else if ( class_exists( 'Salesforce_Logging' ) ) {
							$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
						}

						$logging->setup(
							__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ' (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ')', $this->text_domain ),
							$e->getMessage(),
							$sf_sync_trigger,
							$object["$object_id"],
							$status
						);

						// hook for push fail
						do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );

					}

					if ( !isset( $e ) ) {
						// create log entry for successful delete if the result had no errors
						$status = 'success';
						if ( isset( $this->logging ) ) {
							$logging = $this->logging;
						} else if ( class_exists( 'Salesforce_Logging' ) ) {
							$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
						}

						$logging->setup(
							__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ' (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ')', $this->text_domain ),
							'',
							$sf_sync_trigger,
							$object["$object_id"],
							$status
						);

						// hook for push success
						do_action( 'salesforce_rest_api_push_success', $op, $sfapi->response, $synced_object );
					}
				} else {
					$more_ids = '<p>The Salesforce record was not deleted because there are multiple WordPress IDs that match this Salesforce ID. They are: ';
					$i = 0;
					foreach ( $salesforce_check as $match ) {
						$i++;
						$more_ids .= $match['wordpress_id'];
						if ( $i !== count( $salesforce_check ) ) {
							$more_ids .= ', ';
						} else {
							$more_ids .= '.</p>';
						}
					}

					$more_ids .= '<p>The map row between this WordPress object and the Salesforce object, as stored in the WordPress database, will be deleted, and this WordPress object has been deleted, but Salesforce will remain untouched.</p>';

					$status = 'notice';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} else if ( class_exists( 'Salesforce_Logging' ) ) {
						$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
					}

					$logging->setup(
						__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ' (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ') did not delete the Salesforce item...', $this->text_domain ),
						$more_ids,
						$sf_sync_trigger,
						$object["$object_id"],
						$status
					);
				}				

				// delete the map row from wordpress after the salesforce row has been deleted
				// we delete the map row even if the salesforce delete failed, because the wp object is gone
				$this->mappings->delete_object_map( $mapping_object['id'] );
				
		  	} // there is no map row

		  	return;
		}

		// are these objects already connected in wordpress?
		if ( isset( $mapping_object['id'] ) ) {
			$is_new = FALSE;
		} else {
			$is_new = TRUE;
		}

		$params = $this->mappings->map_params( $mapping, $object, $sf_sync_trigger, FALSE, $is_new );

		// if we don't get any params, there are no fields that should be sent to salesforce
		if ( empty( $params ) ) {
			return;
		}

		// if there is a prematch wordpress field - ie email - on the fieldmap object
		if ( isset( $params['prematch'] ) && is_array( $params['prematch'] ) ) {
			$prematch_field_wordpress = $params['prematch']['wordpress_field'];
			$prematch_field_salesforce = $params['prematch']['salesforce_field'];
			$prematch_value = $params['prematch']['value'];
			unset( $params['prematch'] );
		}

		// if there is an external key field in salesforce - ie mailchimp user id - on the fieldmap object
		if ( isset( $params['key'] ) && is_array( $params['key'] ) ) {
			$key_field_wordpress = $params['key']['wordpress_field'];
			$key_field_salesforce = $params['key']['salesforce_field'];
			$key_value = $params['key']['value'];
			unset( $params['key'] );
		}

		if ( $is_new === TRUE ) {
			// create new object link in wp because the systems don't know about each other yet

			// setup SF record type. CampaignMember objects get their Campaign's type
			// i am still a bit confused about this
			if ( $mapping['salesforce_record_type_default'] !== $this->mappings->salesforce_default_record_type && empty( $params['RecordTypeId'] ) && ( $mapping['salesforce_object'] !== 'CampaignMember') ) {
				$params['RecordTypeId'] = $mapping['salesforce_record_type_default'];
			}

			try {

				// hook to allow other plugins to modify the $salesforce_id string here
				// use hook to change the object that is being matched to developer's own criteria
				// ex: match a Salesforce Contact based on a connected email address object
				// returns a $salesforce_id.
				// it should keep NULL if there is no match
				// the function that calls this hook needs to check the mapping to make sure the wordpress object is the right type
				$salesforce_id = apply_filters( 'salesforce_rest_api_find_sf_object_match', NULL, $object, $mapping, 'push' );

				if ( isset( $prematch_field_wordpress ) || isset( $key_field_wordpress ) || $salesforce_id !== NULL ) {
					
					// if either prematch criteria exists, make the values queryable

					if ( isset( $prematch_field_wordpress ) ) {
						// a prematch has been specified, attempt an upsert().
						// prematch values with punctuation need to be escaped
						$encoded_prematch_value = urlencode( $prematch_value );
						// for at least 'email' fields, periods also need to be escaped:
						// https://developer.salesforce.com/forums?id=906F000000099xPIAQ
						$encoded_prematch_value = str_replace( '.', '%2E', $encoded_prematch_value );
					}

					if ( isset( $key_field_wordpress ) ) {
						// an external key has been specified, attempt an upsert().
						// external key values with punctuation need to be escaped
						$encoded_key_value = urlencode( $key_value );
						// for at least 'email' fields, periods also need to be escaped:
						// https://developer.salesforce.com/forums?id=906F000000099xPIAQ
						$encoded_key_value = str_replace( '.', '%2E', $encoded_key_value );
					}

					if ( isset($prematch_field_wordpress ) ) {
						$upsert_key = $prematch_field_salesforce;
						$upsert_value = $encoded_prematch_value;
					} elseif ( isset( $key_field_wordpress ) ) {
						$upsert_key = $key_field_salesforce;
						$upsert_value = $encoded_key_value;
					}

					if ( $salesforce_id !== NULL ) {
						$upsert_key = 'Id';
						$upsert_value = $salesforce_id;
					}

					$op = 'Upsert';

					$result = $sfapi->object_upsert( $mapping['salesforce_object'], $upsert_key, $upsert_value, $params );

					// Handle upsert responses.
					switch ( $sfapi->response['code'] ) {
						// On Upsert:update retrieved object.
						case '204':
							$sf_object = $sfapi->object_readby_external_id( $mapping['salesforce_object'], $upsert_key, $upsert_value );
							$salesforce_data['id'] = $sf_object['data']['Id'];
						break;
						// Handle duplicate records.
						case '300':
							$result['errorCode'] = $sfapi->response['error'] . ' (' . $upsert_key . ':' . $upsert_value . ')';
						break;
					}

				} else {
					// No key or prematch field exists on this field map object, create a new object in Salesforce.
					$op = 'Create';
					$result = $sfapi->object_create( $mapping['salesforce_object'], $params );
				}
			}
			catch ( SalesforceException $e ) {
				// create log entry for failed create or upsert
				$status = 'error';
				$title = ucfirst( $status ) . ': ' . $op . ' ' . $mapping['salesforce_object'];
				if ( $salesforce_id !== NULL ) {
					$title .= ' ' . $salesforce_id;
				}
				$title .=  ' (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ')';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( $title, $this->text_domain ),
					$e->getMessage(),
					$sf_sync_trigger,
					$object["$object_id"],
					$status
				);

				// hook for push fail
				do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );

				return;
			}

			if ( !isset( $salesforce_data ) ) {
				// if we didn't set $salesforce_data already, set it now to api call result
				$salesforce_data = $result['data'];
			}

			// salesforce api call was successful
			// this means the object has already been created/updated in salesforce
			// this is not redundant because this is where it creates the object mapping rows in wordpress if the object does not already have one (we are still inside $is_new === TRUE here)

			if ( empty($result['errorCode'] ) ) {
				$salesforce_id = $salesforce_data['id'];
				$status = 'success';

				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['salesforce_object'] . ' ' . $salesforce_id . ' (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ')', $this->text_domain ),
					'',
					$sf_sync_trigger,
					$object["$object_id"],
					$status
				);

				$mapping_object = $this->create_object_map( $object, $object_id, $salesforce_id, $mapping );

				// hook for push success
				do_action( 'salesforce_rest_api_push_success', $op, $sfapi->response, $synced_object );
			} else {

				// create log entry for failed create or upsert
				// this is part of the drupal module but i am failing to understand when it would ever fire, since the catch should catch the errors
				// if we see this in the log entries, we can understand what it does, but probably not until then
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( $salesforce_data['errorCode'] . ' ' . $status . ' syncing: ' . $op . ' to Salesforce (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ')', $this->text_domain ),
					'Object: ' . $mapping['salesforce_object'] . '<br>br>' . 'Message: ' . $salesforce_data['message'],
					$sf_sync_trigger,
					$object["$object_id"],
					$status
				);

				// hook for push fail
				do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );

				return;
			}

		} else {
			// there is an existing object link
			// if the last sync is greater than the last time this object was updated, skip it
			// this keeps us from doing redundant syncs
			$mapping_object['object_updated'] = current_time( 'mysql' );
			if ( $mapping_object['last_sync'] > $mapping_object['object_updated'] ) {
				$status = 'notice';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ': Did not sync WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ' with Salesforce ID ' . $mapping_object['salesforce_id'] . ' because the last sync timestamp was greater than the object updated timestamp', $this->text_domain ),
					'Last sync time: ' . $mapping_object['last_sync'] . '<br>' . 'Object updated time: ' . $mapping_object['object_updated'],
					$sf_sync_trigger,
					$object["$object_id"],
					$status
				);
				return;
			}

			// try to make a salesforce update call
			try {
				$op = 'Update';
				$result = $sfapi->object_update( $mapping['salesforce_object'], $mapping_object['salesforce_id'], $params );

				$mapping_object['last_sync_status'] = $this->mappings->status_success;
				$mapping_object['last_sync_message'] = __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain );

				$status = 'success';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ' (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ')', $this->text_domain ),
					'',
					$sf_sync_trigger,
					$object["$object_id"],
					$status
				);

				// hook for push success
				do_action( 'salesforce_rest_api_push_success', $op, $sfapi->response, $synced_object );

			}
			catch ( SalesforceException $e ) {
				// create log entry for failed update
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ' (WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $object["$object_id"] . ')', $this->text_domain ),
					$e->getMessage(),
					$sf_sync_trigger,
					$object["$object_id"],
					$status
				);

				$mapping_object['last_sync_status'] = $this->mappings->status_error;
				$mapping_object['last_sync_message'] = $e->getMessage();

				// hook for push fail
				do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );

			}

			// check to see if we actually updated anything in salesforce
			if ( $mapping_object['salesforce_data_version'] !== $mapping_object['wordpress_data_version'] ) {
				// tell the mapping object - whether it is new or already existed - how we just used it
				$mapping_object['last_sync_action'] = 'push';
				$mapping_object['last_sync'] = current_time( 'mysql' );
			}
			// update that mapping object
			$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

		} // this is the end of the if is_new stuff

	}

	/**
	* Create an object map between a WordPress object and a Salesforce object
	*
	* @param array $wordpress_object
	*	Array of the wordpress object's data
	* @param string $id_field_name
	*	How this object names its primary field. ie Id or comment_id or whatever
	* @param string $salesforce_id
	*	Unique identifier for the Salesforce object
	* @param array $field_mapping
	*	The row that maps the object types together, including which fields match which other fields
	*
	* @return array $mapping object
	*	This is the database row that maps the objects, including the IDs for each one, and the WP object type
	*
	*/
	private function create_object_map( $wordpress_object, $id_field_name, $salesforce_id, $field_mapping ) {
		// Create object map and save it
		$mapping_object = $this->mappings->create_object_map(
			array(
				'wordpress_id' => $wordpress_object[$id_field_name], // wordpress unique id
				'salesforce_id' => $salesforce_id, // salesforce unique id. we don't care what kind of object it is at this point
				'wordpress_object' => $field_mapping['wordpress_object'], // keep track of what kind of wp object this is
				'last_sync' => current_time( 'mysql' ),
				'last_sync_action' => 'push',
				'last_sync_status' => $this->mappings->status_success,
				'last_sync_message' => __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain ),
				'wordpress_data_version' => 1,
				'salesforce_data_version' => 0
			)
		);

		return $mapping_object;

	}

	/**
	 * Process SOAP API batch results.
	 *
	 * Create or update mapped object entities and log results.
	 *
	 * @param string $op
	 *   Operation performed.
	 * @param array $results
	 *   Array of result objects provided by Salesforce.
	 * @param array $synced_entities
	 *   Entities that were synced with Salesforce.
	 */
	function salesforce_push_process_soap_results($op, $results, $synced_entities) {
	  foreach ($results as $key => $result) {
		$synced_entity = $synced_entities[$key];
		$mapping_object = empty($synced_entity['mapping_object']) ? FALSE : $synced_entity['mapping_object'];
		if ($result->success) {
		  if (drupal_strtolower($op) == 'delete' && $mapping_object) {
			$mapping_object->delete();
			return;
		  }

		  if (!$mapping_object) {
			// Create mapping object, saved below.
			$wrapper = $synced_entity['entity_wrapper'];
			list($entity_id) = entity_extract_ids($wrapper->type(), $wrapper->value());
			$mapping_object = entity_create('salesforce_mapping_object', array(
			  'entity_id' => $entity_id,
			  'entity_type' => $wrapper->type(),
			  'salesforce_id' => $result->id,
			  'last_sync_message' => t('Mapping object created via !function.', array('!function' => __FUNCTION__)),
			));
		  }
		  else {
			$mapping_object->last_sync_message = t('Mapping object updated via !function.', array('!function' => __FUNCTION__));
		  }

		  $mapping_object->last_sync_status = $this->mappings->status_success;
		  $mapping_object->last_sync = current_time( 'timestamp' );
		  $mapping_object->last_sync_action = 'push';
		  $mapping_object->save();

		  watchdog('salesforce_push', '%op: Salesforce object %id',
			array('%id' => $result->id, '%op' => $op)
		  );

		  do_action( 'salesforce_rest_api_push_success', $op, $sfapi->response, $synced_object );
		}
		else {
		  // Otherwise, the item is considered failed.
		  $error_messages = array();
		  foreach ($result->errors as $error) {
			watchdog('salesforce_push', '%op error for Salesforce object %id. @code: @message',
			  array(
				'%id' => $result->id,
				'@code' => $error->statusCode,
				'@message' => $error->message,
				'%op' => $op,
			  ),
			  WATCHDOG_ERROR
			);
			$error_messages[] = $error->message;
		  }
		  if ($mapping_object) {
			$mapping_object->last_sync = current_time( 'timestamp' );
			$mapping_object->last_sync_action = 'push';
			$mapping_object->last_sync_status = $this->mappings->status_error;
			$mapping_object->last_sync_message = t('Push error via %function with the following messages: @message.', array(
			  '%function' => __FUNCTION__,
			  '@message' => implode(' | ', $error_messages),
			));
			$mapping_object->save();
		  }

		  do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );
		}
	  }
	}
	
}