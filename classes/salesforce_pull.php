<?php
/**
 * Class file for the Object_Sync_Sf_Salesforce_Pull class.
 *
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * Pull data from Salesforce into WordPress
 */
class Object_Sync_Sf_Salesforce_Pull {

	protected $wpdb;
	protected $version;
	protected $login_credentials;
	protected $slug;
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
	* @param string $slug
	* @param object $wordpress
	* @param object $salesforce
	* @param object $mappings
	* @param object $logging
	* @param array $schedulable_classes
	* @throws \Exception
	*/
	public function __construct( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $logging, $schedulable_classes ) {
		$this->wpdb                = $wpdb;
		$this->version             = $version;
		$this->login_credentials   = $login_credentials;
		$this->slug                = $slug;
		$this->wordpress           = $wordpress;
		$this->salesforce          = $salesforce;
		$this->mappings            = $mappings;
		$this->logging             = $logging;
		$this->schedulable_classes = $schedulable_classes;

		$this->schedule_name = 'salesforce_pull';
		$this->schedule      = $this->schedule();

		// load the schedule class
		// the schedule needs to just run all the time at its configured intervals because WordPress will never trigger it on its own, ie by creating an object
		$schedule = $this->schedule;
		// create new schedule based on the options for this current class
		// this will use the existing schedule if it already exists; otherwise it'll create one
		$schedule->use_schedule( $this->schedule_name );

		$this->add_actions();

		$this->debug = get_option( 'object_sync_for_salesforce_debug_mode', false );

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

		if ( true === $this->salesforce_pull() ) {
			$code = '200';
			// check to see if anything is in the queue and handle it if it is
			$this->schedule->maybe_handle();
		} else {
			$code = '403';
		}

		if ( ! empty( $_POST ) ) { // linter flags this, but we're not doing anything with the array just checking to see if it is empty
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
			update_option( 'object_sync_for_salesforce_pull_last_sync', current_time( 'timestamp', true ) );
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
		if ( ! class_exists( 'Object_Sync_Sf_Schedule' ) && file_exists( plugin_dir_path( __FILE__ ) . '../vendor/autoload.php' ) ) {
			require_once plugin_dir_path( __FILE__ ) . '../vendor/autoload.php';
			require_once plugin_dir_path( __FILE__ ) . '../classes/schedule.php';
		}
		$schedule       = new Object_Sync_Sf_Schedule( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->wordpress, $this->salesforce, $this->mappings, $this->schedule_name, $this->logging, $this->schedulable_classes );
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
		$pull_throttle = get_option( 'object_sync_for_salesforce_pull_throttle', 5 );
		$last_sync     = get_option( 'object_sync_for_salesforce_pull_last_sync', 0 );

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
			$map_sync_triggers = $salesforce_mapping['sync_triggers']; // this sets which Salesforce triggers are allowed for the mapping
			$type              = $salesforce_mapping['salesforce_object']; // this sets the salesfore object type for the SOQL query

			$soql = $this->get_pull_query( $type, $salesforce_mapping );

			// get_pull_query returns null if it has no matching fields
			if ( null === $soql ) {
				continue;
			}

			// Execute query
			// have to cast it to string to make sure it uses the magic method
			// we don't want to cache this because timestamps
			$results = $sfapi->query(
				(string) $soql,
				array(
					'cache' => false,
				)
			);

			$response     = $results['data'];
			$version_path = wp_parse_url( $sfapi->get_api_endpoint(), PHP_URL_PATH );

			$sf_last_sync = get_option( 'object_sync_for_salesforce_pull_last_sync_' . $type, null );
			$last_sync    = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );

			if ( ! isset( $response['errorCode'] ) ) {
				// Write items to the queue.
				foreach ( $response['records'] as $result ) {

					// if this record is new as of the last sync, use the create trigger
					if ( isset( $result['CreatedDate'] ) && $result['CreatedDate'] > $last_sync ) {
						$sf_sync_trigger = $this->mappings->sync_sf_create;
					} else {
						$sf_sync_trigger = $this->mappings->sync_sf_update;
					}

					// Only queue when the record's trigger is configured for the mapping
					// these are bit operators, so we leave out the strict
					if ( isset( $map_sync_triggers ) && isset( $sf_sync_trigger ) && in_array( $sf_sync_trigger, $map_sync_triggers ) ) { // wp or sf crud event
						$data = array(
							'object_type'     => $type,
							'object'          => $result,
							'mapping'         => $salesforce_mapping,
							'sf_sync_trigger' => $sf_sync_trigger, // use the appropriate trigger based on when this was created
						);

						// default is pull is allowed
						$pull_allowed = true;

						// if the current fieldmap does not allow create, we need to check if there is a fieldmap for the Salesforce object Id. if not, set pull_allowed to false.
						if ( isset( $map_sync_triggers ) && ! in_array( $this->mappings->sync_sf_create, $map_sync_triggers ) ) {
							$object_map = $this->mappings->load_by_salesforce( $result['Id'] );
							if ( empty( $object_map ) ) {
								$pull_allowed = false;
							}
						}

						// Hook to allow other plugins to prevent a pull per-mapping.
						// Putting the pull_allowed hook here will keep the queue from storing data when it is not supposed to store it
						$pull_allowed = apply_filters( 'object_sync_for_salesforce_pull_object_allowed', $pull_allowed, $type, $result, $sf_sync_trigger, $salesforce_mapping );

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
							update_option( 'object_sync_for_salesforce_pull_last_sync_' . $type, current_time( 'timestamp', true ) );
							continue;
						}

						// Initialize the queue with the data for this record and save
						$this->schedule->data( array( $data ) );
						$this->schedule->save()->dispatch();
						// Update the last pull sync timestamp for this record type to avoid re-processing in case of error
						$last_sync_pull_trigger = DateTime::createFromFormat( 'Y-m-d\TH:i:s+', $result[ $salesforce_mapping['pull_trigger_field'] ], new DateTimeZone( 'UTC' ) );
						update_option( 'object_sync_for_salesforce_pull_last_sync_' . $type, $last_sync_pull_trigger->format( 'U' ) );
					}
				}

				// Handle requests larger than the batch limit (usually 2000).
				$next_records_url = isset( $response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $response['nextRecordsUrl'] ) : false;

				while ( $next_records_url ) {
					// shouldn't cache this either. it's going into the queue if it exists anyway.
					$new_results  = $sfapi->api_call(
						$next_records_url,
						array(),
						'GET',
						array(
							'cache' => false,
						)
					);
					$new_response = $new_results['data'];
					if ( ! isset( $new_response['errorCode'] ) ) {
						// Write items to the queue.
						foreach ( $new_response['records'] as $result ) {
							// if this record is new as of the last sync, use the create trigger
							if ( isset( $result['CreatedDate'] ) && $result['CreatedDate'] > $last_sync ) {
								$sf_sync_trigger = $this->mappings->sync_sf_create;
							} else {
								$sf_sync_trigger = $this->mappings->sync_sf_update;
							}

							// Only queue when the record's trigger is configured for the mapping
							// these are bit operators, so we leave out the strict
							if ( isset( $map_sync_triggers ) && isset( $sf_sync_trigger ) && in_array( $sf_sync_trigger, $map_sync_triggers ) ) { // wp or sf crud event
								$data = array(
									'object_type'     => $type,
									'object'          => $result,
									'mapping'         => $salesforce_mapping,
									'sf_sync_trigger' => $sf_sync_trigger, // use the appropriate trigger based on when this was created
								);

								// Initialize the queue with the data for this record and save
								$this->schedule->data( array( $data ) );
								$this->schedule->save()->dispatch();
								// Update the last pull sync timestamp for this record type to avoid re-processing in case of error
								$last_sync_pull_trigger = DateTime::createFromFormat( 'Y-m-d\TH:i:s+', $result[ $salesforce_mapping['pull_trigger_field'] ], new DateTimeZone( 'UTC' ) );
								update_option( 'object_sync_for_salesforce_pull_last_sync_' . $type, $last_sync_pull_trigger->format( 'U' ) );
							}
						}
					}

					$next_records_url = isset( $new_response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $new_response['nextRecordsUrl'] ) : false;
				}
			} else {

				// create log entry for failed pull
				$status = 'error';
				// translators: placeholders are: 1) the server error code, and 2) the name of the Salesforce object
				$title = sprintf( esc_html__( 'Error: %1$s %2$s', 'object-sync-for-salesforce' ),
					absint( $response['errorCode'] ),
					esc_attr( $salesforce_mapping['salesforce_object'] )
				);

				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
					$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
				}

				$logging->setup(
					$title,
					$response['message'],
					$sf_mapping['sync_triggers'],
					'',
					$status
				);

			} // End if().
		} // End foreach().
	}

	/**
	* Given a SObject type name, build an SOQL query to include all fields for all
	* SalesforceMappings mapped to that SObject.
	*
	* @param string $type
	*   e.g. "Contact", "Account", etc.
	*
	* @return Object_Sync_Sf_Salesforce_Select_Query or null if no mappings or no mapped fields
	*   were found.
	*
	* @see Object_Sync_Sf_Mapping::get_mapped_fields
	* @see Object_Sync_Sf_Mapping::get_mapped_record_types
	*/
	private function get_pull_query( $type, $salesforce_mapping = array() ) {
		$mapped_fields       = array();
		$mapped_record_types = array();

		$mappings = $this->mappings->get_fieldmaps(
			null,
			array(
				'salesforce_object' => $type,
			)
		);

		// Iterate over each field mapping to determine our query parameters.
		foreach ( $mappings as $mapping ) {

			// only use fields that come from Salesforce to WordPress, or that sync
			$mapped_fields = array_merge(
				$mapped_fields,
				$this->mappings->get_mapped_fields(
					$mapping,
					array( $this->mappings->direction_sync, $this->mappings->direction_sf_wordpress )
				)
			);

			// If Record Type is specified, restrict query.
			$mapping_record_types = $this->mappings->get_mapped_record_types( $mapping );

			// If Record Type is not specified for a given mapping, ensure query is unrestricted.
			if ( empty( $mapping_record_types ) ) {
				$mapped_record_types = false;
			} elseif ( is_array( $mapped_record_types ) ) {
				$mapped_record_types = array_merge( $mapped_record_types, $mapping_record_types );
			}
		} // End foreach().

		// There are no field mappings configured to pull data from Salesforce so
		// move on to the next mapped object. Prevents querying unmapped data.
		if ( empty( $mapped_fields ) ) {
			return null;
		}

		$soql = new Object_Sync_Sf_Salesforce_Select_Query( $type );

		// Convert field mappings to SOQL.
		$soql->fields = array_merge(
			$mapped_fields,
			array(
				'Id'                                      => 'Id',
				$salesforce_mapping['pull_trigger_field'] => $salesforce_mapping['pull_trigger_field'],
			)
		);

		// these are bit operators, so we leave out the strict
		if ( in_array( $this->mappings->sync_sf_create, $salesforce_mapping['sync_triggers'] ) ) {
			$soql->fields['CreatedDate'] = 'CreatedDate';
		}

		// If no lastupdate, get all records, else get records since last pull.
		// this should be what keeps it from getting all the records, whether or not they've ever been updated
		// we also use the option for when the plugin was installed, and don't go back further than that by default

		$sf_activate_time = get_option( 'object_sync_for_salesforce_activate_time', '' );
		$sf_last_sync     = get_option( 'object_sync_for_salesforce_pull_last_sync_' . $type, null );
		if ( $sf_last_sync ) {
			$last_sync = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );
			$soql->add_condition( $salesforce_mapping['pull_trigger_field'], $last_sync, '>' );
		} else {
			$activated = gmdate( 'Y-m-d\TH:i:s\Z', $sf_activate_time );
			$soql->add_condition( $salesforce_mapping['pull_trigger_field'], $activated, '>' );
			// put a hook in here to let devs go retroactive if they want, and sync data from before plugin was activated
		}

		// Order by the trigger field, requesting the oldest records first
		$soql->order = array(
			$salesforce_mapping['pull_trigger_field'] => 'ASC',
		);

		return $soql;

	}

	/**
	* Get deleted records from salesforce.
	* Note that deletions can only be queried via REST with an API version >= 29.0.
	*
	*/
	private function get_deleted_records() {

		$sfapi = $this->salesforce['sfapi'];

		// the drupal module runs a check_merged_records call right here. but it seems to be an invalid SOQL query.
		// we are not incorporating that part of this branch at this time

		// Load all unique SF record types that we have mappings for.
		foreach ( $this->mappings->get_fieldmaps() as $salesforce_mapping ) {

			$type = $salesforce_mapping['salesforce_object'];

			$mappings = $this->mappings->get_fieldmaps(
				null,
				array(
					'salesforce_object' => $type,
				)
			);

			// Iterate over each field mapping to determine our query parameters.
			foreach ( $mappings as $mapping ) {

				$last_delete_sync = get_option( 'object_sync_for_salesforce_pull_delete_last_' . $type, current_time( 'timestamp', true ) );
				$now              = current_time( 'timestamp', true );
				update_option( 'object_sync_for_salesforce_pull_delete_last_' . $type, $now );

				// get_deleted() constraint: startDate cannot be more than 30 days ago
				// (using an incompatible date may lead to exceptions).
				$last_delete_sync = $last_delete_sync > ( current_time( 'timestamp', true ) - 2505600 ) ? $last_delete_sync : ( current_time( 'timestamp', true ) - 2505600 );

				// get_deleted() constraint: startDate must be at least one minute greater
				// than endDate.
				$now = $now > ( $last_delete_sync + 60 ) ? $now : $now + 60;

				// need to be using gmdate for salesforce call
				$last_delete_sync_sf = gmdate( 'Y-m-d\TH:i:s\Z', $last_delete_sync );
				$now_sf              = gmdate( 'Y-m-d\TH:i:s\Z', $now );

				// salesforce call
				$deleted = $sfapi->get_deleted( $type, $last_delete_sync_sf, $now_sf );

				if ( empty( $deleted['data']['deletedRecords'] ) ) {
					continue;
				}

				foreach ( $deleted['data']['deletedRecords'] as $result ) {

					$sf_sync_trigger = $this->mappings->sync_sf_delete;

					// salesforce seriously returns Id for update requests and id for delete requests and this makes no sense but maybe one day they might change it somehow?
					if ( ! isset( $result['Id'] ) && isset( $result['id'] ) ) {
						$result['Id'] = $result['id'];
					}
					$data = array(
						'object_type'     => $type,
						'object'          => $result,
						'mapping'         => $mapping,
						'sf_sync_trigger' => $sf_sync_trigger, // sf delete trigger
					);

					// Hook to allow other plugins to prevent a pull per-mapping.
					// Putting the pull_allowed hook here will keep the queue from storing data when it is not supposed to store it
					$pull_allowed = apply_filters( 'object_sync_for_salesforce_pull_object_allowed', true, $type, $result, $sf_sync_trigger, $salesforce_mapping );

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

					$this->schedule->push_to_queue( $data );
					$this->schedule->save()->dispatch();

				}

				update_option( 'object_sync_for_salesforce_pull_delete_last_' . $type, current_time( 'timestamp', true ) );

			} // End foreach().
		} // End foreach().
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
		$sfapi   = $this->salesforce['sfapi'];
		$object  = $sfapi->api_call( 'sobjects/' . $object_type . '/' . $salesforce_id );
		$mapping = $this->mappings->get_fieldmaps(
			null,
			array(
				'salesforce_object' => $object_type,
				'wordpress_object'  => $wordpress_object,
			)
		);
		$this->salesforce_pull_process_records( $object_type, $object['data'], $mapping[0], $this->mappings->sync_sf_update );
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
		$exception       = false;

		$seconds = $this->schedule->get_schedule_frequency_seconds( $this->schedule_name ) + 60;

		$transients_to_delete = array();

		foreach ( $salesforce_mappings as $salesforce_mapping ) {

			// this returns the row that maps the individual Salesforce row to the individual WordPress row
			if ( isset( $object['Id'] ) ) {
				$mapping_object = $this->mappings->load_by_salesforce( $object['Id'] );
			} else {
				// if we don't have a Salesforce object id, we've got no business doing stuff in WordPress
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
					$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
				}

				$title = sprintf( esc_html__( 'Error: Salesforce Pull: unable to process queue item because it has no Salesforce Id.', 'object-sync-for-salesforce' ) );

				$logging->setup(
					$title,
					print_r( $object, true ), // log whatever we have in the event of this error, so print the array
					$sf_sync_trigger,
					$status
				);
				return;
			}

			// if there's already a connection between the objects, $mapping_object will be an array
			// if it's not already connected (ie on create), the array will be empty

			// hook to allow other plugins to define or alter the mapping object
			$mapping_object = apply_filters( 'object_sync_for_salesforce_pull_mapping_object', $mapping_object, $object, $mapping );

			// we already have the data from Salesforce at this point; we just need to work with it in WordPress
			$synced_object = array(
				'salesforce_object' => $object,
				'mapping_object'    => $mapping_object,
				'mapping'           => $mapping,
			);

			$structure = $this->wordpress->get_wordpress_table_structure( $salesforce_mapping['wordpress_object'] );
			$object_id = $structure['id_field'];

			$op = '';

			// are these objects already connected in WordPress?
			if ( isset( $mapping_object['id'] ) ) {
				$is_new                      = false;
				$mapping_object_id_transient = $mapping_object['id'];
			} else {
				// there is not a mapping object for this WordPress object id yet
				// check for that transient with the currently pushing id
				$is_new                      = true;
				$mapping_object_id_transient = get_transient( 'salesforce_pushing_object_id' );
			}

			// Drupal only does a salesforce_pull flag, but we might as well do push and pull because WordPress
			$salesforce_pushing = (int) get_transient( 'salesforce_pushing_' . $mapping_object_id_transient );
			if ( 1 === $salesforce_pushing ) {
				$transients_to_delete[] = $mapping_object_id_transient;
				continue;
			}

			// deleting mapped objects
			if ( $sf_sync_trigger == $this->mappings->sync_sf_delete ) { // trigger is a bit operator
				if ( isset( $mapping_object['id'] ) ) {

					set_transient( 'salesforce_pulling_' . $mapping_object['id'], 1, $seconds );
					set_transient( 'salesforce_pulling_object_id', $mapping_object['id'] );

					$op              = 'Delete';
					$wordpress_check = $this->mappings->load_by_wordpress( $mapping_object['wordpress_object'], $mapping_object['wordpress_id'] );
					if ( count( $wordpress_check ) === count( $wordpress_check, COUNT_RECURSIVE ) ) {
						try {
							$result = $this->wordpress->object_delete( $salesforce_mapping['wordpress_object'], $mapping_object['wordpress_id'] );
						} catch ( WordpressException $e ) {
							$status = 'error';
							// create log entry for failed delete
							if ( isset( $this->logging ) ) {
								$logging = $this->logging;
							} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
								$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
							}

							// translators: placeholders are: 1) what operation is happening, 2) the name of the WordPress object type, 3) the WordPress id field name, 4) the WordPress object id value, 5) the name of the Salesforce object, 6) the Salesforce Id value
							$title = sprintf( esc_html__( 'Error: %1$s WordPress %2$s with %3$s of %4$s (%5$s %6$s)', 'object-sync-for-salesforce' ),
								esc_attr( $op ),
								esc_attr( $salesforce_mapping['wordpress_object'] ),
								esc_attr( $object_id ),
								esc_attr( $mapping_object['wordpress_id'] ),
								esc_attr( $salesforce_mapping['salesforce_object'] ),
								esc_attr( $mapping_object['salesforce_id'] )
							);

							$logging->setup(
								$title,
								$e->getMessage(),
								$sf_sync_trigger,
								$mapping_object['wordpress_id'],
								$status
							);

							if ( false === $hold_exceptions ) {
								throw $e;
							}
							if ( empty( $exception ) ) {
								$exception = $e;
							} else {
								$my_class  = get_class( $e );
								$exception = new $my_class( $e->getMessage(), $e->getCode(), $exception );
							}

							// hook for pull fail
							do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

						} // End try().

						if ( ! isset( $e ) ) {
							// create log entry for successful delete if the result had no errors
							$status = 'success';
							if ( isset( $this->logging ) ) {
								$logging = $this->logging;
							} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
								$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
							}

							// translators: placeholders are: 1) what operation is happening, 2) the name of the WordPress object type, 3) the WordPress id field name, 4) the WordPress object id value, 5) the name of the Salesforce object, 6) the Salesforce Id value
							$title = sprintf( esc_html__( 'Success: %1$s WordPress %2$s with %3$s of %4$s (%5$s %6$s)', 'object-sync-for-salesforce' ),
								esc_attr( $op ),
								esc_attr( $salesforce_mapping['wordpress_object'] ),
								esc_attr( $object_id ),
								esc_attr( $mapping_object['wordpress_id'] ),
								esc_attr( $salesforce_mapping['salesforce_object'] ),
								esc_attr( $mapping_object['salesforce_id'] )
							);

							$logging->setup(
								$title,
								'',
								$sf_sync_trigger,
								$mapping_object['wordpress_id'],
								$status
							);

							// hook for pull success
							do_action( 'object_sync_for_salesforce_pull_success', $op, $result, $synced_object );
						}
					} else {
						$more_ids = sprintf( '<p>' . esc_html__( 'The WordPress record was not deleted because there are multiple Salesforce IDs that match this WordPress ID. They are:', 'object-sync-for-salesforce' ) );
						$i        = 0;
						foreach ( $wordpress_check as $match ) {
							$i++;
							$more_ids .= sprintf( $match['salesforce_id'] );
							if ( count( $wordpress_check ) !== $i ) {
								$more_ids .= sprintf( ', ' );
							} else {
								$more_ids .= sprintf( '.</p>' );
							}
						}

						$more_ids .= sprintf( '<p>' . esc_html__( 'The map row between this Salesforce object and the WordPress object, as stored in the WordPress database, will be deleted, and this Salesforce object has been deleted, but the WordPress object row will remain untouched.', 'object-sync-for-salesforce' ) . '</p>' );

						$status = 'notice';
						if ( isset( $this->logging ) ) {
							$logging = $this->logging;
						} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
							$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
						}

						// translators: placeholders are: 1) what operation is happening, 2) the name of the WordPress object type, 3) the WordPress id field name, 4) the WordPress object id value, 5) the name of the Salesforce object, 6) the Salesforce Id value
						$title = sprintf( esc_html__( 'Notice: %1$s %2$s with %3$s of %4$s (%5$s %6$s) did not delete the WordPress item.', 'object-sync-for-salesforce' ),
							esc_attr( $op ),
							esc_attr( $salesforce_mapping['wordpress_object'] ),
							esc_attr( $object_id ),
							esc_attr( $mapping_object['wordpress_id'] ),
							esc_attr( $salesforce_mapping['salesforce_object'] ),
							esc_attr( $mapping_object['salesforce_id'] )
						);

						$logging->setup(
							$title,
							$more_ids,
							$sf_sync_trigger,
							$mapping_object['wordpress_id'],
							$status
						);
					} // End if().

					// delete the map row from WordPress after the WordPress row has been deleted
					// we delete the map row even if the WordPress delete failed, because the Salesforce object is gone
					$this->mappings->delete_object_map( $mapping_object['id'] );
					// there is no map row if we end this if statement
				} // End if().
				return;
			} // End if().

			// map the Salesforce values to WordPress fields
			$params = $this->mappings->map_params( $mapping, $object, $sf_sync_trigger, false, $is_new );

			// hook to allow other plugins to modify the $params array
			// use hook to map fields between the WordPress and Salesforce objects
			// returns $params.
			$params = apply_filters( 'object_sync_for_salesforce_pull_params_modify', $params, $mapping, $object, $sf_sync_trigger, false, $is_new );

			// if we don't get any params, there are no fields that should be sent to WordPress
			if ( empty( $params ) ) {
				return;
			}

			// if there is a prematch WordPress field - ie email - on the fieldmap object
			if ( isset( $params['prematch'] ) && is_array( $params['prematch'] ) ) {
				$prematch_field_wordpress  = $params['prematch']['wordpress_field'];
				$prematch_field_salesforce = $params['prematch']['salesforce_field'];
				$prematch_value            = $params['prematch']['value'];
				$prematch_methods          = array(
					'method_match'  => $params['prematch']['method_read'],
					'method_create' => $params['prematch']['method_create'],
					'method_update' => $params['prematch']['method_update'],
					'method_read'   => $params['prematch']['method_read'],
				);
				unset( $params['prematch'] );
			}

			// if there is an external key field in salesforce - ie mailchimp user id - on the fieldmap object
			if ( isset( $params['key'] ) && is_array( $params['key'] ) ) {
				$key_field_wordpress  = $params['key']['wordpress_field'];
				$key_field_salesforce = $params['key']['salesforce_field'];
				$key_value            = $params['key']['value'];
				$key_methods          = array(
					'method_match'  => $params['prematch']['method_read'],
					'method_create' => $params['prematch']['method_create'],
					'method_update' => $params['prematch']['method_update'],
					'method_read'   => $params['key']['method_read'],
				);
				unset( $params['key'] );
			}

			// methods to run the wp create or update operations

			if ( true === $is_new ) {

				// setup SF record type. CampaignMember objects get their Campaign's type
				// i am still a bit confused about this
				// we should store this as a meta field on each object, if it meets these criteria
				// we need to store the read/modify attributes because the field doesn't exist in the mapping
				if ( $salesforce_mapping['salesforce_record_type_default'] !== $this->mappings->salesforce_default_record_type && empty( $params['RecordTypeId'] ) && ( 'CampaignMember' !== $salesforce_mapping['salesforce_object'] ) ) {
					$type = $salesforce_mapping['wordpress_object'];
					if ( 'category' === $salesforce_mapping['wordpress_object'] || 'tag' === $salesforce_mapping['wordpress_object'] || 'post_tag' === $salesforce_mapping['wordpress_object'] ) {
						$type = 'term';
					}
					$params['RecordTypeId'] = array(
						'value'         => $salesforce_mapping['salesforce_record_type_default'],
						'method_modify' => 'update_' . $type . '_meta',
						'method_read'   => 'get_' . $type . '_meta',
					);
				}

				try {

					// hook to allow other plugins to modify the $salesforce_id string here
					// use hook to change the object that is being matched to developer's own criteria
					// ex: match a WordPress user based on some other criteria than the predefined ones
					// returns a $salesforce_id.
					// it should keep NULL if there is no match
					// the function that calls this hook needs to check the mapping to make sure the WordPress object is the right type
					$wordpress_id = apply_filters( 'object_sync_for_salesforce_find_wp_object_match', null, $object, $mapping, 'pull' );

					// hook to allow other plugins to do something right before WordPress data is saved
					// ex: run outside methods on an object if it exists, or do something in preparation for it if it doesn't
					do_action( 'object_sync_for_salesforce_pre_pull', $wordpress_id, $mapping, $object, $object_id, $params );

					if ( isset( $prematch_field_salesforce ) || isset( $key_field_salesforce ) || null !== $wordpress_id ) {

						$op = 'Upsert';

						// if either prematch criteria exists, make the values queryable
						if ( isset( $prematch_field_salesforce ) ) {
							$upsert_key     = $prematch_field_wordpress;
							$upsert_value   = $prematch_value;
							$upsert_methods = $prematch_methods;
						} elseif ( isset( $key_field_salesforce ) ) {
							$upsert_key     = $key_field_wordpress;
							$upsert_value   = $key_value;
							$upsert_methods = $key_methods;
						}

						if ( null !== $wordpress_id ) {
							$upsert_key     = $object_id;
							$upsert_value   = $wordpress_id;
							$upsert_methods = array();
						}

						// with the flag at the end, upsert returns a $wordpress_id only
						// we can then check to see if it has a mapping object
						// we should only do this if the above hook didn't already set the $wordpress_id
						if ( null === $wordpress_id ) {
							$wordpress_id = $this->wordpress->object_upsert( $salesforce_mapping['wordpress_object'], $upsert_key, $upsert_value, $upsert_methods, $params, $salesforce_mapping['push_drafts'], true );
						}

						// find out if there is a mapping object for this WordPress object already
						// don't do it if the WordPress id is 0.
						if ( 0 !== $wordpress_id ) {
							$mapping_object = $this->mappings->get_object_maps(
								array(
									'wordpress_id'     => $wordpress_id,
									'wordpress_object' => $salesforce_mapping['wordpress_object'],
								)
							);
						} else {
							// if the wp object is 0, check to see if there are any object maps that have an id of 0. if there are any, log them.
							$mapping_object_debug = $this->mappings->get_object_maps(
								array(
									'wordpress_id' => $wordpress_id,
								)
							);

							if ( array() !== $mapping_object_debug ) {
								// create log entry to warn about at least one id of 0
								$status = 'error';
								$title  = sprintf( esc_html__( 'Error: There is at least one object map with a WordPress ID of 0.', 'object-sync-for-salesforce' ) );

								if ( 1 === count( $mapping_object_debug ) ) {
									// translators: placeholders are: 1) the mapping object row ID, 2) the name of the WordPress object, 3) the ID of the Salesforce object it was trying to map
									$body = sprintf( esc_html__( 'There is an object map with ID of %1$s and it is mapped to the WordPress %2$s with ID of 0 and the Salesforce object with ID of %3$s', 'object-sync-for-salesforce' ),
										absint( $mapping_object_debug['id'] ),
										esc_attr( $salesforce_mapping['wordpress_object'] ),
										esc_attr( $mapping_object_debug['salesforce_id'] )
									);
								} else {
									$body = sprintf( esc_html__( 'There are multiple object maps with WordPress ID of 0. Their IDs are: ', 'object-sync-for-salesforce' ) . '<ul>' );
									foreach ( $mapping_object_debug as $mapping_object ) {
										// translators: placeholders are: 1) the mapping object row ID, 2) the ID of the Salesforce object, 3) the WordPress object type
										$body .= sprintf( '<li>' . esc_html__( 'Mapping object id: %1$s. Salesforce Id: %2$s. WordPress object type: %3$s', 'object-sync-for-salesforce' ) . '</li>',
											absint( $mapping_object['id'] ),
											esc_attr( $mapping_object['salesforce_id'] ),
											esc_attr( $salesforce_mapping['wordpress_object'] )
										);
									}
									$body .= sprintf( '</ul>' );
								}

								if ( isset( $this->logging ) ) {
									$logging = $this->logging;
								} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
									$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
								}
								$parent = 0;
								$logging->setup(
									$title,
									$body,
									$sf_sync_trigger,
									$parent,
									$status
								);
							} // End if().
						} // End if().

						// there is already a mapping object. don't change the WordPress data to match this new Salesforce record, but log it
						if ( isset( $mapping_object['id'] ) ) {
							// set the transient so that salesforce_push doesn't start doing stuff, then return out of here
							set_transient( 'salesforce_pulling_' . $mapping_object['id'], 1, $seconds );
							set_transient( 'salesforce_pulling_object_id', $mapping_object['id'] );
							// create log entry to indicate that nothing happened
							$status = 'notice';
							// translators: placeholders are: 1) mapping object row id, 2) WordPress object tyoe, 3) individual WordPress item ID, 4) individual Salesforce item ID
							$title = sprintf( esc_html__( 'Notice: Because object map %1$s already exists, WordPress %2$s %3$s was not mapped to Salesforce Id %4$s', 'object-sync-for-salesforce' ),
								absint( $mapping_object['id'] ),
								esc_attr( $salesforce_mapping['wordpress_object'] ),
								absint( $wordpress_id ),
								esc_attr( $object['Id'] )
							);

							// translators: placeholders are 1) WordPress object type, 2) field name for the WordPress id, 3) the WordPress id value, 4) the Salesforce object type, 5) the Salesforce object Id that was modified, 6) the mapping object row id
							$body = sprintf( esc_html__( 'The WordPress %1$s with %2$s of %3$s is already mapped to the Salesforce %4$s with Id of %5$s in the mapping object with id of %6$s. The Salesforce %4$s with Id of %5$s was created or modified in Salesforce, and would otherwise have been mapped to this WordPress record. No WordPress data has been changed to prevent changing data unintentionally.', 'object-sync-for-salesforce' ),
								esc_attr( $salesforce_mapping['wordpress_object'] ),
								esc_attr( $structure['id_field'] ),
								absint( $wordpress_id ),
								esc_attr( $salesforce_mapping['salesforce_object'] ),
								esc_attr( $object['Id'] ),
								absint( $mapping_object['id'] )
							);

							if ( isset( $this->logging ) ) {
								$logging = $this->logging;
							} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
								$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
							}
							// if we know the WordPress object id we can put it in there
							if ( null !== $wordpress_id ) {
								$parent = $wordpress_id;
							} else {
								$parent = 0;
							}
							$logging->setup(
								$title,
								$body,
								$sf_sync_trigger,
								$parent,
								$status
							);
							// exit out of here without saving any data in WordPress
							return;
						} // End if().

						// right here we should set the pulling transient
						// this means we have to create the mapping object here as well, and update it with the correct IDs after successful response
						// create the mapping object between the rows
						$mapping_object_id = $this->create_object_map( $object, $this->mappings->generate_temporary_id( 'pull' ), $mapping );
						set_transient( 'salesforce_pulling_' . $mapping_object_id, 1, $seconds );
						set_transient( 'salesforce_pulling_object_id', $mapping_object_id );
						$mapping_object = $this->mappings->get_object_maps(
							array(
								'id' => $mapping_object_id,
							)
						);

						// now we can upsert the object in wp if we've gotten to this point
						// this command will either create or update the object
						$result = $this->wordpress->object_upsert( $salesforce_mapping['wordpress_object'], $upsert_key, $upsert_value, $upsert_methods, $params, $salesforce_mapping['push_drafts'] );

					} else {
						// No key or prematch field exists on this field map object, create a new object in WordPress.
						$op                = 'Create';
						$mapping_object_id = $this->create_object_map( $object, $this->mappings->generate_temporary_id( 'pull' ), $mapping );
						set_transient( 'salesforce_pulling_' . $mapping_object_id, 1, $seconds );
						set_transient( 'salesforce_pulling_object_id', $mapping_object_id );
						$mapping_object = $this->mappings->get_object_maps(
							array(
								'id' => $mapping_object_id,
							)
						);

						$result = $this->wordpress->object_create( $salesforce_mapping['wordpress_object'], $params );
					} // End if().
				} catch ( WordpressException $e ) {
					// create log entry for failed create or upsert
					$status = 'error';

					// translators: placeholders are: 1) what operation is happening, and 2) the name of the WordPress object
					$title = sprintf( esc_html__( 'Error: %1$s %2$s', 'object-sync-for-salesforce' ),
						esc_attr( $op ),
						esc_attr( $salesforce_mapping['wordpress_object'] )
					);

					if ( null !== $salesforce_id ) {
						$title .= ' ' . $salesforce_id;
					}

					// translators: placeholders are: 1) the name of the Salesforce object, and 2) Id of the Salesforce object
					$title .= sprintf( esc_html__( ' (Salesforce %1$s with Id of %2$s)', 'object-sync-for-salesforce' ),
						$salesforce_mapping['salesforce_object'],
						$object['Id']
					);

					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
						$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
					}

					// if we know the WordPress object id we can put it in there
					if ( null !== $wordpress_id ) {
						$parent = $wordpress_id;
					} else {
						$parent = 0;
					}

					$logging->setup(
						$title,
						$e->getMessage(),
						$sf_sync_trigger,
						$parent,
						$status
					);

					if ( false === $hold_exceptions ) {
						throw $e;
					}
					if ( empty( $exception ) ) {
						$exception = $e;
					} else {
						$my_class  = get_class( $e );
						$exception = new $my_class( $e->getMessage(), $e->getCode(), $exception );
					}

					// hook for pull fail
					do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

					return;
				} // End try().

				// set $wordpress_data to the query result
				$wordpress_data = $result['data'];
				if ( isset( $wordpress_data[ "$object_id" ] ) ) {
					$wordpress_id = $wordpress_data[ "$object_id" ];
				} else {
					$wordpress_id = 0;
				}

				// WordPress crud call was successful
				// this means the object has already been created/updated in WordPress
				// this is not redundant because this is where it creates the object mapping rows in WordPress if the object does not already have one (we are still inside $is_new === TRUE here)

				if ( empty( $result['errors'] ) ) {
					$status = 'success';

					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
						$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
					}

					// translators: placeholders are: 1) what operation is happening, 2) the name of the WordPress object type, 3) the WordPress id field name, 4) the WordPress object id value, 5) the name of the Salesforce object, 6) the Salesforce Id value
					$title = sprintf( esc_html__( 'Success: %1$s %2$s with %3$s of %4$s (Salesforce %5$s Id of %6$s)', 'object-sync-for-salesforce' ),
						esc_attr( $op ),
						esc_attr( $salesforce_mapping['wordpress_object'] ),
						esc_attr( $object_id ),
						esc_attr( $wordpress_id ),
						esc_attr( $salesforce_mapping['salesforce_object'] ),
						esc_attr( $object['Id'] )
					);

					$logging->setup(
						$title,
						'',
						$sf_sync_trigger,
						$wordpress_id,
						$status
					);

					// update that mapping object
					$mapping_object['wordpress_id'] = $wordpress_id;
					$mapping_object                 = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

					// hook for pull success
					do_action( 'object_sync_for_salesforce_pull_success', $op, $result, $synced_object );
				} else {

					// create log entry for failed create or upsert
					// this is part of the drupal module but i am failing to understand when it would ever fire, since the catch should catch the errors
					// if we see this in the log entries, we can understand what it does, but probably not until then
					$status = 'error';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
						$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
					}

					if ( is_object( $wordpress_id ) ) {
						// print this array because if this happens, something weird has happened and we want to log whatever we have
						$wordpress_id = print_r( $wordpress_id, true );
					}

					// translators: placeholders are: 1) what operation is happening, 2) the name of the Salesforce object type, 3) the Salesforce object Id value
					$title = sprintf( esc_html__( 'Error syncing: %1$s to WordPress (Salesforce %2$s Id %3$s)', 'object-sync-for-salesforce' ),
						esc_attr( $op ),
						esc_attr( $salesforce_mapping['salesforce_object'] ),
						esc_attr( $object['Id'] )
					);

					// translators: placeholders are: 1) the name of the WordPress object type, 2) the WordPress id field name, 3) the WordPress id field value, 4) the array of errors
					$body = sprintf( '<p>' . esc_html__( 'Object: %1$s with %2$s of %3$s', 'object-sync-for-salesforce' ) . '</p><p>' . esc_html__( 'Message: ', 'object-sync-for-salesforce' ) . '%4$s',
						esc_attr( $salesforce_mapping['wordpress_object'] ),
						esc_attr( $object_id ),
						esc_attr( $wordpress_id ),
						print_r( $result['errors'], true ) // if we get this error, we need to know whatever we have
					);

					$logging->setup(
						$title,
						$body,
						$sf_sync_trigger,
						$wordpress_id,
						$status
					);

					// hook for pull fail
					do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

					return;
				} // End if().
			} elseif ( false === $is_new ) {

				// right here we should set the pulling transient
				set_transient( 'salesforce_pulling_' . $mapping_object['id'], 1, $seconds );
				set_transient( 'salesforce_pulling_object_id', $mapping_object['id'] );

				// there is an existing object link
				// if the last sync is greater than the last time this object was updated by Salesforce, skip it
				// this keeps us from doing redundant syncs
				// because SF stores all DateTimes in UTC.
				$mapping_object['object_updated'] = current_time( 'mysql' );

				$pull_trigger_field = $salesforce_mapping['pull_trigger_field'];
				$pull_trigger_value = $object[ $pull_trigger_field ];

				try {

					// hook to allow other plugins to do something right before WordPress data is saved
					// ex: run outside methods on an object if it exists, or do something in preparation for it if it doesn't
					do_action( 'object_sync_for_salesforce_pre_pull', $mapping_object['wordpress_id'], $mapping, $object, $object_id, $params );

					$op     = 'Update';
					$result = $this->wordpress->object_update( $salesforce_mapping['wordpress_object'], $mapping_object['wordpress_id'], $params );

					$mapping_object['last_sync_status']  = $this->mappings->status_success;
					$mapping_object['last_sync_message'] = esc_html__( 'Mapping object updated via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__;

					$status = 'success';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
						$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
					}

					// translators: placeholders are: 1) what operation is happening, 2) the name of the WordPress object type, 3) the WordPress id field name, 4) the WordPress object id value, 5) the name of the Salesforce object, 6) the Salesforce Id value
					$title = sprintf( esc_html__( 'Success: %1$s %2$s with %3$s of %4$s (Salesforce %5$s Id of %6$s)', 'object-sync-for-salesforce' ),
						esc_attr( $op ),
						esc_attr( $salesforce_mapping['wordpress_object'] ),
						esc_attr( $object_id ),
						esc_attr( $mapping_object['wordpress_id'] ),
						esc_attr( $salesforce_mapping['salesforce_object'] ),
						esc_attr( $object['Id'] )
					);

					$logging->setup(
						$title,
						'',
						$sf_sync_trigger,
						$mapping_object['wordpress_id'],
						$status
					);

					// hook for pull success
					do_action( 'object_sync_for_salesforce_pull_success', $op, $result, $synced_object );

				} catch ( WordpressException $e ) {
					// create log entry for failed update
					$status = 'error';
					if ( isset( $this->logging ) ) {
						$logging = $this->logging;
					} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
						$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version );
					}

					// translators: placeholders are: 1) what operation is happening, 2) the name of the WordPress object, 3) the WordPress id field name, 4) the WordPress object id value, 5) the name of the Salesforce object, 6) the Salesforce Id value
					$title .= sprintf( esc_html__( 'Error: %1$s %2$s with %3$s of %4$s (Salesforce %5$s with Id of %6$s)', 'object-sync-for-salesforce' ),
						esc_attr( $op ),
						esc_attr( $salesforce_mapping['wordpress_object'] ),
						esc_attr( $object_id ),
						esc_attr( $mapping_object['wordpress_id'] ),
						esc_attr( $salesforce_mapping['salesforce_object'] ),
						esc_attr( $object['Id'] )
					);

					$logging->setup(
						$title,
						$e->getMessage(),
						$sf_sync_trigger,
						$mapping_object['wordpress_id'],
						$status
					);

					$mapping_object['last_sync_status']  = $this->mappings->status_error;
					$mapping_object['last_sync_message'] = $e->getMessage();

					if ( false === $hold_exceptions ) {
						throw $e;
					}
					if ( empty( $exception ) ) {
						$exception = $e;
					} else {
						$my_class  = get_class( $e );
						$exception = new $my_class( $e->getMessage(), $e->getCode(), $exception );
					}

					// hook for pull fail
					do_action( 'object_sync_for_salesforce_pull_fail', $op, $result, $synced_object );

				} // End try().

				// need to move these into the success check

				// maybe can check to see if we actually updated anything in WordPress
				// tell the mapping object - whether it is new or already existed - how we just used it
				$mapping_object['last_sync_action'] = 'pull';
				$mapping_object['last_sync']        = current_time( 'mysql' );

				// update that mapping object. the Salesforce data version will be set here as well because we set it earlier
				$result = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );
				// end of the if statement for is_new & update or create trigger
				// this keeps stuff from running too many times, and also keeps it from using the wrong methods. we don't need a generic } else { here at this time.
			} // End if().
		} // End foreach().

		// delete transients that we've already processed
		foreach ( $transients_to_delete as $mapping_object_id_transient ) {
			delete_transient( 'salesforce_pushing_' . $mapping_object_id_transient );
		}

		$pushing_id = get_transient( 'salesforce_pushing_object_id' );
		if ( in_array( $pushing_id, $transients_to_delete, true ) ) {
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
	*   Array of the salesforce object's data
	* @param string $wordpress_id
	*   Unique identifier for the WordPress object
	* @param array $field_mapping
	*   The row that maps the object types together, including which fields match which other fields
	*
	* @return int $wpdb->insert_id
	*   This is the database row for the map object
	*
	*/
	private function create_object_map( $salesforce_object, $wordpress_id, $field_mapping ) {
		// Create object map and save it
		$mapping_object = $this->mappings->create_object_map(
			array(
				'wordpress_id'      => $wordpress_id, // wordpress unique id
				'salesforce_id'     => $salesforce_object['Id'], // salesforce unique id. we don't care what kind of object it is at this point
				'wordpress_object'  => $field_mapping['wordpress_object'], // keep track of what kind of wp object this is
				'last_sync'         => current_time( 'mysql' ),
				'last_sync_action'  => 'pull',
				'last_sync_status'  => $this->mappings->status_success,
				'last_sync_message' => esc_html__( 'Mapping object created via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__,
				'action'            => 'created',
			)
		);

		return $mapping_object;

	}

}
