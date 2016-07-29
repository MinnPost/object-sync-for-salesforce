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
    * @param object $wpdb
    * @param string $version
    * @param array $login_credentials
    * @param string $text_domain
    * @param object $salesforce
    * @param object $mappings
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
		$info = $queues[$this->salesforce_pull_queue]; // queues is an array; key is the name of the queue and lets us get the callback method and timer
		$callback = $info['worker callback']; // this is the callback method
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
				error_log( $e );
			}
		}

    	http_response_code( $code );
    	exit();
    }

	/**
	* Callback for the standard pull process used by webhooks and cron.
	*/
	function salesforce_pull() {
		$sfapi = $this->salesforce;
		if ( $sfapi['is_authorized'] === true && $this->salesforce_pull_check_throttle() ) {
			$this->salesforce_pull_get_updated_records();
			$this->salesforce_pull_process_deleted_records();

			// Store this request time for the throttle check.
			update_option( 'salesforce_pull_last_sync', $_SERVER['REQUEST_TIME'] );

			return TRUE;
		}

		// No pull happened.
		return FALSE;
	}

	function salesforce_cron_queue_info() {
		// queue key specified in class properties
		$queues[$this->salesforce_pull_queue] = array(
			'worker callback' => array( &$this, 'salesforce_pull_process_records' ),
			// Set to a high max timeout in case pulling in lots of data from SF.
			'time' => 180,
		); // this sets an array for the specified queue, configuring the timeout and the callback method
		return $queues;
	}

	/**
	* Determines if the Salesforce pull should be allowed, or throttled.
	*
	* Prevents too many pull processes from running at once.
	*
	* @return bool
	*    Returns false if the time elapsed between recent pulls is too short.
	*/
	function salesforce_pull_check_throttle() {
		$pull_throttle = get_option( 'salesforce_pull_throttle', 5 );
		$last_sync = get_option( 'salesforce_pull_last_sync', 0 );

		if ( $_SERVER['REQUEST_TIME'] > $last_sync + $pull_throttle ) {
			return TRUE;
		}

		return FALSE;
	}


	/**
	* Pull updated records from Salesforce and place them in the queue.
	*
	* Executes a SOQL query based on defined mappings, loops through the results,
	* and places each updated SF object into the queue for later processing.
	*/
	function salesforce_pull_get_updated_records() {
		$queue = DrupalQueue::get(SALESFORCE_PULL_QUEUE);

		// Avoid overloading the processing queue and pass this time around if it's
		// over a configurable limit.
		if ( $queue->numberOfItems() > get_option( 'salesforce_pull_max_queue_size', 100000 ) ) {
			return;
		}

		$sfapi = $this->salesforce;
		foreach ( salesforce_mapping_get_mapped_objects() as $type ) {
			$mapped_fields = array();
			$mapped_record_types = array();

			// Iterate over each field mapping to determine our query parameters.
			foreach ( salesforce_mapping_load_multiple( array( 'salesforce_object_type' => $type ) ) as $mapping ) {
	  			foreach ( $mapping->field_mappings as $field_map ) {
	    			// Exclude field mappings that are only drupal to SF.
	    			if ( in_array( $field_map['direction'], array(
	    				$mappings->direction_sync,
	    				$mappings->direction_sf_wordpress
	    			) ) ) {
						// Some field map types (Relation) store a collection of SF objects.
	      				if ( is_array( $field_map['salesforce_field'] ) && !isset( $field_map['salesforce_field']['name'] ) ) {
	        				foreach ( $field_map['salesforce_field'] as $sf_field ) {
	          					$mapped_fields[$sf_field['name']] = $sf_field['name'];
	        				}
	      				} else { // The rest of are just a name/value pair.
	        				$mapped_fields[$field_map['salesforce_field']['name']] = $field_map['salesforce_field']['name'];
	      				}
	    			}
	  			}

	  			if ( !empty($mapped_fields ) && $mapping->salesforce_record_type_default != $mappings->default_record_type ) {
	    			foreach ( $mapping->salesforce_record_types_allowed as $record_type ) {
						if ( $record_type ) {
							$mapped_record_types[$record_type] = $record_type;
						}
	    			}
	    			// Add the RecordTypeId field so we can use it when processing the
	    			// queued SF objects.
	    			$mapped_fields['RecordTypeId'] = 'RecordTypeId';
	  			}
			}

			// There are no field mappings configured to pull data from Salesforce so
			// move on to the next mapped object. Prevents querying unmapped data.
			if ( empty( $mapped_fields ) ) {
				continue;
			}

			$soql = new SalesforceSelectQuery( $type );
			// Convert field mappings to SOQL.
			$soql->fields = array_merge( $mapped_fields, array(
	  			'Id' => 'Id',
	  			'LastModifiedDate' => 'LastModifiedDate'
			) );

			// If no lastupdate, get all records, else get records since last pull.
			$sf_last_sync = get_option( 'salesforce_pull_last_sync_' . $type, NULL );
			if ( $sf_last_sync ) {
				$last_sync = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );
				$soql->addCondition( $mapping->pull_trigger_date, $last_sync, '>' );
			}

			// If Record Type is specified, restrict query.
			if ( count( $mapped_record_types) > 0 ) {
				$soql->addCondition( 'RecordTypeId', $mapped_record_types, 'IN' );
			}

			// Execute query.
			$results = $sfapi->query( $soql );
			$version_path = parse_url( $sfapi->getApiEndPoint(), PHP_URL_PATH );

			if ( !isset( $results['errorCode'] ) ) {
				// Write items to the queue.
				foreach ( $results['records'] as $result ) {
					$queue->createItem( $result );
				}
				// Handle requests larger than the batch limit (usually 2000).
	  			$next_records_url = isset( $results['nextRecordsUrl'] ) ? str_replace( $version_path, '', $results['nextRecordsUrl'] ) : FALSE;
				while ( $next_records_url ) {
					$new_result = $sfapi->apiCall( $next_records_url );
					if ( !isset( $new_result['errorCode'] ) ) {
						// Write items to the queue.
						foreach ( $new_result['records'] as $result ) {
							$queue->createItem( $result );
						}
					}
					$next_records_url = isset( $new_result['nextRecordsUrl'] ) ? str_replace( $version_path, '', $new_result['nextRecordsUrl'] ) : FALSE;
				}

	  			update_option( 'salesforce_pull_last_sync_' . $type, $_SERVER['REQUEST_TIME'] );
			} else {
	  			error_log( 'Salesforce Pull' . $results['errorCode'] . ':' . $results['message'] );
			}
		}
	}


	/**
	* Process records in the queue.
	*/
	function salesforce_pull_process_records( $sf_object ) {
		// Get Mapping.
		$mapping_conditions = array(
			'salesforce_object_type' => $sf_object['attributes']['type'],
		);
		if ( isset($sf_object['RecordTypeId'] ) && $sf_object['RecordTypeId'] != $mappings->default_record_type ) {
				$mapping_conditions['salesforce_record_type'] = $sf_object['RecordTypeId'];
		}

		// array should contain the type of object and the type of record that the object has
		$sf_mappings = salesforce_mapping_load_multiple($mapping_conditions);

		foreach ($sf_mappings as $sf_mapping) {
			// Mapping object exists?
			$mapping_object = salesforce_mapping_object_load_by_sfid($sf_object['Id']);
			$exists = $mapping_object ? TRUE : FALSE;
			if ( $exists && ( $sf_mapping->sync_triggers & $mappings->sync_sf_update ) ) {
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
						error_log( 'Salesforce Pull' . $message );
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
	      					$this->salesforce_pull_map_fields( $sf_mapping->field_mappings, $wrapper, $sf_object );

							// Update entity.
							$wrapper->save();

							// Update mapping object.
							$mapping_object->last_sync_message = t( 'Retrieved updates from Salesforce' );
							$mapping_object->last_sync_status = $mappings->status_success;
							$mapping_object->entity_updated = $mapping_object->last_sync = time();

							error_log( 'Salesforce Pull ' . 'Updated entity ' . $wrapper->label() . ' associated with Salesforce Object ID: ' . $sf_object['Id'] );

	      				}
	      			}
	      		} catch ( Exception $e ) {
	      			$message = t( 'Failed to update entity %label from Salesforce object %sfobjectid. Error: @msg',
					array(
						'%label' => $wrapper->label(),
						'%sfobjectid' => $sf_object['Id'],
						'@msg' => $e->getMessage(),
					));
    				error_log( 'Salesforce Pull' . $message);
    				salesforce_set_message( $message, 'error', FALSE );
	    			$mapping_object->last_sync_status = $mappings->status_error;
    				$mapping_object->last_sync_message = t( 'Processing failed' );
    				$mapping_object->last_sync = time();
    			}
    		} else {
    			$exists = FALSE;
    		}
    		if ( !$exists && $sf_mapping->sync_triggers & $mappings->sync_sf_create ) {
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

					$this->salesforce_pull_map_fields( $sf_mapping->field_mappings, $wrapper, $sf_object) ;

					$wrapper->save();
					// Update mapping object.
					$last_sync_message = t( 'Retrieved new record from Salesforce' );
					$last_sync_status = $mappings->status_success;
					$entity_updated = time();
				} catch ( Exception $e ) {
					$message = $e->getMessage() . ' ' . t( 'Processing failed for entity %label associated with Salesforce Object ID: %sfobjectid',
					array(
						'%label' => $wrapper->label(),
						'%sfobjectid' => $sf_object['Id'],
					));
	    			error_log( 'Salesforce Pull' . $message );
	    			salesforce_set_message( 'There were failures processing data from Salesforce. Please check the error logs.', 'error', FALSE );
				    $last_sync_status = $mappings->status_error;
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

				error_log( 'Salesforce Pull ' . 'Created entity ' . $wrapper->label() . ' associated with Salesforce Object ID: ' . $sf_object['Id'] );

			}

			// Save our mapped objects.
			if ( $mapping_object ) {
				$mapping_object->last_sync_action = 'pull';
				$mapping_object->save();
			}
		}
	}

	/**
	 * Process deleted records from salesforce.
	 */
	function salesforce_pull_process_deleted_records() {
	  // Only the SOAP API supports getting deleted records.
	  if (!class_exists('Salesforce_Soap')) {
	    salesforce_set_message('Enable Salesforce SOAP to process deleted records');
	    return;
	  }
	  $sfapi = $this->salesforce;
	  $soap = new Salesforce_Soap($sfapi);

	  // Load all unique SF record types that we have mappings for.
	  foreach (array_reverse(salesforce_mapping_get_mapped_objects()) as $type) {
	    $last_delete_sync = get_option( 'salesforce_pull_delete_last_' . $type, $_SERVER['REQUEST_TIME'] );
	    $now = time();

	    // SOAP getDeleted() restraint: startDate must be at least one minute
	    // greater than endDate.
	    $now = $now > $last_delete_sync + 60 ? $now : $now + 60;
	    $last_delete_sync_sf = gmdate('Y-m-d\TH:i:s\Z', $last_delete_sync);
	    $now_sf = gmdate('Y-m-d\TH:i:s\Z', $now);
	    $deleted = $soap->getDeleted($type, $last_delete_sync_sf, $now_sf);
	    if (!empty($deleted->deletedRecords)) {
	      foreach ($deleted->deletedRecords as $record) {
	        $mapping_object = salesforce_mapping_object_load_by_sfid($record->id);
	        if ($mapping_object) {
	          // Load and wrap the Drupal entity linked to the SF object.
	          $entity = entity_load_single($mapping_object->entity_type, $mapping_object->entity_id);
	          // Check if entity exists before processing delete.
	          if ($entity) {
	            $entity_wrapper = entity_metadata_wrapper($mapping_object->entity_type, $entity);

	            // Load the mapping that manages these mapped objects.
	            $sf_mapping = reset(salesforce_mapping_load_multiple(
	              array(
	                'salesforce_object_type' => $type,
	                'drupal_entity_type' => $entity_wrapper->type(),
	                'drupal_bundle' => $entity_wrapper->getBundle(),
	              )
	            ));

	            // Only delete the mapped Drupal entity if the
	            // SALESFORCE_MAPPING_SYNC_SF_DELETE flag is set.
	            if (!empty($sf_mapping) && ($sf_mapping->sync_triggers & $mappings->sync_sf_delete)) {
	              // Prevent processing by salesforce_push. We hate circular logic.
	              $entity->salesforce_pull = TRUE;

	              // Delete the mapped Drupal entity. Catch any exceptions as
	              // we want to ensure the mapping object is deleted even in
	              // case of an error.
	              try {
	                $entity_wrapper->delete();
	              } catch (Exception $e) {
	                error_log('salesforce_pull' . $e);
	              }

	              error_log('Salesforce Pull' . 'Deleted entity ' . $entity_wrapper->label() . ' with ID: ' . $mapping_object->entity_id . 'associated with Salesforce Object ID: ' . $record->id);
	            }
	          }


	          // Delete mapping object.
	          $mapping_object->delete();
	        }
	      }
	    }
	    update_option( 'salesforce_pull_delete_last_' . $type, $_SERVER['REQUEST_TIME'] );
	  }
	}

	/**
	 * Map field values.
	 *
	 * @param array $field_maps
	 *   Array of field maps.
	 * @param object $entity_wrapper
	 *   Entity wrapper object.
	 * @param object $sf_object
	 *   sObject of the Salesforce record.
	 */
	function salesforce_pull_map_fields($field_maps, &$entity_wrapper, $sf_object) {
	  foreach ($field_maps as $field_map) {
	    if ($field_map['direction'] == 'sync' || $field_map['direction'] == $mappings->direction_sf_wordpress) {

	      $drupal_fields_array = explode(':', $field_map['drupal_field']['fieldmap_value']);
	      $parent = $entity_wrapper;
	      foreach ($drupal_fields_array as $drupal_field) {
	        if ($parent instanceof EntityListWrapper) {
	          $child_wrapper = $parent->get(0)->{$drupal_field};
	        }
	        else {
	          $child_wrapper = $parent->{$drupal_field};
	        }
	        $parent = $child_wrapper;
	      }
	      $fieldmap_type = salesforce_mapping_get_fieldmap_types($field_map['drupal_field']['fieldmap_type']);
	      $value = call_user_func($fieldmap_type['pull_value_callback'], $parent, $sf_object, $field_map);

	      // Allow this value to be altered before assigning to the entity.
	      drupal_alter('salesforce_pull_entity_value', $value, $field_map, $sf_object);
	      if (isset($value)) {
	        // @TODO: might wrongly assumes an individual value wouldn't be an
	        // array.
	        if ($parent instanceof EntityListWrapper && !is_array($value)) {
	          $parent->offsetSet(0, $value);
	        }
	        else {
	          $parent->set($value);
	        }
	      }
	    }
	  }
	}

}