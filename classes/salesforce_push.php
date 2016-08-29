<?php

class Salesforce_Push {

	protected $wpdb;
	protected $version;
	protected $login_credentials;
	protected $text_domain;
	protected $salesforce;
	protected $mappings;
	protected $schedule;
	protected $schedule_name;
	protected $logging;

	/**
	* @var string
	*/
	public $salesforce_push_queue; // name the queue in case there are multiple queues

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
	* @throws \Exception
	*/
	public function __construct( $wpdb, $version, $login_credentials, $text_domain, $wordpress, $salesforce, $mappings, $schedule, $schedule_name, $logging ) {
		$this->wpdb = &$wpdb;
		$this->version = $version;
		$this->login_credentials = $login_credentials;
		$this->text_domain = $text_domain;
		$this->wordpress = $wordpress;
		$this->salesforce = $salesforce;
		$this->mappings = $mappings;
		$this->schedule = $schedule;
		$this->schedule_name = $schedule_name;
		$this->logging = $logging;

		$this->add_actions();

	}

	/**
	* Create the action hooks based on what object maps exist from the admin settings
	* todo: is wordpress going to actually keep that blogroll stuff?
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
					add_action( 'comment_post', array( &$this, 'add_comment', 3 ) );
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
	    if ( $post->post_modified_gmt == $post->post_date_gmt && $post->post_status !== 'trash' ){
	        $update = 0;
	        $delete = 0;
	    } else if ( $post->post_status !== 'trash' ) {
	        $update = 1;
	        $delete = 0;
	    } else if ( $post->post_status === 'trash' ) {
	    	$update = 0;
	    	$delete = 1;
	    }
	    $post = $this->wordpress->get_wordpress_object_data( 'post', $post_id );
		if ( $update === 1 ) {
			$this->object_update( $post, 'post' );
		} else if ( $delete === 1) {
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
		// avoid duplicate processing if this object has just been updated by Salesforce pull
		// todo: start saving this data once we are doing a salesforce pull
		if ( isset( $object->salesforce_pull ) && $object->salesforce_pull ) {
			return FALSE;
		}

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

				// allow other plugins to prevent a push per-mapping.
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
						'sf_sync_trigger' => $sf_sync_trigger,
						'class' => 'Salesforce_Push',
						'method' => 'salesforce_push_sync_rest'
					);
					// todo: figure out how to set the schedule name and frequency here, so we could do it in specific methods
					// example: want to make salesforce reauthenticate itself, but not every 5 minutes
					//$this->schedule->schedule( $this->salesforce_push_schedule_name, $this->salesforce_push_frequency );
					$queue = $this->schedule->push_to_queue( $data );
					$save = $this->schedule->save();
				} else {
					// this one is not async. do it immediately.
					$push = $this->salesforce_push_sync_rest( $object_type, $object, $mapping, $sf_sync_trigger );
		  		}
			} // if the trigger does not match our requirements, skip it
		}
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

		// if salesforce is not authorized, don't do anything.
		// it's unclear to me if we need to do something else here or if this is sufficient. this is all drupal does.
		if ( $this->salesforce['is_authorized'] !== true ) {
			return;
		}

		$sfapi = $this->salesforce['sfapi'];

		// we need to get the wordpress id here so we can check to see if the object already has a map
		$structure = $this->wordpress->get_wordpress_table_structure( $object_type );
		$object_id = $structure['id_field'];

		// this returns the row that maps the individual wordpress row to the individual salesforce row
		$mapping_object = $this->mappings->load_by_wordpress( $object_type, $object["$object_id"] );

		$synced_object = array(
			'wordpress_object' => $object,
			'mapping_object' => $mapping_object,
			'queue_item' => FALSE,
			'mapping' => $mapping,
		);

		$op = '';

		// deleting mapped objects
		if ( $sf_sync_trigger == $this->mappings->sync_wordpress_delete ) {
			if ( $mapping_object ) {
				$op = 'Delete';
				try {
					$result = $sfapi->object_delete( $mapping['salesforce_object'], $mapping_object['salesforce_id'] );
				}
				catch ( SalesforceException $e ) {
					//salesforce_set_message($e->getMessage(), 'error');
					error_log( 'salesforce error: ' . $e->getMessage() );

					// hook for push fail
					do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );
				}

				//salesforce_set_message( 'object has been deleted' );

				// delete the map row from wordpress after the salesforce row has been deleted
				$this->mappings->delete_object_map( $mapping_object['id'] );

				// hook for push success
				do_action( 'salesforce_rest_api_push_success', $op, $sfapi->response, $synced_object );

		  	} // there is no map row
		  	return;
		}

		// are these objects already connected in wordpress?
		if ( $mapping_object ) {
			$is_new = FALSE;
		} else {
			$is_new = TRUE;
		}

		$params = $this->map_params( $mapping, $object, FALSE, $is_new );

		if ( $is_new === TRUE ) {
			// going to need to create new object link in wp because the systems don't know about each other yet

			// setup SF record type. in drupal, CampaignMember objects get their Campaign's type
			// currently we don't have the data structure for this. it seems maybe unnecessary
			// todo: investigate this further
			/*if ( $mapping['salesforce_record_type_default'] !== $this->mappings->default_record_type && empty( $params['RecordTypeId'] ) && ( $mapping['salesforce_object'] !== 'CampaignMember') ) {
				$params['RecordTypeId'] = $mapping['salesforce_record_type_default'];
			}*/

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

			try {

				// hook to allow other plugins to modify the $salesforce_id string here
				// use hook to change the object that is being matched to developer's own criteria
				// ex: match a Salesforce Contact based on a connected email address object
				// returns a $salesforce_id.
				// it should keep NULL if there is no match
				$salesforce_id = apply_filters( 'salesforce_rest_api_find_object_match', NULL, $object );

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
					} else if ( isset( $key_field_wordpress ) ) {
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
				error_log( 'salesforce_push error:' . $e);
				//salesforce_set_message($e->getMessage(), 'error');

				// hook for push fail
				do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );

				return;
			}

			if ( !isset( $salesforce_data ) ) {
				// if we didn't set $salesforce_data already, set it now to api call result
				$salesforce_data = $result['data'];
			}

			// salesforce api call was successful
			// this means the object has already been added to/updated in salesforce
			if ( empty($result['errorCode'] ) ) {
				$salesforce_id = $salesforce_data['id'];
				$mapping_object = $this->create_object_match( $object, $object_id, $salesforce_id, $mapping );

				// hook for push success
				do_action( 'salesforce_rest_api_push_success', $op, $sfapi->response, $synced_object );
			} else {
				// salesforce failed
				$message = __('Failed to sync ' . $mapping['salesforce_object'] . ' with Salesforce. Code: ' . $salesforce_data['errorCode'] . ' and message: ' . $salesforce_data['message'], $this->text_domain );
				//salesforce_set_message($message, 'error');
				error_log('salesforce_push error:', print_r($message, true));

				// hook for push fail
				do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );

				return;
			}

		} else {
			// there is an existing object link

			// if the last sync is greater than the last time this object was updated, skip it
			// this keeps us from doing redundant syncs
			if ( $mapping_object['last_sync'] > $mapping_object['object_updated'] ) {
				error_log('last sync is greater than last update');
				return;
			}

			try {
				$op = 'Update';
				$result = $sfapi->object_update( $mapping['salesforce_object'], $mapping_object['salesforce_id'], $params );

				$mapping_object['last_sync_status'] = $this->mappings->status_success;
				$mapping_object['last_sync_message'] = __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain );

				//salesforce_set_message(t('%name has been synchronized with Salesforce record %sfid.', array(
				//	'%name' => $entity_wrapper->label(),
				//	'%sfid' => $mapping_object->salesforce_id,
				//)));

				// hook for push success
				do_action( 'salesforce_rest_api_push_success', $op, $sfapi->response, $synced_object );

			}
			catch ( SalesforceException $e ) {
				error_log( 'salesforce_push error: ' . $e );
				/*salesforce_set_message(t('Error syncing @type @id to Salesforce record @sfid. Error message: "@msg".', array(
					'@type' => $mapping_object->entity_type,
					'@id' => $mapping_object->entity_id,
					'@sfid' => $mapping_object->salesforce_id,
					'@msg' => $e->getMessage(),
				)), 'error');*/
				$mapping_object['last_sync_status'] = $this->mappings->status_error;
				$mapping_object['last_sync_message'] = $e->getMessage();

				// hook for push fail
				do_action( 'salesforce_rest_api_push_fail', $op, $sfapi->response, $synced_object );

			}

			// tell the mapping object - whether it is new or already existed - how we just used it
			$mapping_object['last_sync_action'] = 'push';
			$mapping_object['last_sync'] = current_time( 'mysql' );

			// update that mapping object
			$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

		}

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
	private function create_object_match( $wordpress_object, $id_field_name, $salesforce_id, $field_mapping ) {
		// Create object map and save it
		$mapping_object = $this->mappings->create_object_map(
			array(
				'wordpress_id' => $wordpress_object[$id_field_name], // wordpress unique id
				'salesforce_id' => $salesforce_id, // salesforce unique id. we don't care what kind of object it is at this point
				'wordpress_object' => $field_mapping['wordpress_object'], // keep track of what kind of wp object this is
				'last_sync_message' => __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain ),
				'last_sync_status' => $this->mappings->status_success,
			)
		);

		return $mapping_object;

	}

	/**
	* When the scheduled tasks run, this is the processor
	* We may already have all the functionality we need in the schedule.php class
	* keeping this here for reference until i know for sure
	* todo: investigate this and see if it is better than current way of running through the scheduled entries
	*/
	function push_schedule() {
	  
		if ( $this->salesforce['is_authorized'] !== true ) {
			return;
		}

	  $queue = DrupalQueue::get($this->salesforce_push_schedule_name);
	  $limit = variable_get('salesforce_push_limit', 50);
	  $use_soap = module_exists('salesforce_soap');
	  $entity_ids = array();

	  $delta = 0;
	  for ($i = 0; $i < $limit; $i++) {
		$item = $queue->claimItem();
		// We do this after the "for()" so that when we reach the limit, we don't
		// incidentally claim a queue license on an item we aren't going to process.
		if (!$item) {
		  break;
		}
		$mapping = $item->data['mapping'];

		// Initialize array for the entity type if it isn't set yet.
		if (!isset($entity_ids[$item->data['entity_type']])) {
		  $entity_ids[$item->data['entity_type']] = array();
		}

		$entity_type = $item->data['entity_type'];
		$entity_id = $item->data['entity_id'];

		// Duplicate entity in the queue.
		if (in_array($entity_id, $entity_ids[$item->data['entity_type']])) {
		  $queue->deleteItem($item);
		  continue;
		}

		// Attempt to load our entity from the queue item.
		$entity = entity_load_single($entity_type, $entity_id);

		// If the entity fails to load, remove it from the queue. This can happen
		// if we're processing records asynchronously and it was deleted from SF
		// before cron ran.
		if ($entity === FALSE) {
		  $queue->deleteItem($item);
		  continue;
		}

		// Add entity id to array of pushed entities to check for duplicates later.
		$entity_ids[$item->data['entity_type']][] = $entity_id;

		if (!$use_soap) {
		  salesforce_push_sync_rest($entity_type, $entity, $mapping, $item->data['trigger']);
		  $queue->deleteItem($item);
		  continue;
		}

		$mapping_object = salesforce_mapping_object_load_by_drupal($entity_type, $entity_id);
		// Allow other modules to define or alter the mapping object.
		drupal_alter('salesforce_push_mapping_object', $mapping_object, $entity, $mapping);

		if ($item->data['trigger'] == $this->mappings->sync_wordpress_delete && $mapping_object) {
		  $delete_list[$delta] = $mapping_object->salesforce_id;
		  continue;
		}
		$wrapper = entity_metadata_wrapper($item->data['entity_type'], $entity);
		$key_field = $key_value = NULL;
		$params = salesforce_push_map_params($mapping, $wrapper, $key_field, $key_value, $use_soap, !$mapping_object);

		$synced_entities[$delta] = array(
		  'entity_wrapper' => $wrapper,
		  'mapping_object' => $mapping_object,
		  'queue_item' => $item,
		  'mapping' => $mapping,
		);

		// Setup SF record type. CampaignMember objects get their type from
		// their Campaign.
		// @TODO: remove object-specific logic. Figure out how this works and implement generic support for recordtype inheritence, or objects that don't support recordtypes
		if ($mapping['salesforce_record_type_default'] != $this->mappings->default_record_type
		  && empty($params['RecordTypeId'])
		  && ($mapping['salesforce_object_type'] != 'CampaignMember')) {
		  $params['RecordTypeId'] = $mapping['salesforce_record_type_default'];
		}

		$sobject = new stdClass();
		$sobject->type = $mapping['salesforce_object_type'];
		foreach ($params as $key => $value) {
		  $sobject->fields[$key] = $value;
		}

		// If we have a SFID, this is an update.
		if ($mapping_object && $mapping_object->salesforce_id) {
		  $sobject->Id = $mapping_object->salesforce_id;
		  $update_list[$delta] = $sobject;
		  continue;
		}

		// If we have a dedupe key, prefer upsert.
		if ($key_field && $key_value) {
		  $upsert_list[$key_field][$delta] = $sobject;
		}
		else {
		  // Otherwise create.
		  $create_list[$delta] = $sobject;
		}

		// Remove item from queue.
		$queue->deleteItem($item);
		$delta++;
	  }

	  if (!$use_soap) {
		return;
	  }

	  // Use soap API to batch process records.
	  $soap = new SalesforceSoapPartner($sfapi, variable_get('salesforce_partner_wsdl', libraries_get_path('salesforce') . '/soapclient/partner.wsdl.xml'));
	  if (!empty($delete_list)) {
		$results = $soap->delete($delete_list);
		salesforce_push_process_soap_results('Delete', $results, $synced_entities);
	  }

	  if (!empty($create_list)) {
		$results = $soap->create($create_list);
		salesforce_push_process_soap_results('Create', $results, $synced_entities);
	  }

	  if (!empty($update_list)) {
		$results = $soap->update($update_list);
		salesforce_push_process_soap_results('Update', $results, $synced_entities);
	  }

	  if (!empty($upsert_list)) {
		foreach ($upsert_list as $key => $upsert_item) {
		  $results = $soap->upsert($key, $upsert_item);
		  salesforce_push_process_soap_results('Upsert', $results, $synced_entities);
		}
	  }
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
		  $mapping_object->last_sync = $_SERVER['REQUEST_TIME'];
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
			$mapping_object->last_sync = $_SERVER['REQUEST_TIME'];
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

	/**
	* Map WordPress values to a Salesforce object.
	*
	* @param array $mapping
	*   Mapping object.
	* @param array $object
	*   WordPress object.
	* @param bool $use_soap
	*   Flag to enforce use of the SOAP API.
	* @param bool $is_new
	*   Indicates whether a mapping object for this entity already exists.
	*
	* @return array
	*   Associative array of key value pairs.
	*/
	private function map_params( $mapping, $object, $use_soap = FALSE, $is_new = TRUE ) {

		$params = array();

		foreach ( $mapping['fields'] as $fieldmap ) {
			// skip fields that aren't being pushed to Salesforce.
			if ( !in_array( $fieldmap['direction'], array( $this->mappings->direction_wordpress_sf, $this->mappings->direction_sync ) ) ) {
				continue;
			}

			// Skip fields that aren't updateable when a mapped object already exists
			// maybe we should put this into the salesforce module so we don't load fields that aren't updateable anyway. otherwise i am unclear what this even is.
			/*if ( !$is_new && !$fieldmap['salesforce_field']['updateable'] ) {
				continue;
			}*/

			$salesforce_field = $fieldmap['salesforce_field'];
			$wordpress_field = $fieldmap['wordpress_field'];
			$params[$salesforce_field] = $object[$wordpress_field];

			// todo: we could use this syntax but i think maybe it only works for older php?
			//$params[$fieldmap['salesforce_field']] = $object[$fieldmap['wordpress_field']];

			// if the field is a key in salesforce, remove it from $params to avoid upsert errors from salesforce
			// but still put its name in the params array so we can check for it later
			if ( $fieldmap['is_key'] === '1' ) {
				if ( !$use_soap ) {
					unset( $params[$salesforce_field] );
				}
				$params['key'] = array(
					'salesforce_field' => $salesforce_field,
					'wordpress_field' => $wordpress_field,
					'value' => $object[$wordpress_field]
				);
			}

			// if the field is a prematch in salesforce, put its name in the params array so we can check for it later
			if ( $fieldmap['is_prematch'] === '1' ) {
				$params['prematch'] = array(
					'salesforce_field' => $salesforce_field,
					'wordpress_field' => $wordpress_field,
					'value' => $object[$wordpress_field]
				);
			}

		}

		return $params;

	}
	
}