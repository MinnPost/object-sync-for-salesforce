<?php
/**
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * Pull data from Salesforce into WordPress
 */
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
	* Constructor which sets up pull schedule
	*
	* @param object $wpdb
	* @param string $version
	* @param array $login_credentials
	* @param string $text_domain
	* @param object $wordpress
	* @param object $salesforce
	* @param object $mappings
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

		if ( $this->salesforce_pull() === true ) {
			$code = '200';
			// check to see if anything is in the queue and handle it if it is
			$this->schedule->maybe_handle();

		} else {
			$code = '403';
		}

		if ( ! empty( $_POST ) ) {
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

		if ( true === $this->salesforce['is_authorized'] && true === $this->check_throttle() ) {

			$this->get_updated_records();
			$this->get_deleted_records();

			// Store this request time for the throttle check.
			update_option( 'salesforce_api_pull_last_sync', current_time( 'timestamp', true ) );
			return true;

		} else {
			// No pull happened.
			return false;
		}
	}

	/**
	* Load schedule
	* This loads the schedule class
	*/
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
			return true;
		} else {
			return false;
		}
	}

	/**
	* Pull updated records from Salesforce and place them in the queue.
	*
	* Executes a SOQL query based on defined mappings, loops through the results,
	* and places each updated SF object into the queue for later processing.
	*
	* We copy the convention from the Drupal module here, and run a separate SOQL query for each type of object in SF
	*
	*/
	private function get_updated_records() {
		$sfapi = $this->salesforce['sfapi'];
		foreach ( $this->mappings->get_fieldmaps() as $salesforce_mapping ) {
			$type = $salesforce_mapping['salesforce_object']; // this sets the salesfore object type for the SOQL query

			// determine when this object was last synced
			$sf_last_sync = get_option( 'salesforce_api_pull_last_sync_' . $type, NULL );
			if ( $sf_last_sync ) {
				$last_sync = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );
			}

			$soql = $this->get_pull_query( $type );
			if ( empty( $soql ) ) {
				continue;
			}

			// Execute query
			// have to cast it to string to make sure it uses the magic method
			// we don't want to cache this because timestamps
			$results = $sfapi->query( (string) $soql, array( 'cache' => false ) );
			$response = $results['data'];
			$version_path = parse_url( $sfapi->get_api_endpoint(), PHP_URL_PATH );

			if ( ! isset( $response['errorCode'] ) ) {
				// Write items to the queue.
				foreach ( $response['records'] as $result ) {

					// if this record is new as of the last sync, use the create trigger
					if ( isset( $result['CreatedDate'] ) && $result['CreatedDate'] > $last_sync ) {
						$trigger = $this->mappings->sync_sf_create;
					} else {
						$trigger = $this->mappings->sync_sf_update;
					}

					$result = array( 'create_update' => $result );

					$data = array(
						'object_type' => $type,
						'object' => $result,
						'mapping' => $salesforce_mapping,
						'sf_sync_trigger' => $trigger // use the appropriate trigger based on when this was created
					);

					$this->schedule->push_to_queue( $data );
					$this->schedule->save()->dispatch();

				}

				// Handle requests larger than the batch limit (usually 2000).
				$next_records_url = isset( $response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $response['nextRecordsUrl'] ) : false;

				while ( $next_records_url ) {
					// shouldn't cache this either. it's going into the queue if it exists anyway.
					$new_results = $sfapi->api_call( $next_records_url, array(), 'GET', array( 'cache' => false ) );
					$new_response = $new_results['data'];
					if ( ! isset( $new_response['errorCode'] ) ) {
						// Write items to the queue.
						foreach ( $new_response['records'] as $result ) {
							$data = array(
								'object_type' => $type,
								'object' => $result,
								'mapping' => $salesforce_mapping,
								'sf_sync_trigger' => $this->mappings->sync_sf_update // sf update trigger
							);

							$this->schedule->push_to_queue( $data );
							$this->schedule->save();

						}
					}

					$next_records_url = isset( $new_response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $new_response['nextRecordsUrl'] ) : false;
				}

				update_option( 'salesforce_api_pull_last_sync_' . $type, current_time( 'timestamp', true ) );

			} else {

				// create log entry for failed pull
				$status = 'error';
				$title = ucfirst( $status ) . ': ' . $response['errorCode'] . ' ' . $salesforce_mapping['salesforce_object'];
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Salesforce_Logging' ) ) {
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
	* Note that deletions can only be queried via REST with an API version >= 29.0.
	*
	*/
	private function get_deleted_records() {

		$sfapi = $this->salesforce['sfapi'];

		// Load all unique SF record types that we have mappings for.
		foreach ( $this->mappings->get_fieldmaps() as $salesforce_mapping ) {

			$type = $salesforce_mapping['salesforce_object'];

			// Iterate over each field mapping to determine our parameters.
			foreach ( $this->mappings->get_fieldmaps( null, array( 'salesforce_object' => $type ) ) as $mapping ) {

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
					if ( ! isset( $result['Id'] ) && isset( $result['id'] ) ) {
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
	* Method for ajax hooks to call for pulling manually
	*
	* @param string $object_type
	* @param string $salesforce_id
	* @param string $wordpress_object
	*
	*/
	public function manual_pull( $object_type, $salesforce_id, $wordpress_object ) {
		$sfapi = $this->salesforce['sfapi'];
		$object = $sfapi->api_call( 'sobjects/' . $object_type . '/' . $salesforce_id );
		$mapping = $this->mappings->get_fieldmaps( null, array( 'salesforce_object' => $object_type, 'wordpress_object' => $wordpress_object ) );
		$this->salesforce_pull_process_records( $object_type, $object['data'], $mapping[0], $this->mappings->sync_sf_update );
	}

	/**
	* Given a SObject type name, build an SOQL query to include all fields for all
	* object maps mapped to that SObject.
	*
	* @param string $type
	*   e.g. "Contact", "Account", etc.
	*
	* @return Salesforce_Select_Query or NULL if no mappings or no mapped fields
	*   were found.
	*
	* @see Salesforce_Mapping::get_mapped_fields
	* @see Salesforce_Mapping::get_mapped_record_types
	*/
	private function get_pull_query( $type ) {
		$mapped_fields = array();
		$mapped_record_types = array();

		// Iterate over each fieldmap to determine our query parameters.
		// pass a NULL for the fieldmap id because we don't just want one
		foreach ( $this->mappings->get_fieldmaps( NULL, array('salesforce_object' => $type ) ) as $mapping ) {
			$mapped_fields = array_merge(
				$mapped_fields, 
				$this->mappings->get_mapped_fields(
					$mapping,
					array(
						$this->mappings->direction_sync,
						$this->mappings->direction_wordpress_sf
					)
				)
			);
		}

		// There are no field mappings configured to pull data from Salesforce so
		// move on to the next mapped object. Prevents querying unmapped data.
		if ( empty( $mapped_fields ) ) {
			return NULL;
		}

		$soql = new Salesforce_Select_Query( $type );
		// Convert field mappings to SOQL.
		$soql->fields = array_merge(
			$mapped_fields,
			array(
				'Id' => 'Id',
				$mapping['pull_trigger_field'] => $mapping['pull_trigger_field']
			)
		);

		if ( in_array( $this->mappings->sync_sf_create, $mapping['sync_triggers'] ) ) {
			$soql->fields['CreatedDate'] = 'CreatedDate';
		}

		// If no lastupdate, get all records, else get records since last pull.
		$sf_last_sync = get_option( 'salesforce_api_pull_last_sync_' . $type, NULL );
		if ( $sf_last_sync ) {
			$last_sync = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );
			$soql->add_condition( $mapping['pull_trigger_field'], $last_sync, '>' );
		}

		// If Record Type is specified, restrict query.
		$mapped_record_types = $this->mappings->get_mapped_record_types();
		if ( count( $mapped_record_types ) > 0 ) {
			$soql->addCondition( 'RecordTypeId', $mapped_record_types, 'IN' );
		}

		return $soql;
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
	public function salesforce_pull_process_records( $object_type, $object, $mapping, $sf_sync_trigger ) {

		if ( isset( $object['delete'] ) ) {
			error_log('delete is ' . $object['delete']);
		} else if ( isset( $object['merge'] ) ) {
			error_log('merge is ' . $object['merge']);
		} else {
			error_log('object is ' . print_r($object, true));
			$object = $object['create_update'];
    	}



		$mapping_conditions = array(
			'salesforce_object' => $object_type,
		);

		if ( isset( $object['RecordTypeId'] ) && $object['RecordTypeId'] !== $this->mappings->salesforce_default_record_type ) {
			// use this condition to filter the mappings, at that time
			$mapping_conditions['salesforce_record_type'] = $object['RecordTypeId'];
		}

		$salesforce_mappings = $this->mappings->get_fieldmaps( null, $mapping_conditions );

		// from drupal: if there is more than one mapping, don't throw exceptions
		$hold_exceptions = count( $salesforce_mappings ) > 1;
		$exception = false;

		$seconds = $this->schedule->get_schedule_frequency_seconds( $this->schedule_name ) + 60;

		$transients_to_delete = array();

		foreach ( $salesforce_mappings as $salesforce_mapping ) {

			// this returns the row that maps the individual salesforce row to the individual wordpress row
			if ( isset( $object['Id'] ) ) {
				$mapping_object = $this->mappings->load_by_salesforce( $object['Id'] );
			} else {
				// if we don't have a salesforce object id, we've got no business doing stuff in wordpress
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Salesforce_Logging' ) ) {
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

			// hook to allow other plugins to prevent a pull per-mapping.
			$pull_allowed = apply_filters( 'object_sync_for_salesforce_pull_object_allowed', true, $object_type, $object, $sf_sync_trigger, $salesforce_mapping );

			// example to keep from pulling the Contact with id of abcdef
			/*
			add_filter( 'object_sync_for_salesforce_pull_object_allowed', 'check_user', 10, 5 );
			// can always reduce this number if all the arguments are not necessary
			function check_user( $pull_allowed, $object_type, $object, $sf_sync_trigger, $salesforce_mapping ) {
				if ( $object_type === 'Contact' && $object['Id'] === 'abcdef' ) {
					return false;
				}
			}
			*/

			if ( false === $pull_allowed ) {
				continue;
			}

			// if there's already a connection between the objects, $mapping_object will be an array
			// if it's not already connected (ie on create), the array will be empty

			// hook to allow other plugins to define or alter the mapping object
			$mapping_object = apply_filters( 'object_sync_for_salesforce_pull_mapping_object', $mapping_object, $object, $mapping );

			// we already have the data from salesforce at this point; we just need to work with it in wordpress
			$synced_object = array(
				'salesforce_object' => $object,
				'mapping_object' => $mapping_object,
				'mapping' => $mapping,
			);

			$structure = $this->wordpress->get_wordpress_table_structure( $salesforce_mapping['wordpress_object'] );
			$object_id = $structure['id_field'];

			$op = '';

			// are these objects already connected in wordpress?
			if ( isset( $mapping_object['id'] ) ) {
				$is_new = false;
				$mapping_object_id_transient = $mapping_object['id'];
			} else {
				// there is not a mapping object for this wordpress object id yet
				// check for that transient with the currently pushing id
				$is_new = true;
				$mapping_object_id_transient = get_transient( 'salesforce_pushing_object_id' );
			}

			// drupal only does a salesforce_pull flag, but we might as well do push and pull because wordpress
			$salesforce_pushing = (int) get_transient( 'salesforce_pushing_' . $mapping_object_id_transient );
			if ( 1 === $salesforce_pushing ) {
				$transients_to_delete[] = $mapping_object_id_transient;
				continue;
			}

			// deleting mapped objects
			if ( $sf_sync_trigger == $this->mappings->sync_sf_delete ) {
				if ( isset( $mapping_object['id'] ) ) {

					set_transient( 'salesforce_pulling_' . $mapping_object['id'], 1, $seconds );
					set_transient( 'salesforce_pulling_object_id', $mapping_object['id'] );

					$op = 'Delete';
					$wordpress_check = $this->mappings->load_by_wordpress( $mapping_object['wordpress_object'], $mapping_object['wordpress_id'] );
					if ( count( $wordpress_check ) == count( $wordpress_check, COUNT_RECURSIVE ) ) {
						try {
							$result = $this->wordpress->object_delete( $salesforce_mapping['wordpress_object'], $mapping_object['wordpress_id'] );
						}
						catch ( WordpressException $e ) {
							$status = 'error';
							// create log entry for failed delete
							if ( isset( $this->logging ) ) {
								$logging = $this->logging;
							} elseif ( class_exists( 'Salesforce_Logging' ) ) {
								$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
							}

							$logging->setup(
								__( ucfirst( $status ) . ': ' . $op . ' WordPress ' . $salesforce_mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (' . $salesforce_mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ')', $this->text_domain ),
								$e->getMessage(),
								$sf_sync_trigger,
								$mapping_object['wordpress_id'],
								$status
							);

							if ( $hold_exceptions === false ) {
								throw $e;
							}
							if ( empty( $exception ) ) {
								$exception = $e;
							} else {
								$my_class = get_class( $e );
								$exception = new $my_class( $e->getMessage(), $e->getCode(), $exception );
							}

							// hook for pull fail
							do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

						}

						if ( ! isset( $e ) ) {
							// create log entry for successful delete if the result had no errors
							$status = 'success';
							if ( isset( $this->logging ) ) {
								$logging = $this->logging;
							} elseif ( class_exists( 'Salesforce_Logging' ) ) {
								$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
							}

							$logging->setup(
								__( ucfirst( $status ) . ': ' . $op . ' WordPress ' . $salesforce_mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (' . $salesforce_mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ')', $this->text_domain ),
								'',
								$sf_sync_trigger,
								$mapping_object['wordpress_id'],
								$status
							);

							// hook for pull success
							do_action( 'object_sync_for_salesforce_pull_success', $op, $result, $synced_object );
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
						} elseif ( class_exists( 'Salesforce_Logging' ) ) {
							$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
						}

						$logging->setup(
							__( ucfirst( $status ) . ': ' . $op . ' ' . $salesforce_mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (' . $salesforce_mapping['salesforce_object'] . ' ' . $mapping_object['salesforce_id'] . ') did not delete the WordPress item...', $this->text_domain ),
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

			// map the salesforce values to wordpress fields
			$params = $this->mappings->map_params( $mapping, $object, $sf_sync_trigger, false, $is_new );

			// hook to allow other plugins to modify the $params array
			// use hook to map fields between the wordpress and salesforce objects
			// returns $params.
			$params = apply_filters( 'object_sync_for_salesforce_pull_params_modify', $params, $mapping, $object, $sf_sync_trigger, false, $is_new );

			// if we don't get any params, there are no fields that should be sent to wordpress
			if ( empty( $params ) ) {
				return;
			}

			// if there is a prematch wordpress field - ie email - on the fieldmap object
			if ( isset( $params['prematch'] ) && is_array( $params['prematch'] ) ) {
				$prematch_field_wordpress = $params['prematch']['wordpress_field'];
				$prematch_field_salesforce = $params['prematch']['salesforce_field'];
				$prematch_value = $params['prematch']['value'];
				$prematch_methods = array(
					'method_match' => $params['prematch']['method_read'],
					'method_create' => $params['prematch']['method_create'],
					'method_update' => $params['prematch']['method_update'],
					'method_read' => $params['prematch']['method_read']
				);
				unset( $params['prematch'] );
			}

			// if there is an external key field in salesforce - ie mailchimp user id - on the fieldmap object
			if ( isset( $params['key'] ) && is_array( $params['key'] ) ) {
				$key_field_wordpress = $params['key']['wordpress_field'];
				$key_field_salesforce = $params['key']['salesforce_field'];
				$key_value = $params['key']['value'];
				$key_methods = array(
					'method_match' => $params['prematch']['method_read'],
					'method_create' => $params['prematch']['method_create'],
					'method_update' => $params['prematch']['method_update'],
					'method_read' => $params['key']['method_read']
				);
				unset( $params['key'] );
			}

			// methods to run the wp create or update operations

			if ( $is_new === TRUE && ( $sf_sync_trigger == $this->mappings->sync_sf_create ) ) {

				// right here we should set the pulling transient
				// this means we have to create the mapping object here as well, and update it with the correct IDs after successful response
				// create the mapping object between the rows
				$mapping_object_id = $this->create_object_map( $object, 0, $mapping );
				set_transient( 'salesforce_pulling_' . $mapping_object_id, 1, $seconds );
				set_transient( 'salesforce_pulling_object_id', $mapping_object_id );
				$mapping_object = $this->mappings->get_object_maps( array( 'id' => $mapping_object_id ) );


				// setup SF record type. CampaignMember objects get their Campaign's type
				// i am still a bit confused about this
				// we should store this as a meta field on each object, if it meets these criteria
				// we need to store the read/modify attributes because the field doesn't exist in the mapping
				if ( $salesforce_mapping['salesforce_record_type_default'] !== $this->mappings->salesforce_default_record_type && empty( $params['RecordTypeId'] ) && ( $salesforce_mapping['salesforce_object'] !== 'CampaignMember') ) {
					$type = $salesforce_mapping['wordpress_object'];
					if ( $salesforce_mapping['wordpress_object'] === 'category' || $salesforce_mapping['wordpress_object'] === 'tag' || $salesforce_mapping['wordpress_object'] === 'post_tag' ) {
						$type = 'term';
					}
					$params['RecordTypeId'] = array(
						'value' => $salesforce_mapping['salesforce_record_type_default'],
						'method_modify' => 'update_' . $type . '_meta',
	            		'method_read' => 'get_' . $type . '_meta'
					);
				}

				try {

					// hook to allow other plugins to modify the $salesforce_id string here
					// use hook to change the object that is being matched to developer's own criteria
					// ex: match a WordPress user based on some other criteria than the predefined ones
					// returns a $salesforce_id.
					// it should keep null if there is no match
					// the function that calls this hook needs to check the mapping to make sure the wordpress object is the right type
					$wordpress_id = apply_filters( 'object_sync_for_salesforce_find_wp_object_match', null, $object, $mapping, 'pull' );

					// hook to allow other plugins to do something right before wordpress data is saved
					// ex: run outside methods on an object if it exists, or do something in preparation for it if it doesn't
					do_action( 'object_sync_for_salesforce_pre_pull', $wordpress_id, $mapping, $object, $object_id, $params );

					if ( isset( $prematch_field_salesforce ) || isset( $key_field_salesforce ) || $wordpress_id !== null ) {

						// if either prematch criteria exists, make the values queryable
						if ( isset($prematch_field_salesforce ) ) {
							$upsert_key = $prematch_field_wordpress;
							$upsert_value = $prematch_value;
							$upsert_methods = $prematch_methods;
						} elseif ( isset( $key_field_salesforce ) ) {
							$upsert_key = $key_field_wordpress;
							$upsert_value = $key_value;
							$upsert_methods = $key_methods;
						}

						if ( $wordpress_id !== null ) {
							$upsert_key = $object_id;
							$upsert_value = $wordpress_id;
							$upsert_methods = array();
						}

						$op = 'Upsert';

						$result = $this->wordpress->object_upsert( $salesforce_mapping['wordpress_object'], $upsert_key, $upsert_value, $upsert_methods, $params, $salesforce_mapping['push_drafts'] );

					} else {
						// No key or prematch field exists on this field map object, create a new object in WordPress.
						$op = 'Create';
						$result = $this->wordpress->object_create( $salesforce_mapping['wordpress_object'], $params );
					}

				}
				catch ( WordpressException $e ) {
					// create log entry for failed create or upsert
					$status = 'error';
					$title = ucfirst( $status ) . ': ' . $op . ' ' . $salesforce_mapping['wordpress_object'];
					if ( $salesforce_id !== null ) {
						$title .= ' ' . $salesforce_id;
					}
					$title .=  ' (Salesforce ' . $salesforce_mapping['salesforce_object'] . ' with Id ' . ' of ' . $object['Id'] . ')';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Salesforce_Logging' ) ) {
						$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
					}

					// if we know the wordpress object id we can put it in there
					if ( $wordpress_id !== null ) {
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

					if ( $hold_exceptions === false ) {
						throw $e;
					}
					if ( empty( $exception ) ) {
						$exception = $e;
					} else {
						$my_class = get_class( $e );
						$exception = new $my_class( $e->getMessage(), $e->getCode(), $exception );
					}

					// hook for pull fail
					do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

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
				// this is not redundant because this is where it creates the object mapping rows in wordpress if the object does not already have one (we are still inside $is_new === true here)

				if ( empty($result['errors'] ) ) {
					$status = 'success';

					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Salesforce_Logging' ) ) {
						$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
					}

					$logging->setup(
						__( ucfirst( $status ) . ': ' . $op . ' ' . $salesforce_mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $wordpress_id . ' (Salesforce ' . $salesforce_mapping['salesforce_object'] . ' ID of ' . $object['Id'] . ')', $this->text_domain ),
						'',
						$sf_sync_trigger,
						$wordpress_id,
						$status
					);

					// update that mapping object
					$mapping_object['wordpress_id'] = $wordpress_id;
					$mapping_object = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

					// hook for pull success
					do_action( 'object_sync_for_salesforce_pull_success', $op, $result, $synced_object );
				} else {

					// create log entry for failed create or upsert
					// this is part of the drupal module but i am failing to understand when it would ever fire, since the catch should catch the errors
					// if we see this in the log entries, we can understand what it does, but probably not until then
					$status = 'error';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Salesforce_Logging' ) ) {
						$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
					}

					if ( is_object( $wordpress_id ) ) {
						$wordpress_id = print_r( $wordpress_id, true );
					}

					$logging->setup(
						__( $status . ' syncing: ' . $op . ' to WordPress (Salesforce ' . $salesforce_mapping['salesforce_object'] . ' Id ' . $object['Id'] . ')', $this->text_domain ),
						'Object: ' . $salesforce_mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $wordpress_id . '<br>br>' . 'Message: ' . print_r( $result['errors'], true ),
						$sf_sync_trigger,
						$wordpress_id,
						$status
					);

					// hook for pull fail
					do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

					return;
				}

			} elseif ( $is_new === false && ( $sf_sync_trigger == $this->mappings->sync_sf_update ) ) {

				// right here we should set the pulling transient
				set_transient( 'salesforce_pulling_' . $mapping_object['id'], 1, $seconds );
				set_transient( 'salesforce_pulling_object_id', $mapping_object['id'] );

				// there is an existing object link
				// if the last sync is greater than the last time this object was updated by salesforce, skip it
				// this keeps us from doing redundant syncs
				// because SF stores all DateTimes in UTC.
				$mapping_object['object_updated'] = current_time( 'mysql' );

				$pull_trigger_field = $salesforce_mapping['pull_trigger_field'];
				$pull_trigger_value = $object[$pull_trigger_field];

				try {

					// hook to allow other plugins to do something right before wordpress data is saved
					// ex: run outside methods on an object if it exists, or do something in preparation for it if it doesn't
					do_action( 'object_sync_for_salesforce_pre_pull', $mapping_object['wordpress_id'], $mapping, $object, $object_id, $params );

					$op = 'Update';
					$result = $this->wordpress->object_update( $salesforce_mapping['wordpress_object'], $mapping_object['wordpress_id'], $params );

					$mapping_object['last_sync_status'] = $this->mappings->status_success;
					$mapping_object['last_sync_message'] = __( 'Mapping object updated via function: ' . __FUNCTION__, $this->text_domain );

					$status = 'success';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Salesforce_Logging' ) ) {
						$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
					}

					$logging->setup(
						__( ucfirst( $status ) . ': ' . $op . ' ' . $salesforce_mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (Salesforce ' . $salesforce_mapping['salesforce_object'] . ' with Id of ' . $object['Id'] . ')', $this->text_domain ),
						'',
						$sf_sync_trigger,
						$mapping_object['wordpress_id'],
						$status
					);

					// hook for pull success
					do_action( 'object_sync_for_salesforce_pull_success', $op, $result, $synced_object );

				}
				catch ( WordpressException $e ) {
					// create log entry for failed update
					$status = 'error';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Salesforce_Logging' ) ) {
						$logging = new Salesforce_Logging( $this->wpdb, $this->version, $this->text_domain );
					}

					$logging->setup(
						__( ucfirst( $status ) . ': ' . $op . ' ' . $salesforce_mapping['wordpress_object'] . ' with ' . $object_id . ' of ' . $mapping_object['wordpress_id'] . ' (Salesforce ' . $salesforce_mapping['salesforce_object'] . ' with Id of ' . $object['Id'] . ')', $this->text_domain ),
						$e->getMessage(),
						$sf_sync_trigger,
						$mapping_object['wordpress_id'],
						$status
					);

					$mapping_object['last_sync_status'] = $this->mappings->status_error;
					$mapping_object['last_sync_message'] = $e->getMessage();

					if ( $hold_exceptions === false ) {
						throw $e;
					}
					if ( empty( $exception ) ) {
						$exception = $e;
					} else {
						$my_class = get_class( $e );
						$exception = new $my_class( $e->getMessage(), $e->getCode(), $exception );
					}

					// hook for pull fail
					do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

				}

				// need to move these into the success check

				// maybe can check to see if we actually updated anything in wordpress
				// tell the mapping object - whether it is new or already existed - how we just used it
				$mapping_object['last_sync_action'] = 'pull';
				$mapping_object['last_sync'] = current_time( 'mysql' );

				// update that mapping object. the salesforce data version will be set here as well because we set it earlier
				$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

			}
			// end of the if statement for is_new & update or create trigger
			// this keeps stuff from running too many times, and also keeps it from using the wrong methods. we don't need a generic } else { here at this time.

		}

		// delete transients that we've already processed
		foreach ( $transients_to_delete as $mapping_object_id_transient ) {
			delete_transient( 'salesforce_pushing_' . $mapping_object_id_transient );
		}

		$pushing_id = get_transient( 'salesforce_pushing_object_id' );
		if ( in_array( $pushing_id, $transients_to_delete ) ) {
			delete_transient( 'salesforce_pushing_object_id' );
		}

		if ( ! empty( $exception ) ) {
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
	* @return int $wpdb->insert_id
	*	This is the database row for the map object
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
				'last_sync_message' => __( 'Mapping object created via function: ' . __FUNCTION__, $this->text_domain ),
				'action' => 'created'
			)
		);

		return $mapping_object;

	}

}
