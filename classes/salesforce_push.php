<?php

class Salesforce_Push {

	protected $wpdb;
	protected $version;
	protected $login_credentials;
	protected $text_domain;
	protected $salesforce;
	protected $mappings;
	protected $schedule;

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
	* @throws \Exception
	*/
	public function __construct( $wpdb, $version, $login_credentials, $text_domain, $wordpress, $salesforce, $mappings, $schedule ) {
		$this->wpdb = &$wpdb;
		$this->version = $version;
		$this->login_credentials = $login_credentials;
		$this->text_domain = $text_domain;
		$this->wordpress = $wordpress;
		$this->salesforce = $salesforce;
		$this->mappings = $mappings;
		$this->schedule = $schedule;
		$this->salesforce_push_queue = 'salesforce_push';

		$this->add_actions();

	}

	/**
	* Create the action hooks based on what object maps exist from the admin settings
	* todo: is wordpress going to actually keep that blogroll stuff?
	*
	*/
	function add_actions() {
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
					add_action( 'delete_comment', array( &$this, 'delete_comment' ) ); // this only runs when the item gets deleted from the trash, either manually or automatically
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
	function add_user( $user_id ) {
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id );
		$this->object_insert( $user, 'user' );
	}

	/**
	* Callback method for editing a user
	*
	* @param string $user_id
	* @param object $old_user_data
	*/
	function edit_user( $user_id, $old_user_data ) {
		$user = $this->wordpress->get_wordpress_object_data( 'user', $user_id );
		$this->object_update( $user, 'user' );
	}

	/**
	* Callback method for deleting a user
	*
	* @param string $user_id
	*/
	function delete_user( $user_id ) {
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
	function post_actions( $post_id, $post ) {
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
	function add_attachment( $post_id ) {
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id );
		$this->object_insert( $attachment, 'attachment' );
	}

	/**
	* Callback method for editing an attachment
	*
	* @param string $post_id
	*/
	function edit_attachment( $post_id ) {
		$attachment = $this->wordpress->get_wordpress_object_data( 'attachment', $post_id );
		$this->object_update( $attachment, 'attachment' );
	}

	/**
	* Callback method for editing an attachment
	*
	* @param string $post_id
	*/
	function delete_attachment( $post_id ) {
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
	function add_term( $term_id, $tt_id, $taxonomy ) {
		$term = $this->wordpress->get_wordpress_object_data( $taxonomy, $term_id );
		$this->object_insert( $term, $taxonomy );
	}

	/**
	* Callback method for editing a term
	*
	* @param string $term_id
	* @param string $taxonomy
	*/
	function edit_term( $term_id, $taxonomy ) {
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
	function delete_term( $term_id, $term_taxonomy_id, $taxonomy_slug, $already_deleted_term ) {
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
	function add_comment( $comment_id, $comment_approved, $commentdata ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_insert( $comment, 'comment' );
	}

	/**
	* Callback method for editing a comment
	*
	* @param string $comment_id
	*/
	function edit_comment( $comment_id ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_update( $comment, 'comment' );
	}

	/**
	* Callback method for deleting a comment
	*
	* @param string $comment_id
	*/
	function delete_comment( $comment_id ) {
		$comment = $this->wordpress->get_wordpress_object_data( 'comment', $comment_id );
		$this->object_delete( $comment, 'comment' );
	}

	/**
	* Insert a new object
	* This calls the overall push crud method, which controls queuing and sending data to the Salesforce class
	*/
	function object_insert( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_create );
	}

	/**
	* Update an existing object
	* This calls the overall push crud method, which controls queuing and sending data to the Salesforce class
	*/
	function object_update( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_update );
	}

	/**
	* Delete an existing object
	* This calls the overall push crud method, which controls queuing and sending data to the Salesforce class
	*/
	function object_delete( $object, $type ) {
		$this->salesforce_push_object_crud( $type, $object, $this->mappings->sync_wordpress_delete );
	}

	/**
	 * Push objects to Salesforce.
	 * This method decides whether to do the processing immediately or queue it to the schedule class
	 *
	 * @param string $object_type
	 *   Type of WordPress object.
	 * @param object $object
	 *   The object object.
	 * @param int $sf_sync_trigger
	 *   The trigger being responded to.
	 * todo: figure out how drupal populates the wp_salesforce_object_map equivalent table
	 * because the next methods appear to use it and idk where its data comes from
	 */
	function salesforce_push_object_crud( $object_type, $object, $sf_sync_trigger ) {
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

				// allow other plugins to prevent a sync per-mapping.
				// need to figure out how to implement this in wordpress
				// this is the drupal code to try to fork
				/*foreach (module_implements('salesforce_push_entity_allowed') as $module) {
					if (module_invoke($module, 'salesforce_push_entity_allowed', $entity_type, $entity, $sf_sync_trigger, $mapping) === FALSE) {
						continue 2;
					}
				}*/

				// ignore drafts if the setting says so
				// post status is draft, or post status is inherit and post type is not attachment
				if ( isset( $mapping['ignore_drafts'] ) && $mapping['ignore_drafts'] === '1' && isset( $object['post_status'] ) && ( $object['post_status'] === 'draft'  || ( $object['post_status'] === 'inherit' && $object['post_type'] !== 'attachment' ) ) ) {
					continue; // skip this object if it is a draft and the fieldmap settings told us to ignore it
				}
				if ( isset( $mapping['push_async'] ) && ( $mapping['push_async'] === '1' ) ) {
		  			// this item is async and we want to save it to the queue
		  			error_log( 'the trigger is ' . $sf_sync_trigger);
					error_log( 'put this ' . $object_type . ' in the queue: ' . print_r( $object, true ) );

					// possible triggers are create, update, delete of wp object -> salesforce

					//$queue = $this->schedule->push_to_queue($object);
					//$save = $this->schedule->save();
					
					// this is the drupal code we are forking
					/*$queue = DrupalQueue::get($this->salesforce_push_queue);
					$queue->createItem(array(
						'entity_type' => $entity_type,
						'entity_id' => $entity_id,
						'mapping' => $mapping,
						'trigger' => $sf_sync_trigger,
					));*/
				} else {
					// this one is not async. do it immediately.
					// todo: get this one working for all methods
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
	 */
	function salesforce_push_sync_rest( $object_type, $object, $mapping, $sf_sync_trigger ) {

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

		// deleting mapped objects
		if ( $sf_sync_trigger == $this->mappings->sync_wordpress_delete ) {
			if ( $mapping_object ) {
				try {
					$result = $sfapi->object_delete( $mapping['salesforce_object'], $mapping_object['salesforce_id'] );
				}
				catch ( SalesforceException $e ) {
					//salesforce_set_message($e->getMessage(), 'error');
				}

				//salesforce_set_message( 'object has been deleted' );

				// delete the map row from wordpress after the salesforce row has been deleted
				$this->mappings->delete_object_map( $mapping_object['id'] );
				error_log('both have been deleted now');
		  	} // there is no map row
		  	return;
		}

		if ( $mapping_object ) {
			$is_new = FALSE;
		} else {
			$is_new = TRUE;
		}

		$params = $this->map_params( $mapping, $object, FALSE, $is_new );

		if ( $is_new === TRUE ) {
		} else {
			// there is an existing object link

			// if the last sync is greater than the last time this object was updated, skip it
			// this keeps us from doing redundant syncs
			if ( $mapping_object['last_sync'] > $mapping_object['object_updated'] ) {
				error_log('last sync is greater than last update');
				return;
			}

			try {

				$result = $sfapi->object_update( $mapping['salesforce_object'], $mapping_object['salesforce_id'], $params );

				$mapping_object['last_sync_status'] = $this->mappings->status_success;
				$mapping_object['last_sync_message'] = __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain );

				//salesforce_set_message(t('%name has been synchronized with Salesforce record %sfid.', array(
				//	'%name' => $entity_wrapper->label(),
				//	'%sfid' => $mapping_object->salesforce_id,
				//)));
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
			}

			$mapping_object['last_sync_action'] = 'push';
			$mapping_object['last_sync'] = $_SERVER['REQUEST_TIME'];
			$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

		}
		

		

/*

	  // Entity is not linked to an SF object.
	  if (!$mapping_object) {
		// Setup SF record type. CampaignMember objects get their Campaign's type.
		if ($mapping->salesforce_record_type_default != $this->mappings->default_record_type
		  && empty($params['RecordTypeId'])
		  && ($mapping->salesforce_object_type != 'CampaignMember')) {
		  $params['RecordTypeId'] = $mapping->salesforce_record_type_default;
		}

		try {
		  // An external key has been specified, attempt an upsert().
		  if (!empty($key_field)) {

			// External key values with punctuation need to be escaped.
			$encoded_value = urlencode($key_value);
			// For at least 'email' fields, periods also need to be escaped:
			// https://developer.salesforce.com/forums?id=906F000000099xPIAQ
			$encoded_value = str_replace('.', '%2E', $encoded_value);

			$data = $sfapi->objectUpsert($mapping->salesforce_object_type, $key_field, $encoded_value, $params);
			// Handle upsert responses.
			switch ($sfapi->response->code) {
			  // On Upsert:update retrieve object.
			  case '204':
				$sf_object = $sfapi->objectReadbyExternalId($mapping->salesforce_object_type, $key_field, $encoded_value);
				$data['id'] = $sf_object['Id'];
				break;

			  // Handle duplicate records.
			  case '300':
				$data['errorCode'] = $sfapi->response->error .
				  ' (' . $key_field . ':' . $key_value . ')';
				break;
			}
		  }
		  // No key or mapping, create a new object in Salesforce.
		  else {
			$data = $sfapi->objectCreate($mapping->salesforce_object_type, $params);
		  }
		}
		catch(SalesforceException $e) {
		  watchdog_exception('salesforce_push', $e);
		  salesforce_set_message($e->getMessage(), 'error');
		  return;
		}

		// Success.
		if (empty($data['errorCode'])) {
		  // Create mapping object, saved below.
		  $mapping_object = entity_create('salesforce_mapping_object', array(
			'entity_id' => $entity_id,
			'entity_type' => $entity_type,
			'salesforce_id' => $data['id'],
			'last_sync_message' => t('Mapping object created via !function.', array('!function' => __FUNCTION__)),
			'last_sync_status' => $this->mappings->status_success,
		  ));
		}
		else {
		  $message = t('Failed to sync %label with Salesforce. @code: @message',
			array(
			  '%label' => $entity_wrapper->label(),
			  '@code' => $data['errorCode'],
			  '@message' => $data['message'],
			)
		  );
		  salesforce_set_message($message, 'error');
		  watchdog('salesforce_push', $message);
		  return;
		}
	  }
	*/

	}

	/**
	 * Implements hook_cron().
	 */
	function salesforce_push_cron() {
	  $sfapi = $this->salesforce;
	  if (!$sfapi->isAuthorized()) {
		return;
	  }

	  $queue = DrupalQueue::get($this->salesforce_push_queue);
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

		$mapping_object = salesforce_mapping_object_load_by_drupal($entity_type, $entity_id);

		if (!$use_soap) {
		  salesforce_push_sync_rest($entity_type, $entity, $mapping, $item->data['trigger']);
		  $queue->deleteItem($item);
		  continue;
		}

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
	  $soap = new SalesforceSoapPartner($sfapi);
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

		  module_invoke_all('salesforce_push_success', $op, $result, $synced_entity);
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

		  module_invoke_all('salesforce_push_fail', $op, $result, $synced_entity);
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
	function map_params( $mapping, $object, $use_soap = FALSE, $is_new = TRUE ) {

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

			// todo: we could use this but i think maybe it only works for older php?
			//$params[$fieldmap['salesforce_field']] = $object[$fieldmap['wordpress_field']];

			// if the field is a key in salesforce, remove it from $params to avoid upsert errors from salesforce
			if ( $fieldmap['is_key'] === '1' ) {
				$key_field = $salesforce_field;
				$key_value = $object[$wordpress_field]; // this was a drupal thing but we probably don't need to worry about it
				if ( !$use_soap ) {
					unset( $params[$key_field] );
				}
			}
		}

		return $params;

	}

	/**
	 * Implements hook_action_info().
	 */
	function salesforce_push_action_info() {
	  return array(
		'salesforce_push_action' => array(
		  'type' => 'entity',
		  'label' => t('Push entity to Salesforce'),
		  'configurable' => FALSE,
		  'triggers' => array('any'),
		),
	  );
	}

	/**
	 * Push entity to Salesforce.
	 */
	function salesforce_push_action(&$entity, $context) {
	  $trigger = (!empty($entity->is_new) && $entity->is_new) ? $this->mappings->sync_wordpress_create : $this->mappings->sync_wordpress_update;
	  $this->salesforce_push_object_crud($context['entity_type'], $entity, $trigger);
	}
}