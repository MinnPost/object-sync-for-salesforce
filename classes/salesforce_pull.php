<?php

class Salesforce_Pull {

	protected $wpdb;
    protected $version;
    protected $login_credentials;
    protected $text_domain;
    protected $salesforce;
    protected $mappings;

    /**
	* @var string
	*/
    public $salesforce_pull_queue; // name the queue in case there are multiple queues

    /**
    * Functionality for pulling Salesforce objects into WordPress
    *
    * @param array $loggedin
    * @param array $text_domain
    * @throws \Exception
    */
    public function __construct( $wpdb, $version, $login_credentials, $text_domain, $salesforce, $mappings ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->login_credentials = $login_credentials;
        $this->text_domain = $text_domain; 
        $this->salesforce = $salesforce;
        $this->mappings = $mappings;
        $this->salesforce_pull_queue = 'salesforce_pull';

        add_action( 'wp_ajax_salesforce_pull_webhook', array( $this, 'salesforce_pull_webhook' ) );

    }

	/**
	* Webhook callback for salesforce pull. Returns status of 200 for successful
	* attempt or 403 for a failed pull attempt (SF not authorized, threshhold
	* reached, etc.
	*/
    public function salesforce_pull_webhook() {
    	if ( $this->salesforce_pull() ) {
    		$code = '200';	
    	} else {
    		$code = '403';
    	}

		// Queue is populated, but not processed yet so we manually do some of what
		// drupal_cron_run() does to trigger processing of our pull queue.
		$queues = $this->salesforce_cron_queue_info();
		$info = $queues[$this->salesforce_pull_queue];
		$callback = $info['worker callback'];
		$end = time() + ( isset( $info['time'] ) ? $info['time'] : 15 );
		$queue = DrupalQueue::get( $this->salesforce_pull_queue );

		while ( time() < $end && ( $item = $queue->claimItem() ) ) {
			try {
				call_user_func( $callback, $item->data );
				$queue->deleteItem( $item );
			}
			catch ( Exception $e ) {
				// In case of exception log it and leave the item in the queue
				// to be processed again later.
				watchdog_exception( 'salesforce_pull', $e );
			}
		}

    	http_response_code( $code );
    	exit();
    }

	function salesforce_cron_queue_info() {
		$queues[$this->salesforce_pull_queue] = array(
			'worker callback' => 'salesforce_pull_process_records',
			// Set to a high max timeout in case pulling in lots of data from SF.
			'time' => 180,
		);
		return $queues;
	}

	/**
	* Process records in the queue.
	*/
	function salesforce_pull_process_records($sf_object) {
		// Get Mapping.
		$mapping_conditions = array(
			'salesforce_object_type' => $sf_object['attributes']['type'],
		);
		if ( isset($sf_object['RecordTypeId'] ) && $sf_object['RecordTypeId'] != SALESFORCE_MAPPING_DEFAULT_RECORD_TYPE ) {
				$mapping_conditions['salesforce_record_type'] = $sf_object['RecordTypeId'];
		}

		// array should contain the type of object and the type of record that the object has
		$sf_mappings = salesforce_mapping_load_multiple($mapping_conditions);

		foreach ($sf_mappings as $sf_mapping) {
			// Mapping object exists?
			$mapping_object = salesforce_mapping_object_load_by_sfid($sf_object['Id']);
			$exists = $mapping_object ? TRUE : FALSE;
			if ( $exists && ( $sf_mapping->sync_triggers & SALESFORCE_MAPPING_SYNC_SF_UPDATE ) ) {
	  			try {
	    			$entity = entity_load_single( $mapping_object->entity_type, $mapping_object->entity_id );
	    			if ( $entity === FALSE ) {
	    				$exists = FALSE;
						$message = t( 'Unable to update %type entity %label from Salesforce object %sfobjectid. Entity does not exist. Mapping removed, continuing with Create instead Update.',
						array(
							'%type' => $mapping_object->entity_type,
							'%label' => $mapping_object->entity_id,
							'%sfobjectid' => $sf_object['Id'],
						));
						watchdog( 'Salesforce Pull', $message, array(), WATCHDOG_NOTICE );
						salesforce_set_message( $message, 'status', FALSE );
						entity_delete( 'salesforce_mapping_object', $mapping_object->salesforce_mapping_object_id );
			    	} else {
	      				// Flag this entity as having been processed. This does not persist,
	      				// but is used by salesforce_push to avoid duplicate processing.
	      				$entity->salesforce_pull = TRUE;
	      				$entity_updated = isset( $entity->updated ) ? $entity->updated : $mapping_object->entity_updated;

	      				$sf_object_updated = strtotime( $sf_object['LastModifiedDate'] );
	      				if ( $sf_object_updated > $entity_updated ) {
	      					$wrapper = entity_metadata_wrapper( $sf_mapping->drupal_entity_type, $entity );

	      					// Set fields values on the Drupal entity.
	      					salesforce_pull_map_fields( $sf_mapping->field_mappings, $wrapper, $sf_object );

							// Update entity.
							$wrapper->save();

							// Update mapping object.
							$mapping_object->last_sync_message = t( 'Retrieved updates from Salesforce' );
							$mapping_object->last_sync_status = SALESFORCE_MAPPING_STATUS_SUCCESS;
							$mapping_object->entity_updated = $mapping_object->last_sync = time();
							watchdog( 'Salesforce Pull', 'Updated entity %label associated with Salesforce Object ID: %sfid',
							array(
								'%label' => $wrapper->label(),
								'%sfid' => $sf_object['Id'],
							));
	      				}
	      			}
	      		} catch ( Exception $e ) {
	      			$message = t( 'Failed to update entity %label from Salesforce object %sfobjectid. Error: @msg',
					array(
						'%label' => $wrapper->label(),
						'%sfobjectid' => $sf_object['Id'],
						'@msg' => $e->getMessage(),
					));
    				watchdog( 'Salesforce Pull', $message, array(), WATCHDOG_ERROR );
    				salesforce_set_message( $message, 'error', FALSE );
	    			$mapping_object->last_sync_status = SALESFORCE_MAPPING_STATUS_ERROR;
    				$mapping_object->last_sync_message = t( 'Processing failed' );
    				$mapping_object->last_sync = time();
    			}
    		} else {
    			$exists = FALSE;
    		}
    		if ( !$exists && $sf_mapping->sync_triggers & SALESFORCE_MAPPING_SYNC_SF_CREATE ) {
    			try {
    				// Create entity from mapping object and field maps.
    				$entity_info = entity_get_info( $sf_mapping->drupal_entity_type );

    				// Define values to pass to entity_create().
    				$values = array();
    				if ( isset($entity_info['entity keys']['bundle'] ) && !empty( $entity_info['entity keys']['bundle'] ) ) {
    					$values[$entity_info['entity keys']['bundle']] = $sf_mapping->drupal_bundle;
    				} else {
    					// Not all entities will have bundle defined under entity keys,
    					// e.g. the User entity.
    					$values[$sf_mapping->drupal_bundle] = $sf_mapping->drupal_bundle;
    				}

					// See note above about flag.
					$values['salesforce_pull'] = TRUE;

					// Create entity.
					$entity = entity_create( $sf_mapping->drupal_entity_type, $values );

					// Flag this entity as having been processed. This does not persist,
					// but is used by salesforce_push to avoid duplicate processing.
					$entity->salesforce_pull = TRUE;
					$wrapper = entity_metadata_wrapper( $sf_mapping->drupal_entity_type, $entity );

					salesforce_pull_map_fields( $sf_mapping->field_mappings, $wrapper, $sf_object) ;

					$wrapper->save();
					// Update mapping object.
					$last_sync_message = t( 'Retrieved new record from Salesforce' );
					$last_sync_status = SALESFORCE_MAPPING_STATUS_SUCCESS;
					$entity_updated = time();
				} catch ( Exception $e ) {
					$message = $e->getMessage() . ' ' . t( 'Processing failed for entity %label associated with Salesforce Object ID: %sfobjectid',
					array(
						'%label' => $wrapper->label(),
						'%sfobjectid' => $sf_object['Id'],
					));
	    			watchdog( 'Salesforce Pull', $message, array(), WATCHDOG_ERROR );
	    			salesforce_set_message( 'There were failures processing data from Salesforce. Please check the error logs.', 'error', FALSE );
				    $last_sync_status = SALESFORCE_MAPPING_STATUS_ERROR;
				    $last_sync_message = t('Processing failed for new record');
				    $entity_updated = NULL;
				}

				// If no id exists, the insert failed and we cannot create a mapping
				// object. We are left with no choice but to throw an exception.
				list( $entity_id ) = entity_extract_ids( $sf_mapping->drupal_entity_type, $entity );
				if ( !$entity_id ) {
					$sf_object_id = $sf_object['Id'];
					throw new Exception( 'Failed to create Drupal entity when processing data from Salesforce object: ' . $sf_object_id );
				}

				// Create mapping object.
				$mapping_object = entity_create( 'salesforce_mapping_object', array(
					'salesforce_id' => $sf_object['Id'],
					'entity_type' => $sf_mapping->drupal_entity_type,
					'entity_id' => $entity_id,
					'entity_updated' => $entity_updated,
					'last_sync' => time(),
					'last_sync_message' => $last_sync_message,
					'last_sync_status' => $last_sync_status,
				) );

				watchdog( 'Salesforce Pull',
					'Created entity %label associated with Salesforce Object ID: %sfid',
					array(
						'%label' => $wrapper->label(),
				'%sfid' => $sf_object['Id'],
				) );
			}

			// Save our mapped objects.
			if ( $mapping_object ) {
				$mapping_object->last_sync_action = 'pull';
				$mapping_object->save();
			}
		}
	}

}