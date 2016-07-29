<?php

class Salesforce_Push {

    protected $wpdb;
    protected $version;
    protected $login_credentials;
    protected $text_domain;
    protected $salesforce;
    protected $mappings;

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
        $this->salesforce_push_queue = 'salesforce_push';

        $this->add_actions();

    }

    function add_actions() {
        foreach ( $this->mappings->get_all() as $mapping ) {
            $object = $mapping['wordpress_object'];
            if ( $object === 'attachment' ) {
                add_action( 'add_attachment', array( &$this, 'add_attachment' ) );
            } elseif ( $object === 'user' ) {
                add_action( 'user_register', array( &$this, 'add_user' ) );
            } elseif ( $object === 'post' ) {
                add_action( 'save_post', array( &$this, 'add_post' ), 10, 2 );
            } else {
                add_action( 'save_post_' . $object, array( &$this, 'add_post' ), 10, 2 );
            }
        }
    }

    function add_attachment( $post_id ) {
        error_log('add an attachment with id of ' . $post_id);
    }

    function add_user( $user_id ) {
        error_log('add a user with id of ' . $user_id);
    }

    function add_post( $post_id, $post ) {
        if ( isset($post->post_status ) && 'auto-draft' === $post->post_status ) {
            return;
        }
        error_log('add a post with id of ' . $post_id);
    }

    /**
     * Implements hook_entity_insert().
     */
    function salesforce_push_entity_insert($entity, $type) {
      salesforce_push_entity_crud($type, $entity, $mappings->sync_drupal_create);
    }

    /**
     * Implements hook_entity_update().
     */
    function salesforce_push_entity_update($entity, $type) {
      salesforce_push_entity_crud($type, $entity, $mappings->sync_drupal_update);
    }

    /**
     * Implements hook_entity_delete().
     */
    function salesforce_push_entity_delete($entity, $type) {
      salesforce_push_entity_crud($type, $entity, $mappings->sync_drupal_delete);
    }

    /**
     * Push entities to Salesforce.
     *
     * @param string $object_type
     *   Type of WordPress object.
     * @param object $object
     *   The object object.
     * @param int $sf_sync_trigger
     *   The trigger being responded to.
     */
    function salesforce_push_entity_crud($entity_type, $entity, $sf_sync_trigger) {
      // Avoid duplicate processing if this entity has just been updated by
      // Salesforce pull.
      if (isset($entity->salesforce_pull) && $entity->salesforce_pull) {
        return FALSE;
      }

      list($entity_id, , $bundle) = entity_extract_ids($entity_type, $entity);

      $mappings = salesforce_mapping_load_multiple(array(
        'drupal_entity_type' => $entity_type,
        'drupal_bundle' => $bundle,
      ));

      foreach ($mappings as $mapping) {
        if ($mapping->sync_triggers & $sf_sync_trigger) {

          // Allow other modules to prevent a sync per-mapping.
          foreach (module_implements('salesforce_push_entity_allowed') as $module) {
            if (module_invoke($module, 'salesforce_push_entity_allowed', $entity_type, $entity, $sf_sync_trigger, $mapping) === FALSE) {
              continue 2;
            }
          }

          if (isset($mapping->push_async) && $mapping->push_async) {
            $queue = DrupalQueue::get($this->salesforce_push_queue);
            $queue->createItem(array(
              'entity_type' => $entity_type,
              'entity_id' => $entity_id,
              'mapping' => $mapping,
              'trigger' => $sf_sync_trigger,
            ));
            continue;
          }

          salesforce_push_sync_rest($entity_type, $entity, $mapping, $sf_sync_trigger);
        }
      }
    }

    function salesforce_push_form_salesforce_mapping_object_form_alter(&$form, &$form_state) {
      $form['salesforce_id']['#required'] = FALSE;
      $form['actions']['push'] = array(
        '#type' => 'submit',
        '#value' => t('Push'),
        '#submit' => array('salesforce_push_mapping_object_form_submit'),
      );
    }

    function salesforce_push_mapping_object_form_submit($form, &$form_state) {
      $values = $form_state['values'];
      $entity_type = $values['entity_type'];
      $entity_id = $values['entity_id'];
      $entity = entity_load_single($entity_type, $entity_id);
      $trigger = $mappings->sync_drupal_update;
      salesforce_push_entity_crud($entity_type, $entity, $trigger);
      // @TODO we can do better than this:
      // drupal_set_message('Push request submitted. If your mappings are set to push asynchronously, you need to run cron.');
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
    function salesforce_push_sync_rest($entity_type, $entity, $mapping, $sf_sync_trigger) {
      $sfapi = $this->salesforce;

      // Not authorized, we need to bail this time around.
      if (!$sfapi->isAuthorized()) {
        return;
      }

      list($entity_id) = entity_extract_ids($entity_type, $entity);
      $mapping_object = salesforce_mapping_object_load_by_drupal($entity_type, $entity_id, TRUE);

      // Delete SF object.
      if ($sf_sync_trigger == $mappings->sync_wordpress_delete) {
        if ($mapping_object) {
          try {
            $sfapi->objectDelete($mapping->salesforce_object_type, $mapping_object->salesforce_id);
          }
          catch(SalesforceException $e) {
            watchdog_exception('salesforce_push', $e);
            salesforce_set_message($e->getMessage(), 'error');
          }

          salesforce_set_message(t('Salesforce object %sfid has been deleted.', array(
            '%sfid' => $mapping_object->salesforce_id,
          )));
          $mapping_object->delete();
        }
        // No mapped object or object was deleted.
        return;
      }

      // Generate parameter array from field mappings.
      $entity_wrapper = entity_metadata_wrapper($entity_type, $entity);
      $params = salesforce_push_map_params($mapping, $entity_wrapper, $key_field, $key_value, FALSE, !$mapping_object);

      // Entity is not linked to an SF object.
      if (!$mapping_object) {
        // Setup SF record type. CampaignMember objects get their Campaign's type.
        if ($mapping->salesforce_record_type_default != $mappings->default_record_type
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
            'last_sync_status' => $mappings->status_success,
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
      // Existing object link, update.
      else {
        // Handle the case of mapped objects last sync being more recent than
        // the entity's timestamp, which is set by salesforce_mapping.
        if ($mapping_object->last_sync > $mapping_object->entity_updated) {
          return;
        }

        // Update SF object.
        try {
          $sfapi->objectUpdate($mapping->salesforce_object_type, $mapping_object->salesforce_id, $params);
          $mapping_object->last_sync_message = t('Mapping object updated via !function.', array('!function' => __FUNCTION__));
          $mapping_object->last_sync_status = $mappings->status_success;

          salesforce_set_message(t('%name has been synchronized with Salesforce record %sfid.', array(
            '%name' => $entity_wrapper->label(),
            '%sfid' => $mapping_object->salesforce_id,
          )));
        }
        catch(SalesforceException $e) {
          watchdog_exception('salesforce_push', $e);
          salesforce_set_message(t('Error syncing @type @id to Salesforce record @sfid. Error message: "@msg".', array(
            '@type' => $mapping_object->entity_type,
            '@id' => $mapping_object->entity_id,
            '@sfid' => $mapping_object->salesforce_id,
            '@msg' => $e->getMessage(),
          )), 'error');
          $mapping_object->last_sync_message = $e->getMessage();
          $mapping_object->last_sync_status = $mappings->status_error;
        }
      }

      $mapping_object->last_sync_action = 'push';
      $mapping_object->last_sync = $_SERVER['REQUEST_TIME'];
      $mapping_object->save();
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

        if ($item->data['trigger'] == $mappings->sync_wordpress_delete && $mapping_object) {
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
        if ($mapping->salesforce_record_type_default != $mappings->default_record_type
          && empty($params['RecordTypeId'])
          && ($mapping->salesforce_object_type != 'CampaignMember')) {
          $params['RecordTypeId'] = $mapping->salesforce_record_type_default;
        }

        $sobject = new stdClass();
        $sobject->type = $mapping->salesforce_object_type;
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

          $mapping_object->last_sync_status = $mappings->status_success;
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
            $mapping_object->last_sync_status = $mappings->status_error;
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
     * Map Drupal values to a Salesforce object.
     *
     * @param object $mapping
     *   Mapping object.
     * @param object $entity_wrapper
     *   Entity wrapper object.
     * @param string $key_field
     *   Unique identifier field.
     * @param string $key_value
     *   Value of the unique identifier field.
     * @param bool $use_soap
     *   Flag to enforce use of the SOAP API.
     * @param bool $is_new
     *   Indicates whether a mapping object for this entity already exists.
     *
     * @return array
     *   Associative array of key value pairs.
     */
    function salesforce_push_map_params($mapping, $entity_wrapper, &$key_field, &$key_value, $use_soap = FALSE, $is_new = TRUE) {
      foreach ($mapping->field_mappings as $fieldmap) {
        // Skip fields that aren't being pushed to Salesforce.
        if (!in_array($fieldmap['direction'], array($mappings->direction_wordpress_sf, $mappings->direction_sync))) {
          continue;
        }

        // Skip fields that aren't updateable when a mapped object already exists.
        if (!$is_new && !$fieldmap['salesforce_field']['updateable']) {
          continue;
        }

        $fieldmap_type = salesforce_mapping_get_fieldmap_types($fieldmap['drupal_field']['fieldmap_type']);

        $value = call_user_func($fieldmap_type['push_value_callback'], $fieldmap, $entity_wrapper);
        $params[$fieldmap['salesforce_field']['name']] = $value;

        if ($fieldmap['key']) {
          $key_field = $fieldmap['salesforce_field']['name'];
          $key_value = $value;
          // If key is set, remove from $params to avoid UPSERT errors.
          if (!$use_soap) {
            unset($params[$key_field]);
          }
        }
      }

      drupal_alter('salesforce_push_params', $params, $mapping, $entity_wrapper);

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
      $trigger = (!empty($entity->is_new) && $entity->is_new) ? $mappings->sync_wordpress_create : $mappings->sync_wordpress_update;
      $this->salesforce_push_object_crud($context['entity_type'], $entity, $trigger);
    }
}