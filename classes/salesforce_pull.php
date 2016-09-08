<?php

class Salesforce_Pull {

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
	* Functionality for pulling Salesforce objects into WordPress
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

		$this->schedule_name = 'salesforce_pull';
		$this->schedule = $this->schedule();
		$this->add_actions();

	}

	/**
	* Create the action hooks based on what object maps exist from the admin settings
	*
	*/
	private function add_actions() {
		$db_version = get_option( 'salesforce_rest_api_db_version', FALSE );
		add_action( 'wp_ajax_salesforce_pull_webhook', array( $this, 'salesforce_pull_webhook' ) );
	}

	/**
	* Ajax callback for salesforce pull. Returns status of 200 for successful
	* attempt or 403 for a failed pull attempt (SF not authorized, threshhold
	* reached, etc.
	*/
	function salesforce_pull_webhook() {
		if ( $this->salesforce_pull() === TRUE) {
			$code = '200';
			// Queue is populated, but not processed yet so we manually do some of what
			// drupal_cron_run() does to trigger processing of our pull queue.
			$queues = salesforce_cron_queue_info();
			$info = $queues[SALESFORCE_PULL_QUEUE];
			$callback = $info['worker callback'];
			$end = time() + (isset($info['time']) ? $info['time'] : 15);
			$queue = DrupalQueue::get(SALESFORCE_PULL_QUEUE);
			while (time() < $end && ($item = $queue->claimItem())) {
		  		try {
					call_user_func($callback, $item->data);
					$queue->deleteItem($item);
		  		}
		  		catch (Exception $e) {
					// In case of exception log it and leave the item in the queue
					// to be processed again later.
					watchdog_exception('salesforce_pull', $e);
		  		}
			}
		} else {
			$code = '403';
		}

		if ( !empty( $_POST ) ) {
            wp_send_json_success( $code );
        } else {
            return $code;
        }

	}

	/**
	* Implements hook_cron().
	* we probably don't need this method; we did not use it in salesforce_push
	*/
	function salesforce_pull_cron() {
		salesforce_pull();
	}

	/**
	* Callback for the standard pull process used by webhooks and cron.
	*/
	function salesforce_pull() {
		$sfapi = $this->salesforce['sfapi'];

		if ( $this->salesforce['is_authorized'] !== TRUE && $this->check_throttle() ) {
			$this->salesforce_pull_get_updated_records();
			$this->salesforce_pull_process_deleted_records();

			// Store this request time for the throttle check.
			update_option( 'salesforce_api_pull_last_sync', REQUEST_TIME );
			
			return TRUE;

		} else {
			// No pull happened.
			return FALSE;
		}
	}

	/**
	* Implements hook_form_FORM_ID_alter().
	*/
	function salesforce_pull_form_salesforce_settings_form_alter(&$form, &$form_state, $form_id) {

	$webhooks_enabled = variable_get('salesforce_pull_webhook_enable', FALSE);
	$form['salesforce_pull_webhook_enable'] = array(
	'#type' => 'checkbox',
	'#title' => t('Enable webhooks'),
	'#description' => t('Allow external applications to trigger Salesforce sync with a web request.'),
	'#default_value' => $webhooks_enabled,
	);

	$webhook_key = variable_get('salesforce_pull_webhook_key', drupal_random_key());
	$url = url('salesforce/webhook/pull', array(
	'query' => array('key' => $webhook_key),
	'absolute' => TRUE
	));

	$form['salesforce_pull_webhook_key'] = array(
	'#type' => 'textfield',
	'#title' => t('Webhook key'),
	'#description' => t('A secret key that is required in the webhook request url (@url).<br>
	  Leave blank to auto-generate a new random key.', array('@url' => $url)),
	'#default_value' => $webhook_key,
	'#states' => array(
	  // Only show this field when the 'webhook_enable' checkbox is enabled.
	  'visible' => array(
		':input[name="salesforce_pull_webhook_enable"]' => array('checked' => TRUE),
	  ),
	),
	'#element_validate' => array('salesforce_pull_webhook_key_validate'),
	);
	}

	/**
	* Element validation callback for the webhook key.
	*/
	function salesforce_pull_webhook_key_validate($element, &$form_state, $form) {
	// If there is no key set, generate a default key.
	if (empty($element['#value'])) {
	form_set_value($form['salesforce_pull_webhook_key'], drupal_random_key(), $form_state);
	}
	}

	/**
	* Determines if the Salesforce pull should be allowed, or throttled.
	*
	* Prevents too many pull processes from running at once.
	*
	* @return bool
	*    Returns false if the time elapsed between recent pulls is too short.
	*/
	function check_throttle() {
		$pull_throttle = get_option( 'salesforce_api_pull_throttle', 5 );
		$last_sync = variable_get('salesforce_api_pull_last_sync', 0);

		if ( REQUEST_TIME > $last_sync + $pull_throttle ) {
			return TRUE;
		} else {
			return FALSE;
		}
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
	if ($queue->numberOfItems() > variable_get('salesforce_pull_max_queue_size', 100000)) {
	return;
	}

	$sfapi = salesforce_get_api();
	foreach (salesforce_mapping_get_mapped_objects() as $type) {
	$mapped_fields = array();
	$mapped_record_types = array();

	// Iterate over each field mapping to determine our query parameters.
	foreach (salesforce_mapping_load_multiple(array('salesforce_object_type' => $type)) as $mapping) {
	  foreach ($mapping->field_mappings as $field_map) {
		// Exclude field mappings that are only drupal to SF.
		if (in_array($field_map['direction'], array(
		  SALESFORCE_MAPPING_DIRECTION_SYNC,
		  SALESFORCE_MAPPING_DIRECTION_SF_DRUPAL
		))) {
		  // Some field map types (Relation) store a collection of SF objects.
		  if (is_array($field_map['salesforce_field']) && !isset($field_map['salesforce_field']['name'])) {
			foreach ($field_map['salesforce_field'] as $sf_field) {
			  $mapped_fields[$sf_field['name']] = $sf_field['name'];
			}
		  }
		  // The rest of are just a name/value pair.
		  else {
			$mapped_fields[$field_map['salesforce_field']['name']] = $field_map['salesforce_field']['name'];
		  }
		}
	  }

	  if (!empty($mapped_fields) && $mapping->salesforce_record_type_default != SALESFORCE_MAPPING_DEFAULT_RECORD_TYPE) {
		foreach ($mapping->salesforce_record_types_allowed as $record_type) {
		  if ($record_type) {
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
	if (empty($mapped_fields)) {
	  continue;
	}

	$soql = new SalesforceSelectQuery($type);
	// Convert field mappings to SOQL.
	$soql->fields = array_merge($mapped_fields, array(
	  'Id' => 'Id',
	  $mapping->pull_trigger_date => $mapping->pull_trigger_date
	));

	// If no lastupdate, get all records, else get records since last pull.
	$sf_last_sync = variable_get('salesforce_pull_last_sync_' . $type, NULL);
	if ($sf_last_sync) {
	  $last_sync = gmdate('Y-m-d\TH:i:s\Z', $sf_last_sync);
	  $soql->addCondition($mapping->pull_trigger_date, $last_sync, '>');
	}

	// If Record Type is specified, restrict query.
	if (count($mapped_record_types) > 0) {
	  $soql->addCondition('RecordTypeId', $mapped_record_types, 'IN');
	}

	// Execute query.
	$results = $sfapi->query($soql);
	$version_path = parse_url($sfapi->getApiEndPoint(), PHP_URL_PATH);

	if (!isset($results['errorCode'])) {
	  // Write items to the queue.
	  foreach ($results['records'] as $result) {
		$queue->createItem($result);
	  }

	  // Handle requests larger than the batch limit (usually 2000).
	  $next_records_url = isset($results['nextRecordsUrl']) ?
		str_replace($version_path, '', $results['nextRecordsUrl']) :
		FALSE;
	  while ($next_records_url) {
		$new_result = $sfapi->apiCall($next_records_url);
		if (!isset($new_result['errorCode'])) {
		  // Write items to the queue.
		  foreach ($new_result['records'] as $result) {
			$queue->createItem($result);
		  }
		}
		$next_records_url = isset($new_result['nextRecordsUrl']) ?
		  str_replace($version_path, '', $new_result['nextRecordsUrl']) : FALSE;
	  }

	  variable_set('salesforce_pull_last_sync_' . $type, REQUEST_TIME);
	}
	else {
	  watchdog('Salesforce Pull', $results['errorCode'] . ':' . $results['message'], array(), WATCHDOG_ERROR);
	}
	}
	}

	/**
	* Process records in the queue.
	*/
	function salesforce_pull_process_records($sf_object) {
	// Get Mapping.
	$mapping_conditions = array(
	'salesforce_object_type' => $sf_object['attributes']['type'],
	);
	if (isset($sf_object['RecordTypeId']) && $sf_object['RecordTypeId'] != SALESFORCE_MAPPING_DEFAULT_RECORD_TYPE) {
	$mapping_conditions['salesforce_record_type'] = $sf_object['RecordTypeId'];
	}

	$sf_mappings = salesforce_mapping_load_multiple($mapping_conditions);

	$hold_exceptions = count($sf_mappings) > 1;
	$exception = FALSE;
	foreach ($sf_mappings as $sf_mapping) {
	// Mapping object exists?
	$mapping_object = salesforce_mapping_object_load_by_sfid($sf_object['Id']);
	// Allow other modules to define or alter the mapping object.
	drupal_alter('salesforce_pull_mapping_object', $mapping_object, $sf_object, $sf_mapping);
	$exists = $mapping_object ? TRUE : FALSE;
	if ($exists && ($sf_mapping->sync_triggers & SALESFORCE_MAPPING_SYNC_SF_UPDATE)) {
	  try {
		$entity = entity_load_single($mapping_object->entity_type, $mapping_object->entity_id);
		if ($entity === FALSE) {
		  $exists = FALSE;
		  $message = t('Unable to update %type entity %label from Salesforce object %sfobjectid. Entity does not exist. Mapping removed, continuing with Create instead Update.',
			array(
			  '%type' => $mapping_object->entity_type,
			  '%label' => $mapping_object->entity_id,
			  '%sfobjectid' => $sf_object['Id'],
			));
		  watchdog('Salesforce Pull', $message, array(), WATCHDOG_NOTICE);
		  salesforce_set_message($message, 'status', FALSE);
		  entity_delete('salesforce_mapping_object', $mapping_object->salesforce_mapping_object_id);
		}
		else {
		  // Flag this entity as having been processed. This does not persist,
		  // but is used by salesforce_push to avoid duplicate processing.
		  $entity->salesforce_pull = TRUE;
		  $entity_updated = isset($entity->updated) ? $entity->updated : $mapping_object->entity_updated;

		  $sf_object_updated = strtotime($sf_object[$sf_mapping->pull_trigger_date]);
		  if ($sf_object_updated > $entity_updated) {
			$wrapper = entity_metadata_wrapper($sf_mapping->drupal_entity_type, $entity);

			// Set fields values on the Drupal entity.
			salesforce_pull_map_fields($sf_mapping->field_mappings, $wrapper, $sf_object);

			// Allow modules to react just prior to entity save.
			module_invoke_all('salesforce_pull_entity_presave', $wrapper->value(), $sf_object, $sf_mapping);

			// Update entity.
			$wrapper->save();

			// Allow modules to react to entity update.
			module_invoke_all('salesforce_pull_entity_update', $wrapper->value(), $sf_object, $sf_mapping);

			// Update mapping object.
			$mapping_object->last_sync_message = t('Retrieved updates from Salesforce');
			$mapping_object->last_sync_status = SALESFORCE_MAPPING_STATUS_SUCCESS;
			$mapping_object->entity_updated = $mapping_object->last_sync = time();
			watchdog('Salesforce Pull',
			  'Updated entity %label associated with Salesforce Object ID: %sfid',
			  array(
				'%label' => $wrapper->label(),
				'%sfid' => $sf_object['Id'],
			  )
			);
		  }
		}
	  } catch (Exception $e) {
		$message = t('Failed to update entity %label %id from Salesforce object %sfobjectid. Error: @msg',
		  array(
			'%label' => $mapping_object->entity_type,
			'%id' => $mapping_object->entity_id,
			'%sfobjectid' => $sf_object['Id'],
			'@msg' => $e->getMessage(),
		  )
		);
		watchdog('Salesforce Pull', $message, array(), WATCHDOG_ERROR);
		salesforce_set_message($message, 'error', FALSE);
		$mapping_object->last_sync_status = SALESFORCE_MAPPING_STATUS_ERROR;
		$mapping_object->last_sync_message = t('Processing failed');
		$mapping_object->last_sync = time();
		if (!$hold_exceptions) {
		  throw $e;
		}
		if (empty($exception)) {
		  $exception = $e;
		}
		else {
		  $my_class = get_class($e);
		  $exception = new $my_class($e->getMessage(), $e->getCode(), $exception);
		}
	  }
	}
	else {
	  $exists = FALSE;
	}
	if (!$exists && $sf_mapping->sync_triggers & SALESFORCE_MAPPING_SYNC_SF_CREATE) {
	  try {
		// Create entity from mapping object and field maps.
		$entity_info = entity_get_info($sf_mapping->drupal_entity_type);

		// Define values to pass to entity_create().
		$values = array();
		if (isset($entity_info['entity keys']['bundle']) &&
		  !empty($entity_info['entity keys']['bundle'])
		) {
		  $values[$entity_info['entity keys']['bundle']] = $sf_mapping->drupal_bundle;

		  // Because creating term via entities actually needs vid and won't be
		  // fixed in Entity API (https://www.drupal.org/node/1409256).
		  if (isset($values['vocabulary_machine_name'])) {
			$vocabulary = taxonomy_vocabulary_machine_name_load($values['vocabulary_machine_name']);
			$values['vid'] = $vocabulary->vid;
		  }
		}
		else {
		  // Not all entities will have bundle defined under entity keys,
		  // e.g. the User entity.
		  $values[$sf_mapping->drupal_bundle] = $sf_mapping->drupal_bundle;
		}

		// See note above about flag.
		$values['salesforce_pull'] = TRUE;

		// Create entity.
		$entity = entity_create($sf_mapping->drupal_entity_type, $values);

		// Flag this entity as having been processed. This does not persist,
		// but is used by salesforce_push to avoid duplicate processing.
		$entity->salesforce_pull = TRUE;
		$wrapper = entity_metadata_wrapper($sf_mapping->drupal_entity_type, $entity);

		salesforce_pull_map_fields($sf_mapping->field_mappings, $wrapper, $sf_object);

		// Allow modules to react just prior to entity save.
		module_invoke_all('salesforce_pull_entity_presave', $wrapper->value(), $sf_object, $sf_mapping);

		$wrapper->save();

		// Allow modules to react to entity creation.
		module_invoke_all('salesforce_pull_entity_insert', $wrapper->value(), $sf_object, $sf_mapping);

		// Update mapping object.
		$last_sync_message = t('Retrieved new record from Salesforce');
		$last_sync_status = SALESFORCE_MAPPING_STATUS_SUCCESS;
		$entity_updated = time();
	  } catch (Exception $e) {
		$message = $e->getMessage() . ' ' . t('Processing failed for entity %label associated with Salesforce Object ID: %sfobjectid',
			array(
			  '%label' => $wrapper->label(),
			  '%sfobjectid' => $sf_object['Id'],
			)
		  );
		watchdog('Salesforce Pull', $message, array(), WATCHDOG_ERROR);
		salesforce_set_message('There were failures processing data from Salesforce. Please check the error logs.', 'error', FALSE);
		$last_sync_status = SALESFORCE_MAPPING_STATUS_ERROR;
		$last_sync_message = t('Processing failed for new record');
		$entity_updated = NULL;
		if (!$hold_exceptions) {
		  throw $e;
		}
		if (empty($exception)) {
		  $exception = $e;
		}
		else {
		  $my_class = get_class($e);
		  $exception = new $my_class($e->getMessage(), $e->getCode(), $exception);
		}
	  }

	  // If no id exists, the insert failed and we cannot create a mapping
	  // object. We are left with no choice but to throw an exception.
	  list($entity_id) = entity_extract_ids($sf_mapping->drupal_entity_type, $entity);
	  if (!$entity_id) {
		$sf_object_id = $sf_object['Id'];
		throw new Exception("Failed to create Drupal entity when processing data from Salesforce object: $sf_object_id.");
	  }

	  // Create mapping object.
	  $mapping_object = entity_create('salesforce_mapping_object', array(
		'salesforce_id' => $sf_object['Id'],
		'entity_type' => $sf_mapping->drupal_entity_type,
		'entity_id' => $entity_id,
		'entity_updated' => $entity_updated,
		'last_sync' => time(),
		'last_sync_message' => $last_sync_message,
		'last_sync_status' => $last_sync_status,
	  ));

	  watchdog('Salesforce Pull',
		'Created entity %label associated with Salesforce Object ID: %sfid',
		array(
		  '%label' => $wrapper->label(),
		  '%sfid' => $sf_object['Id'],
		)
	  );

	}

	// Save our mapped objects.
	if ($mapping_object) {
	  $mapping_object->last_sync_action = 'pull';
	  $mapping_object->save();
	}
	}
	if (!empty($exception)) {
	throw $exception;
	}
	}

	/**
	* Process deleted records from salesforce.
	*/
	function salesforce_pull_process_deleted_records() {
	// Calculate which client to use. We default to the REST client but also
	// support SOAP if enabled. Note that deletions can only be queried via REST
	// with an API version >= 29.0.
	$sfapi = salesforce_get_api();
	$client = $sfapi;
	if (class_exists('SalesforceSoapPartner')) {
	$client = new SalesforceSoapPartner($sfapi, variable_get('salesforce_partner_wsdl', libraries_get_path('salesforce') . '/soapclient/partner.wsdl.xml'));
	}

	// Load all unique SF record types that we have mappings for.
	foreach (array_reverse(salesforce_mapping_get_mapped_objects()) as $type) {
	$last_delete_sync = variable_get('salesforce_pull_delete_last_' . $type, REQUEST_TIME);
	variable_set('salesforce_pull_delete_last_' . $type, REQUEST_TIME);

	$now = time();

	// getDeleted() constraint: startDate cannot be more than 30 days ago
	// (using an incompatible data may lead to exceptions).
	$last_delete_sync = $last_delete_sync > REQUEST_TIME - 2505600 ? $last_delete_sync : REQUEST_TIME - 2505600;

	// getDeleted() constraint: startDate must be at least one minute greater
	// than endDate.
	$now = $now > $last_delete_sync + 60 ? $now : $now + 60;
	$last_delete_sync_sf = gmdate('Y-m-d\TH:i:s\Z', $last_delete_sync);
	$now_sf = gmdate('Y-m-d\TH:i:s\Z', $now);

	// SOAP getDeleted() returns an object while the REST getDeleted() returns
	// an array, so cast all checked values to an object to avoid additional
	// conditional logic.
	$deleted = (object) $client->getDeleted($type, $last_delete_sync_sf, $now_sf);
	if (empty($deleted->deletedRecords)) {
	  continue;
	}
	foreach ($deleted->deletedRecords as $record) {
	  $record = (object) $record;
	  $mapping_object = salesforce_mapping_object_load_by_sfid($record->id);
	  if (!$mapping_object) {
		continue;
	  }

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
		if (!empty($sf_mapping) && ($sf_mapping->sync_triggers & SALESFORCE_MAPPING_SYNC_SF_DELETE)) {
		  // Prevent processing by salesforce_push. We hate circular logic.
		  $entity->salesforce_pull = TRUE;

		  // Delete the mapped Drupal entity. Catch any exceptions as
		  // we want to ensure the mapping object is deleted even in
		  // case of an error.
		  try {
			$entity_wrapper->delete();
		  }
		  catch (Exception $e) {
			watchdog_exception('salesforce_pull', $e);
		  }

		  watchdog('Salesforce Pull',
			'Deleted entity %label with ID: %id associated with Salesforce Object ID: %sfid',
			array(
			  '%label' => $entity_wrapper->label(),
			  '%id' => $mapping_object->entity_id,
			  '%sfid' => $record->id,
			)
		  );
		}
	  }

	  // Delete mapping object.
	  $mapping_object->delete();
	}
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
	$types = salesforce_mapping_get_fieldmap_types();

	foreach ($field_maps as $field_map) {

	$fieldmap_type = $field_map['drupal_field']['fieldmap_type'];
	if (!isset($types[$fieldmap_type]['pull_value_callback'])
	  || !in_array($field_map['direction'], array('sync', 'sf_drupal'))
	  || !function_exists($types[$fieldmap_type]['pull_value_callback'])
	) {
	  continue;
	}

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
	  try {
		if ($parent instanceof EntityListWrapper && !is_array($value)) {
		  $parent->offsetSet(0, $value);
		}
		else {
		  $parent->set($value);
		}
	  }
	  catch (Exception $e) {
		$message = t('Exception during pull for @sfobj.@sffield @sfid to @dobj.@dprop @did with value @v: @e', array(
		  '@sfobj' => $sf_object['attributes']['type'],
		  '@sffield' =>  $field_map['salesforce_field']['name'],
		  '@sfid' => $sf_object['Id'],
		  '@dobj' => $entity_wrapper->type(),
		  '@dprop' => $field_map['drupal_field']['fieldmap_value'],
		  '@did' => $entity_wrapper->getIdentifier(),
		  '@v' => $value,
		  '@e' => $e->getMessage()));
		throw new Exception($message, $e->getCode(), $e);
	  }
	}
	}

}