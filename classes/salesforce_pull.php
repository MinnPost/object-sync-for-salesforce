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

		// load the schedule class
		// the schedule needs to just run all the time at its configured intervals because wordpress will never trigger it on its own, ie by creating an object
		$schedule = $this->schedule;
		// create new schedule based on the options for this current class
		// this will use the existing schedule if it already exists; otherwise it'll create one
		$schedule->use_schedule( $this->schedule_name );

		$this->add_actions();

	}

	/**
	* Create the action hooks based on what object maps exist from the admin settings
	*
	*/
	private function add_actions() {
		add_action( 'wp_ajax_salesforce_pull_webhook', array( $this, 'salesforce_pull_webhook' ) );
	}

	/**
	* Ajax callback for salesforce pull. Returns status of 200 for successful
	* attempt or 403 for a failed pull attempt (SF not authorized, threshhold
	* reached, etc.
	* this is the ajax callback; not a cron run
	*/
	public function salesforce_pull_webhook() {

		if ( $this->salesforce_pull() === TRUE ) {
			$code = '200';			
			// check to see if anything is in the queue and handle it if it is
			$this->schedule->maybe_handle();

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
	* Callback for the standard pull process used by webhooks and cron.
	*/
	public function salesforce_pull() {
		$sfapi = $this->salesforce['sfapi'];

		if ( $this->salesforce['is_authorized'] === TRUE && $this->check_throttle() === TRUE ) {

			$this->get_updated_records();
			$this->get_deleted_records();

			// Store this request time for the throttle check.
			update_option( 'salesforce_api_pull_last_sync', current_time( 'timestamp', true ) );
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
	* Determines if the Salesforce pull should be allowed, or throttled.
	*
	* Prevents too many pull processes from running at once.
	*
	* @return bool
	*    Returns false if the time elapsed between recent pulls is too short.
	*/
	private function check_throttle() {
		$pull_throttle = get_option( 'salesforce_api_pull_throttle', 5 );
		$last_sync = get_option( 'salesforce_api_pull_last_sync', 0 );

		if ( current_time( 'timestamp', true ) > ( $last_sync + $pull_throttle ) ) {
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
	*
	* todo: figure out why the drupal module has two for loops over apparently the same data
	* i think it's because it wants to run a separate SOQL thing for each type of object in SF
	*/
	private function get_updated_records() {
		$sfapi = $this->salesforce['sfapi'];
		foreach ( $this->mappings->get_fieldmaps() as $fieldmap ) {
			$type = $fieldmap['salesforce_object']; // this sets the salesfore object type for the SOQL query
			$mapped_fields = array();
			$mapped_record_types = array();

			// Iterate over each field mapping to determine our query parameters.
			foreach ( $this->mappings->get_fieldmaps( NULL, array('salesforce_object' => $type ) ) as $mapping ) {

	  			foreach ( $mapping['fields'] as $field ) {
	  				// skip fields that are only wordpress to salesforce
					if ( !in_array( $field['direction'], array( $this->mappings->direction_sf_wordpress, $this->mappings->direction_sync ) ) ) {
						continue;
					}

					if ( is_array( $field['salesforce_field'] ) && !isset( $field['salesforce_field'] ) ) {
						foreach ( $field['salesforce_field'] as $sf_field ) {
							$mapped_fields[$sf_field] = $sf_field;
						}
					} else {
						$mapped_fields[$field['salesforce_field']] = $field['salesforce_field'];
					}
				}

				if ( !empty( $mapped_fields ) && $mapping['salesforce_record_type_default'] !== $this->mappings->salesforce_default_record_type ) {
					foreach ( $mapping['salesforce_record_types_allowed'] as $record_type ) {
						if ( $record_type ) {
							$mapped_record_types[$record_type] = $record_type;
						}
					}
					// Add the RecordTypeId field so we can use it when processing the queued SF objects.
					$mapped_fields['RecordTypeId'] = 'RecordTypeId';
				}
			}	

			// There are no field mappings configured to pull data from Salesforce so
			// move on to the next mapped object. Prevents querying unmapped data.
			if ( empty( $mapped_fields ) ) {
				continue;
			}

			$soql = new Salesforce_Select_Query( $type );

			// Convert field mappings to SOQL.
			// this is why we don't use the get_updated_records method
			$soql->fields = array_merge( $mapped_fields, array(
			  'Id' => 'Id',
			  $mapping['pull_trigger_field'] => $mapping['pull_trigger_field']
			) );

			// If no lastupdate, get all records, else get records since last pull.
			// this should be what keeps it from getting all the records, whether or not they've ever been updated
			$sf_last_sync = get_option( 'salesforce_api_pull_last_sync_' . $type, NULL );
			if ( $sf_last_sync ) {
			  $last_sync = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );
			  $soql->add_condition( $mapping['pull_trigger_field'], $last_sync, '>' );
			}

			// If Record Type is specified, restrict query.
			if ( count( $mapped_record_types ) > 0 ) {
				$soql->add_condition( 'RecordTypeId', $mapped_record_types, 'IN' );
			}

			// Execute query
			// have to cast it to string to make sure it uses the magic method
			// we don't want to cache this because timestamps
			$results = $sfapi->query( (string) $soql, array( 'cache' => FALSE ) );
			$response = $results['data'];
			$version_path = parse_url( $sfapi->get_api_endpoint(), PHP_URL_PATH );

			if ( !isset( $response['errorCode'] ) ) {
				// Write items to the queue.
				foreach ( $response['records'] as $result ) {

					$data = array(
						'object_type' => $type,
						'object' => $result,
						'mapping' => $mapping,
						'sf_sync_trigger' => $this->mappings->sync_sf_update // sf update trigger
					);

					$this->schedule->push_to_queue( $data );
					$this->schedule->save()->dispatch();

				}

				// Handle requests larger than the batch limit (usually 2000).
				$next_records_url = isset( $response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $response['nextRecordsUrl'] ) : FALSE;

				while ( $next_records_url ) {
					// shouldn't cache this either. it's going into the queue if it exists anyway.
					$new_results = $sfapi->api_call( $next_records_url, array(), 'GET', array( 'cache' => FALSE ) );
					$new_response = $new_results['data'];
					if ( !isset( $new_response['errorCode'] ) ) {
						// Write items to the queue.
						foreach ( $new_response['records'] as $result ) {
							$data = array(
								'object_type' => $type,
								'object' => $result,
								'mapping' => $mapping,
								'sf_sync_trigger' => $this->mappings->sync_sf_update // sf update trigger
							);

							$this->schedule->push_to_queue( $data );
							$this->schedule->save();

						}
					}

					$next_records_url = isset( $new_response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $new_response['nextRecordsUrl'] ) : FALSE;
				}

				update_option( 'salesforce_api_pull_last_sync_' . $type, current_time( 'timestamp', true ) );

			} else {

				// create log entry for failed pull
				// todo: make this log the right stuff
				$status = 'error';
				$title = ucfirst( $status ) . ': ' . $response['errorCode'] . ' ' . $mapping['salesforce_object'];
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( $title, $this->text_domain ),
					$response['message'],
					$sf_mapping['sync_triggers'],
					'',
					$status
				);

			}
		}
	}

	/**
	* Get deleted records from salesforce.
	*/
	private function get_deleted_records() {

		$sfapi = $this->salesforce['sfapi'];

		// Load all unique SF record types that we have mappings for.
		foreach ( $this->mappings->get_fieldmaps() as $fieldmap ) {

			$type = $fieldmap['salesforce_object'];

			// Iterate over each field mapping to determine our parameters.
			foreach ( $this->mappings->get_fieldmaps( NULL, array('salesforce_object' => $type ) ) as $mapping ) {

				$last_delete_sync = get_option( 'salesforce_api_pull_delete_last_' . $type, current_time( 'timestamp', true ) );
				$now = current_time( 'timestamp', true );

				// get_deleted() constraint: startDate cannot be more than 30 days ago
				// (using an incompatible date may lead to exceptions).
				$last_delete_sync = $last_delete_sync > ( current_time( 'timestamp', true ) - 2505600 ) ? $last_delete_sync : ( current_time( 'timestamp', true ) - 2505600 );

				// get_deleted() constraint: startDate must be at least one minute greater
				// than endDate.
				$now = $now > ( $last_delete_sync + 60 ) ? $now : $now + 60;

				// need to be using gmdate for salesforce call
				$last_delete_sync_sf = gmdate( 'Y-m-d\TH:i:s\Z', $last_delete_sync );
				$now_sf = gmdate( 'Y-m-d\TH:i:s\Z', $now );

				// salesforce call
				$deleted = $sfapi->get_deleted( $type, $last_delete_sync_sf, $now_sf );

				if ( empty( $deleted['data']['deletedRecords'] ) ) {
					continue;
				}

				foreach ( $deleted['data']['deletedRecords'] as $result ) {
					// salesforce seriously returns Id for update requests and id for delete requests and this makes no sense but maybe one day they might change it somehow?
					if ( !isset( $result['Id'] ) && isset( $result['id']) ) {
						$result['Id'] = $result['id'];
					}
					$data = array(
						'object_type' => $type,
						'object' => $result,
						'mapping' => $mapping,
						'sf_sync_trigger' => $this->mappings->sync_sf_delete // sf delete trigger
					);

					$this->schedule->push_to_queue( $data );
					$this->schedule->save()->dispatch();

				}

				update_option( 'salesforce_api_pull_delete_last_' . $type, current_time( 'timestamp', true ) );

			}
		}
	}

	/**
	* Sync WordPress objects and Salesforce objects from the queue using the REST API.
	*
	* @param string $object_type
	*   Type of Salesforce object.
	* @param object $object
	*   The Salesforce object.
	* @param object $mapping
	*   Salesforce/WP mapping object.
	* @param int $sf_sync_trigger
	*   Trigger for this sync.
	*
	* @return true or exit the method
	*
	*/
	function salesforce_pull_process_records( $object_type, $object, $mapping, $sf_sync_trigger ) {

		// this returns the row that maps the individual salesforce row to the individual wordpress row
		if ( isset( $object['Id'] ) ) {
			$mapping_object = $this->mappings->load_by_salesforce( $object['Id'] );
		} else {
			// if we don't have a salesforce object id, we've got no business doing stuff in wordpress
			$status = 'error';
			if ( isset( $this->logging ) ) {
				$logging = $this->logging;
			} else if ( class_exists( 'Salesforce_Logging' ) ) {
				$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
			}
			$logging->setup(
				__( ucfirst( $status ) . ': Salesforce Pull: unable to process queue item because it has no Salesforce Id.', $this->text_domain ),
				print_r( $object, true ),
				$sf_sync_trigger,
				$status
			);
			return;
		}

		// hook to allow other plugins to define or alter the mapping object
		$mapping_object = apply_filters( 'salesforce_rest_api_pull_mapping_object', $mapping_object, $object, $mapping );

		// make sure these data versions are integers bc php's mysql is weird
		if ( isset( $mapping_object['salesforce_data_version'] ) ) {
			$mapping_object['salesforce_data_version'] = absint( $mapping_object['salesforce_data_version'] );
			// we should always update the salesforce data version rather than doing a check first, because this is a pull call
			$mapping_object['salesforce_data_version']++;
		} else {
			// there is no sf version so we should start at 1 because this is a pull
			$mapping_object['salesforce_data_version'] = 1;
		}
		if ( isset( $mapping_object['wordpress_data_version'] ) ) {
			$mapping_object['wordpress_data_version'] = absint( $mapping_object['wordpress_data_version'] );
		} else {
			$mapping_object['wordpress_data_version'] = 0;
		}

		// we already have the data from salesforce at this point; we just need to work with it in wordpress, unless they are the same

		// the wordpress and salesforce versions of the data are the same. don't do anything.
		if ( $mapping_object['wordpress_data_version'] === $mapping_object['salesforce_data_version'] ) {
			// if there is an actual mapping object row, update it so the version numbers will be correct
			// if we are sending data to wordpress, this happens after that data gets saved
			if ( isset( $mapping_object['id'] ) ) {
				$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );
			}
			return; // do not continue pulling data
		}

		// continue the pull because wp and sf data versions are not equal
		$synced_object = array(
			'salesforce_object' => $object,
			'mapping_object' => $mapping_object,
			'mapping' => $mapping,
		);

		$structure = $this->wordpress->get_wordpress_table_structure( $mapping['wordpress_object'] );
		$object_id = $structure['id_field'];

		$op = '';

		// deleting mapped objects
		if ( $sf_sync_trigger == $this->mappings->sync_sf_delete ) {
			if ( isset( $mapping_object['id'] ) ) {
				$op = 'Delete';
				$wordpress_check = $this->mappings->load_by_wordpress( $mapping_object['wordpress_object'], $mapping_object['wordpress_id'] );
				if ( count( $wordpress_check ) == count( $wordpress_check, COUNT_RECURSIVE ) ) {

					try {
						$result = $this->wordpress->object_delete( $mapping['wordpress_object'], $mapping_object['wordpress_id'] );
					}
					catch ( WordpressException $e ) {
						$status = 'error';
						// create log entry for failed delete
						if ( isset( $this->logging ) ) {
							$logging = $this->logging;
						} else if ( class_exists( 'Salesforce_Logging' ) ) {
							$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
						}

						$logging->setup(
							__( ucfirst( $status ) . ': ' . $op . ' WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ')', $this->text_domain ),
							$e->getMessage(),
							$sf_sync_trigger,
							$mapping_object['wordpress_id'],
							$status
						);

						// hook for pull fail
						do_action( 'salesforce_rest_api_pull_fail', $op, $result, $synced_object );

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
							__( ucfirst( $status ) . ': ' . $op . ' WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ')', $this->text_domain ),
							'',
							$sf_sync_trigger,
							$mapping_object['wordpress_id'],
							$status
						);

						// hook for pull success
						do_action( 'salesforce_rest_api_pull_success', $op, $result, $synced_object );
					}
				} else {
					$more_ids = '<p>The WordPress record was not deleted because there are multiple Salesforce IDs that match this WordPress ID. They are: ';
					$i = 0;
					foreach ( $wordpress_check as $match ) {
						$i++;
						$more_ids .= $match['salesforce_id'];
						if ( $i !== count( $wordpress_check ) ) {
							$more_ids .= ', ';
						} else {
							$more_ids .= '.</p>';
						}
					}

					$more_ids .= '<p>The map row between this Salesforce object and the WordPress object, as stored in the WordPress database, will be deleted, and this Salesforce object has been deleted, but the WordPress object row will remain untouched.</p>';

					$status = 'notice';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} else if ( class_exists( 'Salesforce_Logging' ) ) {
						$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
					}

					$logging->setup(
						__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (' . $mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ') did not delete the WordPress item...', $this->text_domain ),
						$more_ids,
						$sf_sync_trigger,
						$mapping_object['wordpress_id'],
						$status
					);
				}

				// delete the map row from wordpress after the wordpress row has been deleted
				// we delete the map row even if the wordpress delete failed, because the salesforce object is gone
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

		// maybe don't need these two lines from drupal?
		$hold_exceptions = count( $mapping_object ) > 1;
		$exception = FALSE;

		// map the salesforce values to wordpress fields
		$params = $this->mappings->map_params( $mapping, $object, $sf_sync_trigger, FALSE, $is_new );

		// if we don't get any params, there are no fields that should be sent to wordpress
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

		// methods to run the wp create or update operations

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
				// ex: match a WordPress user based on some other criteria than the predefined ones
				// returns a $salesforce_id.
				// it should keep NULL if there is no match
				// the function that calls this hook needs to check the mapping to make sure the wordpress object is the right type
				$wordpress_id = apply_filters( 'salesforce_rest_api_find_wp_object_match', NULL, $object, $mapping, 'pull' );

				if ( isset( $prematch_field_wordpress ) || isset( $key_field_wordpress ) || $wordpress_id !== NULL ) {

					// if either prematch criteria exists, make the values queryable

					if ( isset($prematch_field_wordpress ) ) {
						$upsert_key = $prematch_field_salesforce;
						$upsert_value = $encoded_prematch_value;
					} elseif ( isset( $key_field_wordpress ) ) {
						$upsert_key = $key_field_salesforce;
						$upsert_value = $encoded_key_value;
					}

					if ( $wordpress_id !== NULL ) {
						$upsert_key = $object_id;
						$upsert_value = $wordpress_id;
					}

					$op = 'Upsert';

					$result = $this->wordpress->object_upsert( $mapping['wordpress_object'], $upsert_key, $upsert_value, $params );

				} else {
					// No key or prematch field exists on this field map object, create a new object in WordPress.
					$op = 'Create';
					$result = $this->wordpress->object_create( $mapping['wordpress_object'], $params );
				}

			}
			catch ( WordpressException $e ) {
				// create log entry for failed create or upsert
				$status = 'error';
				$title = ucfirst( $status ) . ': ' . $op . ' ' . $mapping['wordpress_object'];
				if ( $salesforce_id !== NULL ) {
					$title .= ' ' . $salesforce_id;
				}
				$title .=  ' (Salesforce ' . $mapping['salesforce_object'] . ' with Id ' . ' of ' . $object['Id'] . ')';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				// if we know the wordpress object id we can put it in there
				if ( $wordpress_id !== NULL ) {
					$parent = $wordpress_id;
				} else {
					$parent = 0;
				}

				$logging->setup(
					__( $title, $this->text_domain ),
					$e->getMessage(),
					$sf_sync_trigger,
					$parent,
					$status
				);

				// hook for pull fail
				do_action( 'salesforce_rest_api_pull_fail', $op, $result, $synced_object );

				return;
			}

			// set $wordpress_data to the query result
			$wordpress_data = $result['data'];
			if ( isset( $wordpress_data["$object_id"] ) ) {
				$wordpress_id = $wordpress_data["$object_id"];
			} else {
				$wordpress_id = 0;
			}

			// wordpress crud call was successful
			// this means the object has already been created/updated in wordpress
			// this is not redundant because this is where it creates the object mapping rows in wordpress if the object does not already have one (we are still inside $is_new === TRUE here)

			if ( empty($result['errors'] ) ) {
				$status = 'success';

				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $wordpress_id . ' (Salesforce ' . $mapping['salesforce_object'] . 'ID of ' . $object['Id'] . ')', $this->text_domain ),
					'',
					$sf_sync_trigger,
					$wordpress_id,
					$status
				);

				// create the mapping object between the rows
				$mapping_object = $this->create_object_map( $object, $wordpress_id, $mapping );

				// hook for pull success
				do_action( 'salesforce_rest_api_pull_success', $op, $result, $synced_object );
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
					__( $status . ' syncing: ' . $op . ' to WordPress (Salesforce ' . $mapping['salesforce_object'] . ' Id ' . $object['Id'] . ')', $this->text_domain ),
					'Object: ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $wordpress_id . '<br>br>' . 'Message: ' . print_r( $result['errors'], true ),
					$sf_sync_trigger,
					$wordpress_id,
					$status
				);

				// hook for pull fail
				do_action( 'salesforce_rest_api_pull_fail', $op, $result, $synced_object );

				return;
			}

		} else {
			// there is an existing object link
			// if the last sync is greater than the last time this object was updated by salesforce, skip it
			// this keeps us from doing redundant syncs
			// because SF stores all DateTimes in UTC.
			if ( get_gmt_from_date( $mapping_object['last_sync'], 'Y-m-d\TH:i:s\Z' ) > $object[$mapping['pull_trigger_field']] ) {
				$status = 'notice';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}
				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ': Did not sync Salesforce ' . $mapping['salesforce_object'] . ' with Id of ' . $object['Id'] . ' with WordPress ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' field of ' . $mapping_object['wordpress_id'] . ' because the last sync timestamp was greater than the object updated timestamp', $this->text_domain ),
					'Last sync time: ' . $mapping_object['last_sync'] . '<br>' . 'Object updated time: ' . get_date_from_gmt( $object[$mapping['pull_trigger_field']] ),
					$sf_sync_trigger,
					$mapping_object['wordpress_id'],
					$status
				);
				return;
			}

			try {
				$op = 'Update';
				$result = $this->wordpress->object_update( $mapping['wordpress_object'], $mapping_object['wordpress_id'], $params );

				$mapping_object['last_sync_status'] = $this->mappings->status_success;
				$mapping_object['last_sync_message'] = __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain );

				$status = 'success';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (Salesforce ' . $mapping['salesforce_object'] . ' with Id of ' . $object['Id'] . ')', $this->text_domain ),
					'',
					$sf_sync_trigger,
					$mapping_object['wordpress_id'],
					$status
				);

				// hook for pull success
				do_action( 'salesforce_rest_api_pull_success', $op, $result, $synced_object );

			}
			catch ( WordpressException $e ) {
				// create log entry for failed update
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} else if ( class_exists( 'Salesforce_Logging' ) ) {
					$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
				}

				$logging->setup(
					__( ucfirst( $status ) . ': ' . $op . ' ' . $mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (Salesforce ' . $mapping['salesforce_object'] . ' with Id of ' . $object['Id'] . ')', $this->text_domain ),
					$e->getMessage(),
					$sf_sync_trigger,
					$mapping_object['wordpress_id'],
					$status
				);

				$mapping_object['last_sync_status'] = $this->mappings->status_error;
				$mapping_object['last_sync_message'] = $e->getMessage();

				// hook for pull fail
				do_action( 'salesforce_rest_api_pull_fail', $op, $result, $synced_object );

			}

			// check to see if we actually updated anything in wordpress
			if ( $mapping_object['wordpress_data_version'] !== $mapping_object['salesforce_data_version'] ) {
				// tell the mapping object - whether it is new or already existed - how we just used it
				$mapping_object['last_sync_action'] = 'pull';
				$mapping_object['last_sync'] = current_time( 'mysql' );
			}

			// update that mapping object. the salesforce data version will be set here as well because we set it earlier
			$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

		}


		// drupal stuff here

		

		foreach ( $sf_mappings as $sf_mapping ) {

			$exists = $mapping_object ? TRUE : FALSE;

			if ( $exists && ( $sf_mapping['sync_triggers'] & $this->mappings->sync_sf_update ) ) {
				try {
					$entity = entity_load_single( $mapping_object->entity_type, $mapping_object->entity_id );
					if ( $entity === FALSE ) {
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
					} else {
						// Flag this entity as having been processed. This does not persist,
						// but is used by salesforce_push to avoid duplicate processing.
						$entity->salesforce_pull = TRUE;
						$entity_updated = isset($entity->updated) ? $entity->updated : $mapping_object->entity_updated;

						$sf_object_updated = strtotime( $sf_object[$sf_mapping->pull_trigger_date] );

						if ( $sf_object_updated > $entity_updated ) {
							$wrapper = entity_metadata_wrapper( $sf_mapping->drupal_entity_type, $entity );

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
							$mapping_object->last_sync_status = $this->mappings->status_success;
							$mapping_object->entity_updated = $mapping_object->last_sync = current_time( 'mysql' );
							watchdog('Salesforce Pull',
							'Updated entity %label associated with Salesforce Object ID: %sfid',
							array(
							'%label' => $wrapper->label(),
							'%sfid' => $sf_object['Id'],
							)
							);
		  				}
		  			}
		  		} catch ( Exception $e ) {
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
					$mapping_object->last_sync_status = $this->mappings->status_error;
					$mapping_object->last_sync_message = t('Processing failed');
					$mapping_object->last_sync = current_time( 'mysql' );
					if (!$hold_exceptions) {
						throw $e;
					}
					if (empty($exception)) {
						$exception = $e;
					} else {
						$my_class = get_class($e);
						$exception = new $my_class($e->getMessage(), $e->getCode(), $exception);
					}
				}
			} else {
				$exists = FALSE;
			}

			if ( !$exists && $sf_mapping->sync_triggers & $this->mappings->sync_sf_create ) {
				try {
					// Create entity from mapping object and field maps.
					$entity_info = entity_get_info( $sf_mapping->drupal_entity_type );

					// Define values to pass to entity_create().
					$values = array();
					if ( isset($entity_info['entity keys']['bundle'] ) && !empty( $entity_info['entity keys']['bundle'] ) ) {
						$values[$entity_info['entity keys']['bundle']] = $sf_mapping->drupal_bundle;

						// Because creating term via entities actually needs vid and won't be
						// fixed in Entity API (https://www.drupal.org/node/1409256).

						if ( isset( $values['vocabulary_machine_name'] ) ) {
							$vocabulary = taxonomy_vocabulary_machine_name_load( $values['vocabulary_machine_name'] );
							$values['vid'] = $vocabulary->vid;
						}
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

					salesforce_pull_map_fields( $sf_mapping->field_mappings, $wrapper, $sf_object );

					// Allow modules to react just prior to entity save.
					module_invoke_all( 'salesforce_pull_entity_presave', $wrapper->value(), $sf_object, $sf_mapping );

					$wrapper->save();

					// Allow modules to react to entity creation.
					module_invoke_all('salesforce_pull_entity_insert', $wrapper->value(), $sf_object, $sf_mapping);

					// Update mapping object.
					$last_sync_message = t('Retrieved new record from Salesforce');
					$last_sync_status = $this->mappings->status_success;
					$entity_updated = current_time( 'mysql' );
				} catch ( Exception $e ) {
					$message = $e->getMessage() . ' ' . t('Processing failed for entity %label associated with Salesforce Object ID: %sfobjectid',
					array(
					'%label' => $wrapper->label(),
					'%sfobjectid' => $sf_object['Id'],
					)
					);
					watchdog('Salesforce Pull', $message, array(), WATCHDOG_ERROR);
					salesforce_set_message('There were failures processing data from Salesforce. Please check the error logs.', 'error', FALSE);
					$last_sync_status = $this->mappings->status_error;
					$last_sync_message = t('Processing failed for new record');
					$entity_updated = NULL;
					if ( !$hold_exceptions ) {
						throw $e;
					}

					if ( empty( $exception ) ) {
						$exception = $e;
					} else {
						$my_class = get_class( $e );
						$exception = new $my_class( $e->getMessage(), $e->getCode(), $exception );
					}
				}

				// If no id exists, the insert failed and we cannot create a mapping
				// object. We are left with no choice but to throw an exception.
				list( $entity_id ) = entity_extract_ids( $sf_mapping->drupal_entity_type, $entity );
				if ( !$entity_id ) {
					$sf_object_id = $sf_object['Id'];
					throw new Exception("Failed to create Drupal entity when processing data from Salesforce object: $sf_object_id.");
				}

				// Create mapping object.
				$mapping_object = entity_create('salesforce_mapping_object', array(
					'salesforce_id' => $sf_object['Id'],
					'entity_type' => $sf_mapping->drupal_entity_type,
					'entity_id' => $entity_id,
					'entity_updated' => $entity_updated,
					'last_sync' => current_time( 'mysql' ),
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
	* Create an object map between a Salesforce object and a WordPress object
	*
	* @param array $salesforce_object
	*	Array of the salesforce object's data
	* @param string $wordpress_id
	*	Unique identifier for the WordPress object
	* @param array $field_mapping
	*	The row that maps the object types together, including which fields match which other fields
	*
	* @return array $mapping object
	*	This is the database row that maps the objects, including the IDs for each one, and the WP object type
	*
	*/
	private function create_object_map( $salesforce_object, $wordpress_id, $field_mapping ) {
		// Create object map and save it
		$mapping_object = $this->mappings->create_object_map(
			array(
				'wordpress_id' => $wordpress_id, // wordpress unique id
				'salesforce_id' => $salesforce_object['Id'], // salesforce unique id. we don't care what kind of object it is at this point
				'wordpress_object' => $field_mapping['wordpress_object'], // keep track of what kind of wp object this is
				'last_sync' => current_time( 'mysql' ),
				'last_sync_action' => 'pull',
				'last_sync_status' => $this->mappings->status_success,
				'last_sync_message' => __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain ),
				'wordpress_data_version' => 0,
				'salesforce_data_version' => 1
			)
		);

		return $mapping_object;

	}

}