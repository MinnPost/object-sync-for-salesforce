<?php
/**
 * Pull data from Salesforce into WordPress
 *
 * @class   Object_Sync_Sf_Salesforce_Pull
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Salesforce_Pull class.
 */
class Object_Sync_Sf_Salesforce_Pull {

	/**
	 * Current version of the plugin
	 *
	 * @var string
	 */
	public $version;

	/**
	 * The main plugin file
	 *
	 * @var string
	 */
	public $file;

	/**
	 * Global object of `$wpdb`, the WordPress database
	 *
	 * @var object
	 */
	public $wpdb;

	/**
	 * The plugin's slug so we can include it when necessary
	 *
	 * @var string
	 */
	public $slug;

	/**
	 * The plugin's prefix when saving options to the database
	 *
	 * @var string
	 */
	public $option_prefix;

	/**
	 * Login credentials for the Salesforce API; comes from wp-config or from the plugin settings
	 *
	 * @var array
	 */
	public $login_credentials;

	/**
	 * Array of what classes in the plugin can be scheduled to occur with `wp_cron` events
	 *
	 * @var array
	 */
	public $schedulable_classes;

	/**
	 * Object_Sync_Sf_Queue class
	 *
	 * @var object
	 */
	public $queue;

	/**
	 * Object_Sync_Sf_Logging class
	 *
	 * @var object
	 */
	public $logging;

	/**
	 * Object_Sync_Sf_Mapping class
	 *
	 * @var object
	 */
	public $mappings;

	/**
	 * Object_Sync_Sf_WordPress class
	 *
	 * @var object
	 */
	public $wordpress;

	/**
	 * Object_Sync_Sf_Salesforce class
	 * This contains Salesforce API methods
	 *
	 * @var array
	 */
	public $salesforce;

	/**
	 * Object_Sync_Sf_Pull_Options class
	 *
	 * @var object
	 */
	public $pull_options;

	/**
	 * Object_Sync_Sf_Sync_Transients class
	 *
	 * @var object
	 */
	public $sync_transients;

	/**
	 * The name of the ActionScheduler queue
	 *
	 * @var string
	 */
	public $schedule_name;

	/**
	 * Whether to batch SOQL queries
	 *
	 * @var bool
	 */
	private $batch_soql_queries;

	/**
	 * Minimum size of a SOQL batch
	 *
	 * @var int
	 */
	private $min_soql_batch_size;

	/**
	 * Maximum size of a SOQL batch
	 *
	 * @var int
	 */
	private $max_soql_size;

	/**
	 * Types of Salesforce records that can be merged
	 *
	 * @var array
	 */
	public $mergeable_record_types;

	/**
	 * Whether the plugin is in debug mode
	 *
	 * @var bool
	 */
	public $debug;

	/**
	 * Constructor for pull class
	 */
	public function __construct() {
		$this->version             = object_sync_for_salesforce()->version;
		$this->file                = object_sync_for_salesforce()->file;
		$this->wpdb                = object_sync_for_salesforce()->wpdb;
		$this->slug                = object_sync_for_salesforce()->slug;
		$this->option_prefix       = object_sync_for_salesforce()->option_prefix;
		$this->login_credentials   = object_sync_for_salesforce()->login_credentials;
		$this->schedulable_classes = object_sync_for_salesforce()->schedulable_classes;

		$this->queue      = object_sync_for_salesforce()->queue;
		$this->logging    = object_sync_for_salesforce()->logging;
		$this->mappings   = object_sync_for_salesforce()->mappings;
		$this->wordpress  = object_sync_for_salesforce()->wordpress;
		$this->salesforce = object_sync_for_salesforce()->salesforce;

		$this->pull_options    = new Object_Sync_Sf_Pull_Options();
		$this->sync_transients = new Object_Sync_Sf_Sync_Transients();

		$this->schedule_name = 'salesforce_pull';

		// To be clear: we should only ever set this to true if Salesforce actually starts to reliably support it instead of generally ignoring it.
		$this->batch_soql_queries = $this->batch_soql_queries( false );

		// Maximum offset size for a SOQL query to Salesforce
		// See: https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_offset.htm
		// From Salesforce: "The maximum offset is 2,000 rows. Requesting an offset greater than 2,000 results in a NUMBER_OUTSIDE_VALID_RANGE error.".
		$this->min_soql_batch_size = 200; // batches cannot be smaller than 200 records.
		$this->max_soql_size       = 2000;

		$this->mergeable_record_types = array( 'Lead', 'Contact', 'Account' );

		// Create action hooks for WordPress objects. We run this after plugins are loaded in case something depends on another plugin.
		add_action( 'plugins_loaded', array( $this, 'add_actions' ) );

		// deprecated actions.
		$this->deprecated_actions();

		// use the option value for whether we're in debug mode.
		$this->debug = filter_var( get_option( $this->option_prefix . 'debug_mode', false ), FILTER_VALIDATE_BOOLEAN );
	}

	/**
	 * Whether to use the batchSize parameter on SOQL queries
	 *
	 * @param bool $batch_soql_queries whether to batch the queries.
	 * @return bool $batch_soql_queries
	 */
	private function batch_soql_queries( $batch_soql_queries ) {
		// as of version 34.0, the Salesforce REST API accepts a batchSize option on the Sforce-Call-Options header.
		if ( version_compare( $this->login_credentials['rest_api_version'], '34.0', '<' ) ) {
			$batch_soql_queries = false;
		}
		// otherwise, return whatever the plugin's default value is.
		// this allows us to decide to support query batching if it is ever not absurdly bad.
		return $batch_soql_queries;
	}

	/**
	 * Create the action hooks based on what object maps exist from the admin settings
	 * route is http://example.com/wp-json/salesforce-rest-api/pull/ plus params we decide to accept.
	 */
	public function add_actions() {

		// ajax hook.
		add_action( 'wp_ajax_salesforce_pull_webhook', array( $this, 'salesforce_pull_webhook' ) );

		// action-scheduler needs two hooks: one to check for records, and one to process them.
		add_action( $this->option_prefix . 'pull_check_records', array( $this, 'salesforce_pull' ), 10 );
		add_action( $this->option_prefix . 'pull_process_records', array( $this, 'salesforce_pull_process_records' ), 10, 3 );
	}

	/**
	 * Deprecated actions
	 */
	public function deprecated_actions() {
		// previous option names.
		add_filter( 'object_sync_for_salesforce_pull_option_legacy_key', array( $this, 'deprecated_pull_option_names' ), 10, 2 );
	}

	/**
	 * Modify legacy named individual option records for sync operations
	 *
	 * @param string $key the plugin's suggested key name.
	 * @param array  $params the array of parameters to make the key.
	 * @return mixed $value the value of the item. False if it's empty.
	 * @deprecated   this was added in 2.1.0 to upgrade old option keys, but will be removed in a future version.
	 */
	public function deprecated_pull_option_names( $key, $params ) {
		if ( $this->option_prefix . 'pull_last_id' === $key ) {
			$key = $this->option_prefix . 'last_pull_id';
		}
		if ( isset( $params['object_type'] ) ) {
			if ( $this->option_prefix . 'pull_current_query_' . $params['object_type'] === $key ) {
				$key = $this->option_prefix . 'currently_pulling_query_' . $params['object_type'];
			}
		}
		return $key;
	}

	/**
	 * REST API callback for salesforce pull. Returns status of 200 for successful
	 * attempt or 403 for a failed pull attempt (SF not authorized, threshhold
	 * reached, etc.
	 *
	 * @param WP_REST_Request $request This is a merged object of all the arguments from the API request.
	 * @return array
	 * code: 201
	 * data:
	 *   success : true
	 */
	public function salesforce_pull_webhook( WP_REST_Request $request ) {

		// run a pull request and then run the schedule if anything is in there.
		$data = $this->salesforce_pull();

		// salesforce_pull currently returns true if it runs successfully.
		if ( true === $data ) {
			$code = '201';
			// check to see if anything is in the queue and handle it if it is
			// single task for action-scheduler to check for data.
			$this->queue->add(
				$this->schedulable_classes[ $this->schedule_name ]['initializer'],
				array(),
				$this->schedule_name
			);
		} else {
			$code = '403';
		}

		$result = array(
			'code' => $code,
			'data' => array(
				'success' => $data,
			),
		);

		return $result;
	}

	/**
	 * Callback for the standard pull process used by webhooks and cron.
	 */
	public function salesforce_pull() {
		$sfapi = $this->salesforce['sfapi'];

		if ( true === $this->salesforce['is_authorized'] && true === $this->check_throttle() ) {

			$this->get_updated_records();
			$this->get_merged_records();
			$this->get_deleted_records();

			// Store this request time for the throttle check.
			$this->pull_options->set( 'last_sync', '', '', time() );
			return true;

		} else {
			// No pull happened.
			return false;
		}
	}

	/**
	 * Determines if the Salesforce pull should be allowed, or throttled.
	 * Prevents too many pull processes from running at once.
	 *
	 * @return bool Returns false if the time elapsed between recent pulls is too short.
	 */
	private function check_throttle() {
		$pull_throttle = $this->pull_options->get( 'throttle', '', '', 5 );
		$last_sync     = $this->pull_options->get( 'last_sync', '', '', 0 );

		if ( time() > ( $last_sync + $pull_throttle ) ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Pull updated records from Salesforce and place them in the queue.
	 * Executes a SOQL query based on defined mappings, loops through the results,
	 * and places each updated SF object into the queue for later processing.
	 * We copy the convention from the Drupal module here, and run a separate SOQL query for each type of object in SF
	 * If we return something here, it's because there is an error.
	 */
	private function get_updated_records() {
		$sfapi = $this->salesforce['sfapi'];
		foreach ( $this->mappings->get_fieldmaps( null, $this->mappings->active_fieldmap_conditions ) as $salesforce_mapping ) {
			$map_sync_triggers = (array) $salesforce_mapping['sync_triggers']; // this sets which Salesforce triggers are allowed for the mapping.
			$type              = $salesforce_mapping['salesforce_object']; // this sets the Salesforce object type for the SOQL query.

			// Setting true as third parameter so we do not change the offset.
			$soql = $this->get_pull_query( $type, $salesforce_mapping, true );

			// get_pull_query returns null if it has no matching fields.
			if ( null === $soql ) {
				continue;
			}

			// we don't want to cache this because timestamps.
			$query_options = array(
				'cache' => false,
			);

			// if we are batching soql queries, let's do it.
			if ( true === $this->batch_soql_queries ) {
				// pull query batch size option name.
				$pull_query_batch_size = $this->pull_options->get( 'query_batch_size', '', '', '' );
				if ( '' !== $pull_query_batch_size ) {
					$batch_size = filter_var( $this->pull_options->get( 'query_batch_size', '', '', $this->min_soql_batch_size ), FILTER_VALIDATE_INT );
				} else {
					// old limit value.
					// Deprecated in 2.0.3.
					$batch_size = filter_var( $this->pull_options->get( 'query_limit', '', '', $this->min_soql_batch_size ), FILTER_VALIDATE_INT );
				}
				$batch_size = filter_var(
					$batch_size,
					FILTER_VALIDATE_INT,
					array(
						'options' => array(
							'min_range' => $this->min_soql_batch_size,
							'max_range' => $this->max_soql_size,
						),
					)
				);
				if ( false !== $batch_size ) {
					// the Sforce-Query-Options header is a comma delimited string.
					$query_options['headers']['Sforce-Query-Options'] = 'batchSize=' . $batch_size;
				}
			}

			// run the __toString method to convert the SOQL query object to a string.
			$soql_string = (string) $soql;

			// Execute query.
			$results = $sfapi->query(
				$soql_string,
				$query_options
			);

			$response     = $results['data'];
			$version_path = wp_parse_url( $sfapi->get_api_endpoint(), PHP_URL_PATH );

			$sf_last_sync = $this->pull_options->get( 'last_sync', $type, $salesforce_mapping['id'], null );
			$last_sync    = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );

			if ( ! isset( $response['errorCode'] ) && 0 < count( $response['records'] ) ) {
				// Write items to the queue.
				foreach ( $response['records'] as $key => $result ) {
					// if we've already pulled, or tried to pull, the current ID, don't do it again.
					$last_id = $this->pull_options->get( 'last_id', '', $salesforce_mapping['id'], '' );
					if ( $last_id === $result['Id'] ) {
						if ( true === $this->debug ) {
							// create log entry for failed pull.
							$status = 'debug';
							$title  = sprintf(
								// translators: placeholders are: 1) the log status, 2) the Salesforce ID.
								esc_html__( '%1$s: Salesforce ID %2$s has already been attempted.', 'object-sync-for-salesforce' ),
								ucfirst( esc_attr( $status ) ),
								esc_attr( $result['Id'] )
							);
							$debug = array(
								'title'   => $title,
								'message' => esc_html__( 'This ID has already been attempted so it was not pulled again.', 'object-sync-for-salesforce' ),
								'trigger' => 0,
								'parent'  => '',
								'status'  => $status,
							);
							$this->logging->setup( $debug );
						}

						continue;
					}

					// if this record is new as of the last sync, use the create trigger.
					if ( isset( $result['CreatedDate'] ) && $result['CreatedDate'] > $last_sync ) {
						$sf_sync_trigger = $this->mappings->sync_sf_create;
					} else {
						$sf_sync_trigger = $this->mappings->sync_sf_update;
					}

					// Only queue when the record's trigger is configured for the mapping.
					if ( isset( $map_sync_triggers ) && isset( $sf_sync_trigger ) && in_array( $sf_sync_trigger, $map_sync_triggers, true ) ) { // wp or sf crud event.
						$data = array(
							'object_type'     => $type,
							'object'          => $result,
							'mapping'         => $salesforce_mapping,
							'sf_sync_trigger' => $sf_sync_trigger, // use the appropriate trigger based on when this was created.
						);

						$pull_allowed = $this->is_pull_allowed( $type, $result, $sf_sync_trigger, $salesforce_mapping, $map_sync_triggers );

						if ( false === $pull_allowed ) {
							// update the current state so we don't end up on the same record again if the loop fails.
							$this->pull_options->set( 'last_id', '', $salesforce_mapping['id'], $result['Id'] );
							if ( true === $this->debug ) {
								// create log entry for failed pull.
								$status = 'debug';
								$title  = sprintf(
									// translators: placeholders are: 1) the log status, 2) the Salesforce ID.
									esc_html__( '%1$s: Salesforce ID %2$s is not allowed.', 'object-sync-for-salesforce' ),
									ucfirst( esc_attr( $status ) ),
									esc_attr( $result['Id'] )
								);
								$debug = array(
									'title'   => $title,
									'message' => esc_html__( 'This ID is not pullable so it was skipped.', 'object-sync-for-salesforce' ),
									'trigger' => $sf_sync_trigger,
									'parent'  => '',
									'status'  => $status,
								);
								$this->logging->setup( $debug );
							}
							continue;
						}

						if ( true === $this->debug ) {
							// create log entry for queue addition.
							$status = 'debug';
							$title  = sprintf(
								// translators: placeholders are: 1) the log status, 2) the Salesforce ID.
								esc_html__( '%1$s: Start to add Salesforce ID %2$s to the queue', 'object-sync-for-salesforce' ),
								ucfirst( esc_attr( $status ) ),
								esc_attr( $result['Id'] )
							);
							$message = sprintf(
								// translators: 1) is the name of the hook that was called, 2) is the Salesforce object type, 3) is the ID for the object map, 4) is the event trigger that is running, and 5) is the name of the schedule that is running.
								esc_html__( 'This record is being sent to the queue. The hook name is %1$s. The arguments for the hook are: object type %2$s, object map ID %3$s, sync trigger %4$s. The schedule name is %5$s.', 'object-sync-for-salesforce' ),
								esc_attr( $this->schedulable_classes[ $this->schedule_name ]['callback'] ),
								esc_attr( $type ),
								absint( $salesforce_mapping['id'] ),
								$sf_sync_trigger,
								$this->schedule_name
							);
							$debug = array(
								'title'   => $title,
								'message' => $message,
								'trigger' => $sf_sync_trigger,
								'parent'  => '',
								'status'  => $status,
							);
							$this->logging->setup( $debug );
						}

						// add a queue action to save data from salesforce.
						$this->queue->add(
							$this->schedulable_classes[ $this->schedule_name ]['callback'],
							array(
								'object_type'     => $type,
								'object'          => $result['Id'],
								'sf_sync_trigger' => $sf_sync_trigger,
							),
							$this->schedule_name
						);
						// update the current state so we don't end up on the same record again if the loop fails.
						$this->pull_options->set( 'last_id', '', $salesforce_mapping['id'], $result['Id'] );
						if ( true === $this->debug ) {
							// create log entry for successful pull.
							$status = 'debug';
							$title  = sprintf(
								// translators: placeholders are: 1) the log status, 2) the Salesforce ID.
								esc_html__( '%1$s: Salesforce ID %2$s has been successfully pulled into the queue.', 'object-sync-for-salesforce' ),
								ucfirst( esc_attr( $status ) ),
								esc_attr( $result['Id'] )
							);
							$debug = array(
								'title'   => $title,
								'message' => esc_html__( 'This ID has been successfully pulled and added to the queue for processing. It cannot be pulled again without being modified again.', 'object-sync-for-salesforce' ),
								'trigger' => $sf_sync_trigger,
								'parent'  => '',
								'status'  => $status,
							);
							$this->logging->setup( $debug );
						} // end of debug
					} // end if
				} // end foreach

				// we're done with the foreach. save  the LastModifiedDate of the last item processed, we will store it if the query has results with an additional offset.
				$last_date_for_query = isset( $result['LastModifiedDate'] ) ? $result['LastModifiedDate'] : '';

				if ( true === $this->batch_soql_queries ) {
					// if applicable, process the next batch of records.
					$this->get_next_record_batch( $last_sync, $salesforce_mapping, $map_sync_triggers, $type, $version_path, $query_options, $response );
				} else {
					// Here, we check and see if the query has results with an additional offset.
					// If it does, we regenerate the query so it will have an offset next time it runs.
					// If it does not, we clear the query if we've just processed the last row.
					// this allows us to run an offset on the stored query instead of clearing it.
					$does_next_offset_have_results = $this->check_offset_query( $type, $salesforce_mapping, $query_options );
					end( $response['records'] );
					$last_record_key = key( $response['records'] );
					if ( true === $does_next_offset_have_results ) {
						// store the LastModifiedDate of the last item processed, or the current time if it isn't there.
						$this->increment_current_type_datetime( $type, $last_date_for_query, $salesforce_mapping['id'] );
						// increment SOQL query to run.
						$soql = $this->get_pull_query( $type, $salesforce_mapping );
					} elseif ( $last_record_key === $key ) {
						// clear the stored query. we don't need to offset and we've finished the loop.
						$this->clear_current_type_query( $type, $salesforce_mapping['id'] );
					}
				} // end if
			} elseif ( ! isset( $response['errorCode'] ) && 0 === count( $response['records'] ) && false === $this->batch_soql_queries ) {
				// only update/clear these option values if we are currently still processing a query.
				$current_query = $this->pull_options->get( 'current_query', $type, $salesforce_mapping['id'], '' );
				if ( '' !== $current_query ) {
					$this->clear_current_type_query( $type, $salesforce_mapping['id'] );
				}
				// try to check for specific error codes from Salesforce.
			} elseif ( isset( $response['errorCode'] ) && 'INVALID_FIELD' === $response['errorCode'] ) {
				// set up log entry.
				$status    = 'error';
				$log_title = sprintf(
					// translators: placeholders are: 1) the log status, 2) the server error code, and 3) the name of the Salesforce object.
					esc_html__( '%1$s: %2$s when pulling %3$s data from Salesforce. Check and resave the fieldmap.', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $response['errorCode'] ),
					esc_attr( $salesforce_mapping['salesforce_object'] )
				);
				$log_body = '<p>' . esc_html__( 'A field may have been deleted from Salesforce, or it has otherwise become invalid. You may need to check and resave your fieldmap.', 'object-sync-for-salesforce' ) . '</p>';

				// if it's an invalid field, try to clear the cached query so it can try again next time.
				$current_query = $this->pull_options->get( 'current_query', $type, $salesforce_mapping['id'], '' );
				if ( '' !== $current_query ) {
					$this->clear_current_type_query( $type, $salesforce_mapping['id'] );
					$log_title .= esc_html__( ' The stored query has been cleared.', 'object-sync-for-salesforce' );
					$log_body  .= '<p>' . esc_html__( 'The currently stored query for this object type has been deleted.', 'object-sync-for-salesforce' ) . '</p>';
				}

				$log_body .= sprintf(
					// translators: placeholders are: 1) the Salesforce API response message.
					'<p>' . esc_html__( 'Salesforce API Response: %1$s', 'object-sync-for-salesforce' ) . '</p>',
					$response['message']
				);
				$result = array(
					'title'   => $log_title,
					'message' => $log_body,
					'trigger' => 0,
					'parent'  => '',
					'status'  => $status,
				);
				$this->logging->setup( $result );
			} elseif ( isset( $response['errorCode'] ) ) {
				// create log entry for failed pull.
				$status = 'error';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status, 2) the server error code, and 3) the name of the Salesforce object.
					esc_html__( '%1$s: %2$s when pulling %3$s data from Salesforce', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $response['errorCode'] ),
					esc_attr( $salesforce_mapping['salesforce_object'] )
				);
				$result = array(
					'title'   => $title,
					'message' => $response['message'],
					'trigger' => 0,
					'parent'  => '',
					'status'  => $status,
				);
				$this->logging->setup( $result );
				return $result;

			} // End if() statement.
		} // End foreach() loop.
	}

	/**
	 * Pull the next batch of records from the Salesforce API, if applicable
	 * Executes a nextRecordsUrl SOQL query based on the previous result,
	 * and places each updated SF object into the queue for later processing.
	 *
	 * @param datetime $last_sync when it was last synced.
	 * @param array    $salesforce_mapping the fieldmap.
	 * @param array    $map_sync_triggers the sync trigger bit values.
	 * @param string   $type the Salesforce object type.
	 * @param string   $version_path the API path for the Salesforce version.
	 * @param array    $query_options the SOQL query options.
	 * @param array    $response the previous response.
	 */
	private function get_next_record_batch( $last_sync, $salesforce_mapping, $map_sync_triggers, $type, $version_path, $query_options, $response ) {
		// Handle next batch of records if it exists.
		$next_records_url = isset( $response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $response['nextRecordsUrl'] ) : false;
		while ( $next_records_url ) {
			// shouldn't cache this either. it's going into the queue if it exists anyway.
			$new_results  = $sfapi->api_call(
				$next_records_url,
				array(),
				'GET',
				$query_options
			);
			$new_response = $new_results['data'];
			if ( ! isset( $new_response['errorCode'] ) ) {
				// Write items to the queue.
				foreach ( $new_response['records'] as $result ) {
					// if this record is new as of the last sync, use the create trigger.
					if ( isset( $result['CreatedDate'] ) && $result['CreatedDate'] > $last_sync ) {
						$sf_sync_trigger = $this->mappings->sync_sf_create;
					} else {
						$sf_sync_trigger = $this->mappings->sync_sf_update;
					}
					// Only queue when the record's trigger is configured for the mapping.
					if ( isset( $map_sync_triggers ) && is_array( $map_sync_triggers ) && isset( $sf_sync_trigger ) && in_array( $sf_sync_trigger, $map_sync_triggers, true ) ) { // wp or sf crud event.
						$data = array(
							'object_type'     => $type,
							'object'          => $result,
							'mapping'         => $salesforce_mapping,
							'sf_sync_trigger' => $sf_sync_trigger, // use the appropriate trigger based on when this was created.
						);
						// add a queue action to save data from salesforce.
						$this->queue->add(
							$this->schedulable_classes[ $this->schedule_name ]['callback'],
							array(
								'object_type'     => $type,
								'object'          => $result['Id'],
								'sf_sync_trigger' => $sf_sync_trigger,
							),
							$this->schedule_name
						);
						// Update the last pull sync timestamp for this record type to avoid re-processing in case of error.
						$last_sync_pull_trigger = DateTime::createFromFormat( 'Y-m-d\TH:i:s+', $result[ $salesforce_mapping['pull_trigger_field'] ], new DateTimeZone( 'UTC' ) );
					}
				}
			}
			$next_records_url = isset( $new_response['nextRecordsUrl'] ) ? str_replace( $version_path, '', $new_response['nextRecordsUrl'] ) : false;
		} // end while loop
	}

	/**
	 * Get the next offset query. If check is true, only see if that query would have results. Otherwise, return the SOQL object.
	 * When batchSize is not in use, run a check with an offset.
	 *
	 * @param string $type the Salesforce object type.
	 * @param array  $salesforce_mapping the map between object types.
	 * @param array  $query_options the options for the SOQL query.
	 * @return object|bool $soql|$does_next_offset_have_results
	 */
	private function check_offset_query( $type, $salesforce_mapping, $query_options ) {

		$soql                          = $this->get_pull_query( $type, $salesforce_mapping );
		$does_next_offset_have_results = false;

		// run the __toString method to convert the SOQL query object to a string.
		$soql_string = (string) $soql;

		$sfapi = $this->salesforce['sfapi'];
		// Execute query
		// have to cast it to string to make sure it uses the magic method
		// we don't want to cache this because timestamps.
		$results = $sfapi->query(
			$soql_string,
			$query_options
		);

		$response = $results['data'];
		if ( ! isset( $response['errorCode'] ) && 0 < count( $response['records'] ) ) {
			$does_next_offset_have_results = true;
		}
		return $does_next_offset_have_results;
	}


	/**
	 * Given a SObject type name, build an SOQL query to include all fields for all
	 * fieldmaps mapped to that SObject.
	 *
	 * @param string $type e.g. "Contact", "Account", etc.
	 * @param array  $salesforce_mapping the fieldmap that maps the two object types.
	 * @param bool   $force_current_offset if true, the will offset not be recalculated and will use the offset of the current query saved on the db, if present.
	 * @return Object_Sync_Sf_Salesforce_Select_Query or null if no mappings or no mapped fields were found.
	 * @see Object_Sync_Sf_Mapping::get_mapped_fields
	 * @see Object_Sync_Sf_Mapping::get_mapped_record_types
	 */
	private function get_pull_query( $type, $salesforce_mapping = array(), $force_current_offset = false ) {
		// we need to determine what to do with saved queries. this is what we currently do but it doesn't work.
		// check if we have a stored next query to run for this type. if so, unserialize it so we have an object.
		$pull_query_running = $this->pull_options->get( 'current_query', $type, $salesforce_mapping['id'], '' );
		if ( '' !== $pull_query_running ) {
			$saved_query = maybe_unserialize( $pull_query_running );
		}

		$mapped_fields       = array();
		$mapped_record_types = array();

		// only use fields that come from Salesforce to WordPress, or that sync.
		$mapped_fields = array_merge(
			$mapped_fields,
			$this->mappings->get_mapped_fields(
				$salesforce_mapping,
				array( $this->mappings->direction_sync, $this->mappings->direction_sf_wordpress )
			)
		);

		// If Record Type is specified, restrict query.
		$mapping_record_types = $this->mappings->get_mapped_record_types( $salesforce_mapping );

		// If Record Type is not specified for a given mapping, ensure query is unrestricted.
		if ( empty( $mapping_record_types ) ) {
			$mapped_record_types = false;
		} elseif ( is_array( $mapped_record_types ) ) {
			$mapped_record_types = array_merge( $mapped_record_types, $mapping_record_types );
		}

		// There are no field mappings configured to pull data from Salesforce so
		// move on to the next mapped object. Prevents querying unmapped data.
		if ( empty( $mapped_fields ) ) {
			return null;
		}

		if ( ! isset( $saved_query ) ) {
			$soql = new Object_Sync_Sf_Salesforce_Select_Query( $type );

			// Convert field mappings to SOQL.
			$soql->fields = array_merge(
				$mapped_fields,
				array(
					'Id' => 'Id',
					$salesforce_mapping['pull_trigger_field'] => $salesforce_mapping['pull_trigger_field'],
				)
			);

			// check if this is a Salesforce create event.
			if ( in_array( $this->mappings->sync_sf_create, (array) $salesforce_mapping['sync_triggers'], true ) ) {
				$soql->fields['CreatedDate'] = 'CreatedDate';
			}

			// Order by the trigger field, requesting the oldest records first.
			$soql->order = array(
				$salesforce_mapping['pull_trigger_field'] => 'ASC',
			);

			// Set a limit on the number of records that can be retrieved from the API at one time.
			$soql->limit = filter_var( $this->pull_options->get( 'query_limit', '', '', 25 ), FILTER_VALIDATE_INT );

			// if there are record types on this fieldmap, use them as a conditional.
			if ( ! empty( $mapped_record_types ) ) {
				$soql->add_condition( 'RecordTypeId', array_values( $mapped_record_types ), 'IN' );
			}
		} else {
			$soql = $saved_query;
		}

		// Get the value for the pull trigger field. Often this will LastModifiedDate. It needs to change when the query gets regenerated after the max offset has been reached.
		$pull_trigger_field_value = $this->get_pull_date_value( $type, $soql, $salesforce_mapping['id'] );

		// we check to see if the stored date is the same as the new one. if it is not, we will want to reset the offset.
		$reset_offset = false;
		$has_date     = false;
		$key          = array_search( $salesforce_mapping['pull_trigger_field'], array_column( $soql->conditions, 'field' ), true );
		if ( false !== $key ) {
			$has_date = true;
			if ( $soql->conditions[ $key ]['value'] !== $pull_trigger_field_value ) {
				$reset_offset = true;
			}
		}

		if ( false === $has_date ) {
			$reset_offset = true;
			$soql->add_condition( $salesforce_mapping['pull_trigger_field'], $pull_trigger_field_value, '>' );
		} else {
			$soql->conditions[ $key ]['value'] = $pull_trigger_field_value;
		}

		// We don't want to change the offset on the first call of get_updated_records function. Otherwise the offset may be added two times and we would lose records...
		if ( false === $force_current_offset ) {
			// Get the value for the SOQL offset. If max has already been reached, it is zero.
			$soql->offset = $this->get_pull_offset( $type, $soql, $reset_offset );
		}

		// add a filter here to modify the query
		// Hook to allow other plugins to modify the SOQL query before it is sent to Salesforce.
		$soql = apply_filters( $this->option_prefix . 'pull_query_modify', $soql, $type, $salesforce_mapping, $mapped_fields );

		// quick example to change the order to descending.
		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		add_filter( 'object_sync_for_salesforce_pull_query_modify', 'change_pull_query', 10, 4 );
		// can always reduce this number if all the arguments are not necessary
		function change_pull_query( $soql, $type, $salesforce_mapping, $mapped_fields ) {
			$soql->order = 'DESC';
			return $soql;
		}
		*/

		// Make sure our SOQL object properties that are arrays are unique. This prevents values added via developer hook from being added repeatedly when a query is cached.
		if ( version_compare( PHP_VERSION, '7.0.8', '>=' ) ) {
			$soql->fields     = array_unique( $soql->fields, SORT_REGULAR );
			$soql->order      = array_unique( $soql->order, SORT_REGULAR );
			$soql->conditions = array_unique( $soql->conditions, SORT_REGULAR );
		} else {
			$soql->fields     = array_map( 'unserialize', array_unique( array_map( 'serialize', $soql->fields ) ) );
			$soql->order      = array_map( 'unserialize', array_unique( array_map( 'serialize', $soql->order ) ) );
			$soql->conditions = array_map( 'unserialize', array_unique( array_map( 'serialize', $soql->conditions ) ) );
		}

		// serialize the currently running SOQL query and store it for this type.
		$serialized_current_query = maybe_serialize( $soql );
		$this->pull_options->set( 'current_query', $type, $salesforce_mapping['id'], $serialized_current_query, false );
		return $soql;
	}


	/**
	 * Determine the offset for the SOQL query to run
	 *
	 * @param string $type e.g. "Contact", "Account", etc.
	 * @param object $soql the SOQL object.
	 * @param bool   $reset whether to reset the offset.
	 */
	private function get_pull_offset( $type, $soql, $reset = false ) {
		// set an offset. if there is a saved offset, add the limit to it and move on. otherwise, use the limit.
		$offset = isset( $soql->offset ) ? $soql->offset + $soql->limit : $soql->limit;
		if ( true === $reset || $offset > $this->max_soql_size ) {
			$offset = 0;
		}
		return $offset;
	}

	/**
	 * Given a SObject type name, determine the datetime value the SOQL object should use to filter results. Often this will be LastModifiedDate.
	 *
	 * @param string $type e.g. "Contact", "Account", etc.
	 * @param object $soql the SOQL object.
	 * @param int    $fieldmap_id is the fieldmap ID that goes with this query.
	 * @return timestamp $pull_trigger_field_value
	 */
	private function get_pull_date_value( $type, $soql, $fieldmap_id = '' ) {
		// If no lastupdate, get all records, else get records since last pull.
		// this should be what keeps it from getting all the records, whether or not they've ever been updated
		// we also use the option for when the plugin was installed, and don't go back further than that by default.

		$sf_activate_time = get_option( $this->option_prefix . 'activate_time', '' );
		$sf_last_sync     = $this->pull_options->get( 'last_sync', $type, $fieldmap_id, null );
		if ( $sf_last_sync ) {
			$pull_trigger_field_value = gmdate( 'Y-m-d\TH:i:s\Z', $sf_last_sync );
		} else {
			$pull_trigger_field_value = gmdate( 'Y-m-d\TH:i:s\Z', $sf_activate_time );
		}

		// Hook to allow other plugins to set the "last pull date" to whenever they want, including a datetime from before the plugin was activated.
		$pull_trigger_field_value = apply_filters( $this->option_prefix . 'change_pull_date_value', $pull_trigger_field_value, $type, $soql, $fieldmap_id );

		// example to use another datetime value.
		// the value needs to be a gmdate, formatted for Salesforce: 'Y-m-d\TH:i:s\Z'.
		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		add_filter( 'object_sync_for_salesforce_change_pull_date_value', 'change_pull_date_value', 10, 5 );
		// can always reduce this number if all the arguments are not necessary
		function change_pull_date_value( $pull_trigger_field_value, $object_type, $soql, $fieldmap_id ) {
			if ( 'Contact' === $object_type  ) {
				// example: go back to 2006-01-01T23:01:01+01:00, which is 1136152861.
				$pull_trigger_field_value = gmdate( 'Y-m-d\TH:i:s\Z', 1136152861 );
			}
			return $pull_trigger_field_value;
		}
		*/

		return $pull_trigger_field_value;
	}

	/**
	 * Get merged records from Salesforce.
	 * Note that merges can currently only work if the Soap API is enabled.
	 */
	private function get_merged_records() {

		$use_soap = $this->salesforce['soap_loaded'];
		if ( true === $use_soap ) {
			$soap = new Object_Sync_Sf_Salesforce_Soap_Partner();
		} else {
			return; // if the REST API ever supports merging, we can do something else in this case.
		}
		$seconds = 60;

		$merged_records = array();

		// Load fieldmaps for mergeable types.
		foreach ( $this->mergeable_record_types as $type ) {
			$mappings = $this->mappings->get_fieldmaps(
				null,
				array_merge(
					$this->mappings->active_fieldmap_conditions,
					array(
						'salesforce_object' => $type,
					)
				),
			);

			// Iterate over each field mapping to determine our query parameters.
			foreach ( $mappings as $salesforce_mapping ) {
				$last_merge_sync = $this->pull_options->get( 'merge_last', $salesforce_mapping['salesforce_object'], $salesforce_mapping['id'], time() );
				$now             = time();
				$this->pull_options->set( 'merge_last', $salesforce_mapping['salesforce_object'], $salesforce_mapping['id'], $now );

				// get_deleted() constraint: startDate cannot be more than 30 days ago
				// (using an incompatible date may lead to exceptions).
				$last_merge_sync = $last_merge_sync > ( time() - 2505600 ) ? $last_merge_sync : ( time() - 2505600 );

				// get_deleted() constraint: startDate must be at least one minute greater
				// than endDate.
				$now = $now > ( $last_merge_sync + 60 ) ? $now : $now + 60;

				// need to be using gmdate for Salesforce call.
				$last_merge_sync_sf = gmdate( 'Y-m-d\TH:i:s\Z', $last_merge_sync );
				$merged             = array();
				// there doesn't appear to be a way to do this in the rest api; for now we'll do soap.
				// the soap query only works immediately following a merge and shortly after.
				if ( true === $use_soap ) {
					$type   = $salesforce_mapping['salesforce_object'];
					$query  = "SELECT Id, isDeleted, masterRecordId FROM $type WHERE masterRecordId != '' AND SystemModStamp > $last_merge_sync_sf";
					$merged = $soap->try_soap( 'queryAll', $query );
					if ( ! empty( $merged->records ) ) {
						$merged = json_decode( wp_json_encode( $merged->records ), true );
					} else {
						continue;
					}

					foreach ( $merged as $result ) {
						$record = array();
						if ( is_array( array_unique( $result['Id'] ) ) ) {
							$record['Id'] = array_unique( $result['Id'] )[0];
						} else {
							$record['Id'] = $result['Id'];
						}
						if ( isset( $result['any'] ) ) {
							libxml_use_internal_errors( true );
							$any = simplexml_load_string( '<?xml version="1.0" standalone="yes"?><root>' . $result['any'] . '</root>' );
							if ( $any ) {
								$json   = wp_json_encode( $any );
								$array  = json_decode( $json, true );
								$record = array_merge( $record, $array );
							}
						}
						$merged_records[] = $record;
						$this->respond_to_salesforce_merge( $type, $record );
					} // End foreach on merged
				} // End if on soap
				if ( ! empty( $merged_records ) ) {
					$this->sync_transients->set( 'salesforce_merged', $type, $salesforce_mapping['id'], $merged_records, $seconds );
				}
			} // End foreach on mappings
		} // end foreach on types
	}

	/**
	 * Respond to Salesforce merge events
	 * This means we update the mapping object to contain the new Salesforce Id, and pull its data
	 *
	 * @param string $object_type what type of Salesforce object it is.
	 * @param array  $merged_record the record that was merged.
	 */
	private function respond_to_salesforce_merge( $object_type, $merged_record ) {
		$op = 'Merge';
		if ( isset( $merged_record['Id'] ) && true === filter_var( $merged_record['sf:IsDeleted'], FILTER_VALIDATE_BOOLEAN ) && '' !== $merged_record['sf:MasterRecordId'] ) {
			$previous_sf_id  = $merged_record['Id'];
			$new_sf_id       = $merged_record['sf:MasterRecordId'];
			$mapping_objects = $this->mappings->load_object_maps_by_salesforce_id( $previous_sf_id );
			foreach ( $mapping_objects as $mapping_object ) {
				$wordpress_type                  = $mapping_object['wordpress_object'];
				$wordpress_id                    = $mapping_object['wordpress_id'];
				$mapping_object['salesforce_id'] = $new_sf_id;
				$mapping_object                  = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

				$status = 'success';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the Salesforce object type, 4) the previous Salesforce Id value, 5) the new Salesforce Id value, 6) the name of the WordPress object, 7) the WordPress id value.
					esc_html__( '%1$s: %2$s Salesforce %3$s objects with Ids %4$s and %5$s were merged (%5$s is the remaining ID. It is mapped to WordPress %6$s with %7$s.)', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					esc_attr( $op ),
					esc_attr( $object_type ),
					esc_attr( $previous_sf_id ),
					esc_attr( $new_sf_id ),
					esc_attr( $wordpress_type ),
					esc_attr( $wordpress_id )
				);
				$result = array(
					'title'   => $title,
					'message' => '',
					'trigger' => 0,
					'parent'  => $wordpress_id,
					'status'  => $status,
				);
				$this->logging->setup( $result );

				// after it has been merged, pull it.
				$result = $this->manual_pull( $object_type, $new_sf_id );

			}
		}
	}

	/**
	 * Get deleted records from salesforce.
	 * Note that deletions can only be queried via REST with an API version >= 29.0.
	 */
	private function get_deleted_records() {

		$sfapi = $this->salesforce['sfapi'];

		// Load all unique SF record types that we have mappings for. This results in a double loop.
		foreach ( $this->mappings->get_fieldmaps( null, $this->mappings->active_fieldmap_conditions ) as $salesforce_mapping ) {

			$map_sync_triggers = (array) $salesforce_mapping['sync_triggers']; // this sets which Salesforce triggers are allowed for the mapping.
			$type              = $salesforce_mapping['salesforce_object']; // this sets the Salesforce object type for the SOQL query.

			$mappings = $this->mappings->get_fieldmaps(
				null,
				array_merge(
					$this->mappings->active_fieldmap_conditions,
					array(
						'salesforce_object' => $type,
					)
				),
			);

			// Iterate over each field mapping to determine our query parameters.
			foreach ( $mappings as $salesforce_mapping ) {

				$last_delete_sync = $this->pull_options->get( 'delete_last', $type, $salesforce_mapping['id'], time() );
				$now              = time();
				$this->pull_options->set( 'delete_last', $type, $salesforce_mapping['id'], $now );

				// get_deleted() constraint: startDate cannot be more than 30 days ago
				// (using an incompatible date may lead to exceptions).
				$last_delete_sync = $last_delete_sync > ( time() - 2505600 ) ? $last_delete_sync : ( time() - 2505600 );

				// get_deleted() constraint: startDate must be at least one minute greater
				// than endDate.
				$now = $now > ( $last_delete_sync + 60 ) ? $now : $now + 60;

				// need to be using gmdate for Salesforce call.
				$last_delete_sync_sf = gmdate( 'Y-m-d\TH:i:s\Z', $last_delete_sync );
				$now_sf              = gmdate( 'Y-m-d\TH:i:s\Z', $now );

				// Salesforce call.
				$deleted = $sfapi->get_deleted( $type, $last_delete_sync_sf, $now_sf );
				$merged  = $this->sync_transients->get( 'salesforce_merged', $type, $salesforce_mapping['id'] );
				if ( false !== $merged && isset( $deleted['data']['deletedRecords'] ) ) {
					foreach ( $merged as $key ) {
						$deleted['data']['deletedRecords'] = array_filter(
							$deleted['data']['deletedRecords'],
							function ( $x ) use ( $key ) {
								if ( ! isset( $x['Id'] ) && isset( $x['id'] ) ) {
									$x['Id'] = $x['id'];
								}
								return $x['Id'] !== $key;
							}
						);
					}
				}

				if ( empty( $deleted['data']['deletedRecords'] ) ) {
					continue;
				}

				foreach ( $deleted['data']['deletedRecords'] as $result ) {

					$sf_sync_trigger = $this->mappings->sync_sf_delete;

					// Salesforce seriously returns Id for update requests and id for delete requests and this makes no sense but maybe one day they might change it somehow?
					if ( ! isset( $result['Id'] ) && isset( $result['id'] ) ) {
						$result['Id'] = $result['id'];
					}
					$data = array(
						'object_type'     => $type,
						'object'          => $result,
						'mapping'         => $salesforce_mapping,
						'sf_sync_trigger' => $sf_sync_trigger, // sf delete trigger.
					);

					// default is pull is allowed.
					$pull_allowed = true;

					// if the current fieldmap does not allow delete, set pull_allowed to false.
					if ( isset( $map_sync_triggers ) && ! in_array( $this->mappings->sync_sf_delete, $map_sync_triggers, true ) ) {
						$pull_allowed = false;
					}

					// Hook to allow other plugins to prevent a pull per-mapping.
					// Putting the pull_allowed hook here will keep the queue from deleting a WordPress record when it is not supposed to delete it.
					$pull_allowed = apply_filters( $this->option_prefix . 'pull_object_allowed', $pull_allowed, $type, $result, $sf_sync_trigger, $salesforce_mapping );

					// example to keep from deleting the WordPress record mapped to the Contact with Id of abcdef.
					/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
					add_filter( 'object_sync_for_salesforce_pull_object_allowed', 'check_user', 10, 5 );
					// can always reduce this number if all the arguments are not necessary
					function check_user( $pull_allowed, $object_type, $object, $sf_sync_trigger, $salesforce_mapping ) {
						if ( 'Contact' === $object_type && 'abcdef' === $object['Id'] ) {
							return false;
						}
					}
					*/

					if ( false === $pull_allowed ) {
						if ( isset( $salesforce_mapping['always_delete_object_maps_on_delete'] ) && ( '1' === $salesforce_mapping['always_delete_object_maps_on_delete'] ) ) {
							$mapping_objects = $this->mappings->load_object_maps_by_salesforce_id( $result['Id'], $salesforce_mapping );
							foreach ( $mapping_objects as $mapping_object ) {
								if ( isset( $mapping_object['id'] ) ) {
									$this->mappings->delete_object_map( $mapping_object['id'] );
								}
							}
						}
						continue;
					}

					// setup the Id and the deletedDate for passing to the queue.
					$deleted_item = array(
						'Id'          => $result['Id'],
						'deletedDate' => $result['deletedDate'],
					);

					// Add a queue action to delete data from WordPress after it has been deleted from Salesforce.
					$this->queue->add(
						$this->schedulable_classes[ $this->schedule_name ]['callback'],
						array(
							'object_type'     => $type,
							'object'          => $deleted_item,
							'sf_sync_trigger' => $sf_sync_trigger,
						),
						$this->schedule_name
					);

				} // end foreach on deleted records.

				$this->pull_options->set( 'delete_last', $type, $salesforce_mapping['id'], time() );

			} // End foreach() loop on relevant mappings.
		} // End foreach() loop on active mappings.
	}

	/**
	 * Method for ajax hooks to call for pulling manually
	 *
	 * @param string $object_type the Salesforce object type.
	 * @param string $salesforce_id the Salesforce record ID.
	 * @return array $result
	 */
	public function manual_pull( $object_type, $salesforce_id = '' ) {

		if ( '' === $salesforce_id ) {
			$sf_sync_trigger = $this->mappings->sync_sf_create;
		} else {
			$sf_sync_trigger = $this->mappings->sync_sf_update;
		}

		$results = $this->salesforce_pull_process_records( $object_type, $salesforce_id, $sf_sync_trigger );

		$code = '201';
		foreach ( $results as $result ) {
			if ( ! isset( $result['status'] ) || 'success' !== $result['status'] ) {
				$code = '403';
			}
		}

		$result = array(
			'code' => $code,
			'data' => array(
				'success' => $results,
			),
		);

		return $result;
	}

	/**
	 * Sync WordPress objects and Salesforce objects from the queue using the REST API.
	 *
	 * @param string       $object_type Type of Salesforce object.
	 * @param array|string $object The Salesforce data or its Id value.
	 * @param int          $sf_sync_trigger Trigger for this sync.
	 * @return bool true or exit the method
	 * @throws Object_Sync_Sf_Exception Exception $e.
	 */
	public function salesforce_pull_process_records( $object_type, $object, $sf_sync_trigger ) {

		$sfapi = $this->salesforce['sfapi'];

		if ( is_string( $object ) ) {
			$salesforce_id = $object;
			// Load the Salesforce object data to save in WordPress. We need to make sure that this data does not get cached, which is consistent with other pull behavior as well as in other methods in this class.
			// We should only do this if we're not trying to delete data in WordPress - otherwise, we'll get a 404 from Salesforce and the delete will fail.
			if ( $sf_sync_trigger !== $this->mappings->sync_sf_delete ) {
				$object = $sfapi->object_read(
					$object_type,
					$salesforce_id,
					array(
						'cache' => false,
					)
				)['data'];
			} else {
				if ( true === $this->debug ) {
					// create log entry for failed pull.
					$status = 'debug';
					$title  = sprintf(
						// translators: placeholders are: 1) the log status.
						esc_html__( '%1$s: we are missing a deletedDate attribute here, but are expected to delete an item.', 'object-sync-for-salesforce' ),
						ucfirst( esc_attr( $status ) )
					);
					$debug = array(
						'title'   => $title,
						'message' => '',
						'trigger' => $sf_sync_trigger,
						'parent'  => '',
						'status'  => $status,
					);
					$this->logging->setup( $debug );
				}

				$object = array(
					'Id'          => $object,
					'deletedDate' => gmdate( 'Y-m-d\TH:i:s\Z' ), // this should hopefully never happen.
				);
			} // deleted records should always come through with their own deletedDate value.
		} elseif ( is_object( $object ) ) {
			$salesforce_id = $object['Id'];
		}

		$mapping_conditions = array(
			'salesforce_object' => $object_type,
		);

		if ( isset( $object['RecordTypeId'] ) && $object['RecordTypeId'] !== $this->mappings->salesforce_default_record_type ) {
			// use this condition to filter the mappings, at that time.
			$mapping_conditions['salesforce_record_type'] = $object['RecordTypeId'];
		}

		$salesforce_mappings = $this->mappings->get_fieldmaps(
			null,
			array_merge(
				$this->mappings->active_fieldmap_conditions,
				$mapping_conditions,
			),
		);

		$frequencies = $this->queue->get_frequencies();
		$seconds     = reset( $frequencies )['frequency'] + 60;

		$transients_to_delete = array();

		$results = array();

		foreach ( $salesforce_mappings as $fieldmap_key => $salesforce_mapping ) {
			$transients_to_delete[ $fieldmap_key ] = array(
				'fieldmap'   => $salesforce_mapping,
				'transients' => array(),
			);
			// this returns the row or rows that map an individual Salesforce row to an individual WordPress row.
			if ( isset( $object['Id'] ) ) {
				$mapping_objects = $this->mappings->load_object_maps_by_salesforce_id( $object['Id'], $salesforce_mapping );
			} else {
				$mapping_objects = $this->mappings->load_object_maps_by_salesforce_id( $salesforce_id, $salesforce_mapping );
				// if we don't have a Salesforce object id, we've got no business doing stuff in WordPress.
				$status = 'error';
				$title  = sprintf(
					// translators: placeholders are: 1) the log status.
					esc_html__( '%1$s: Salesforce Pull: unable to process queue item because it has no Salesforce Id.', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) )
				);
				$result = array(
					'title'   => $title,
					'message' => print_r( $object, true ), // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
					'trigger' => $sf_sync_trigger,
					'parent'  => 0, // parent id goes here but we don't have one, so make it 0.
					'status'  => $status,
				);
				$this->logging->setup( $result );
				$results[] = $result;

				// update the mapping objects.
				foreach ( $mapping_objects as $mapping_object ) {
					if ( isset( $mapping_object['id'] ) ) {
						$mapping_object['last_sync_status']  = $this->mappings->status_error;
						$mapping_object['last_sync_message'] = isset( $object['message'] ) ? esc_html( $object['message'] ) : esc_html__( 'unable to process queue item because it has no Salesforce Id.', 'object-sync-for-salesforce' );
						$mapping_object['last_sync']         = current_time( 'mysql' );
						$mapping_object                      = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );
					}
				}

				continue;
			}

			// Is this Salesforce object already connected to at least one WordPress object?
			if ( isset( $mapping_objects[0]['id'] ) ) {
				$is_new = false;
			} else {
				// there is not a mapping object for this Salesforce object id yet
				// check to see if there is a pushing transient for that Salesforce Id.
				$is_new = true;
			}

			// by default, we're not doing a merge.
			$is_merge = false;
			$merged   = $this->sync_transients->get( 'salesforce_merged', $object_type, $salesforce_mapping['id'] );
			if ( false !== $merged ) {
				$key = array_search( $object['Id'], array_column( $merged, 'Id' ), true );
				if ( false !== $key ) {
					$is_merge = true;
					$is_new   = false;
				}
			}

			$mapping_object_id_transient = $this->sync_transients->get( 'salesforce_pushing_object_id', '', $salesforce_mapping['id'] );
			if ( false === $mapping_object_id_transient ) {
				$mapping_object_id_transient = $object['Id'];
			}
			// Here's where we check to see whether the current record was updated by a push from this plugin or not. Here's how it works:
			// 1. A record gets pushed to Salesforce by this plugin.
			// 2. We save the LastModifiedDate from the Salesforce result as a timestamp in the transient.
			// 3. Below, in addition to checking the Salesforce Id, we check against $object's LastModifiedDate and if it's not later than the transient value, we skip it because it's still pushing from our activity.
			$salesforce_pushing = (int) $this->sync_transients->get( 'salesforce_pushing_' . $mapping_object_id_transient, '', $salesforce_mapping['id'] );

			if ( 1 !== $salesforce_pushing ) {
				// the format to compare is like this: gmdate( 'Y-m-d\TH:i:s\Z', $salesforce_pushing ).
				if ( $mapping_object_id_transient !== $object['Id'] ) {
					$salesforce_pushing = 0;
				} elseif ( 0 === $salesforce_pushing || ( isset( $object['LastModifiedDate'] ) && strtotime( $object['LastModifiedDate'] ) > $salesforce_pushing ) || ( isset( $object['deletedDate'] ) && strtotime( $object['deletedDate'] ) > $salesforce_pushing ) ) {
					$salesforce_pushing = 0;
				} else {
					$salesforce_pushing = 1;
				}
			} else {
				$salesforce_pushing = 1;
			}

			if ( 1 === $salesforce_pushing ) {
				$transients_to_delete[ $fieldmap_key ]['transients'][] = $mapping_object_id_transient;
				if ( true === $this->debug ) {
					// create log entry for failed pull.
					$status = 'debug';
					$title  = sprintf(
						// translators: placeholders are: 1) the log status, 2) the mapping object ID transient.
						esc_html__( '%1$s: mapping object transient ID %2$s is currently pushing, so we do not pull it.', 'object-sync-for-salesforce' ),
						ucfirst( esc_attr( $status ) ),
						$mapping_object_id_transient
					);
					$debug = array(
						'title'   => $title,
						'message' => '',
						'trigger' => $sf_sync_trigger,
						'parent'  => '',
						'status'  => $status,
					);
					$this->logging->setup( $debug );
				}

				continue;
			}

			$structure               = $this->wordpress->get_wordpress_table_structure( $salesforce_mapping['wordpress_object'] );
			$wordpress_id_field_name = $structure['id_field'];

			// only deal with parameters if we are not deleting.
			if ( ( true === $is_new && $sf_sync_trigger === $this->mappings->sync_sf_create ) || $sf_sync_trigger === $this->mappings->sync_sf_update ) { // trigger is a bit operator
				// map the Salesforce values to WordPress fields.
				$params = $this->mappings->map_params( $salesforce_mapping, $object, $sf_sync_trigger, false, $is_new, $wordpress_id_field_name );

				// hook to allow other plugins to modify the $params array
				// use hook to map fields between the WordPress and Salesforce objects
				// returns $params.
				$params = apply_filters( $this->option_prefix . 'pull_params_modify', $params, $salesforce_mapping, $object, $sf_sync_trigger, false, $is_new );

				// setup prematch parameters.
				$prematch = array();

				// if there is a prematch WordPress field - ie email - on the fieldmap object.
				if ( isset( $params['prematch'] ) && is_array( $params['prematch'] ) ) {
					$prematch['field_wordpress']  = $params['prematch']['wordpress_field'];
					$prematch['field_salesforce'] = $params['prematch']['salesforce_field'];
					$prematch['value']            = $params['prematch']['value'];
					$prematch['methods']          = array(
						'method_match'  => isset( $params['prematch']['method_match'] ) ? $params['prematch']['method_match'] : $params['prematch']['method_read'],
						'method_create' => $params['prematch']['method_create'],
						'method_update' => $params['prematch']['method_update'],
						'method_read'   => $params['prematch']['method_read'],
					);
					unset( $params['prematch'] );
				}

				// if there is an external key field in Salesforce - ie a Mailchimp user id - on the fieldmap object, this should not affect how WordPress handles it is not included in the pull parameters.

				// if we don't get any params, there are no fields that should be sent to WordPress.
				if ( empty( $params ) ) {

					// if the parameters array is empty at this point, we should create a log entry to that effect.
					// I think it should be a debug message, unless we learn from users that it should be raised to an error.
					if ( true === $this->debug ) {
						$status = 'debug';
						$title  = sprintf(
							// translators: %1$s is the log status.
							esc_html__( '%1$s Mapping: according to the current plugin settings, there are no parameters in the current dataset that can be pulled from Salesforce.', 'object-sync-for-salesforce' ),
							ucfirst( esc_attr( $status ) )
						);
						$body = sprintf(
							// translators: placeholders are: 1) the fieldmap row ID, 2) the name of the WordPress object, 3) the name of the Salesforce object.
							'<p>' . esc_html__( 'There is a fieldmap with ID of %1$s and it maps the WordPress %2$s object to the Salesforce %3$s object.', 'object-sync-for-salesforce' ) . '</p>',
							absint( $salesforce_mapping['id'] ),
							esc_attr( $salesforce_mapping['wordpress_object'] ),
							esc_attr( $salesforce_mapping['salesforce_object'] )
						);
						// whether it's a new mapping object or not.
						if ( false === $is_new ) {
							// this one is not new.
							foreach ( $mapping_objects as $mapping_object ) {
								$body .= sprintf(
									// translators: placeholders are: 1) the mapping object row ID, 2) the name of the WordPress object, 3) the ID of the WordPress object, 4) the ID of the Salesforce object it was trying to map.
									'<p>' . esc_html__( 'There is an existing object map with ID of %1$s and it is mapped to the WordPress %2$s with ID of %3$s and the Salesforce object with ID of %4$s.', 'object-sync-for-salesforce' ) . '</p>',
									absint( $mapping_object['id'] ),
									esc_attr( $mapping_object['wordpress_object'] ),
									esc_attr( $mapping_object['wordpress_id'] ),
									esc_attr( $mapping_object['salesforce_id'] )
								);
							}
						} else {
							// this one is new.
							$body .= sprintf(
								// translators: placeholders are: 1) the ID of the Salesforce object, 2) the WordPress object type.
								'<p>' . esc_html__( 'The plugin was trying to pull the Salesforce object with ID of %1$s to the WordPress %2$s object type.', 'object-sync-for-salesforce' ) . '</p>',
								esc_attr( $object['Id'] ),
								esc_attr( $salesforce_mapping['wordpress_object'] )
							);
						}

						$body .= sprintf(
							// translators: placeholders are 1) the object's data that was attempted.
							'<p>' . esc_html__( 'The Salesforce object data that was attempted: %1$s', 'object-sync-for-salesforce' ) . '</p>',
							print_r( $object, true ) // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
						);

						$this->logging->setup(
							$title,
							$body,
							$sf_sync_trigger,
							0,
							$status
						);
					} // end debug mode check.

					continue;
				} // end if params are empty.
			} elseif ( $sf_sync_trigger === $this->mappings->sync_sf_delete ) {
				// this is a deletion. don't deal with parameters.
				$is_new = false;
			} // end checking for create/update/delete.

			// if this Salesforce record is new to WordPress, we can try to create it.
			if ( true === $is_new ) {
				if ( isset( $mapping_objects[0] ) ) {
					$mapping_object = $mapping_objects[0];
				} else {
					$mapping_object = $mapping_objects;
				}
				$synced_object = $this->get_synced_object( $object, $mapping_object, $salesforce_mapping );
				$create        = $this->create_called_from_salesforce( $sf_sync_trigger, $synced_object, $params, $prematch, $wordpress_id_field_name, $seconds );
				$results       = array_merge( $results, $create );
			} elseif ( false === $is_new && false === $is_merge ) {
				// unless we're on a delete, there is already at least one mapping_object['id'] associated with this Salesforce Id
				// right here we should set the pulling transient.
				$this->sync_transients->set( 'salesforce_pulling_' . $object['Id'], '', $salesforce_mapping['id'], 1, $seconds );
				$this->sync_transients->set( 'salesforce_pulling_object_id', '', $salesforce_mapping['id'], $object['Id'] );

				foreach ( $mapping_objects as $mapping_object ) {
					$synced_object = $this->get_synced_object( $object, $mapping_object, $salesforce_mapping );
					// if params is set, this is an update request. if not, it is a delete.
					if ( isset( $params ) ) {
						$update  = $this->update_called_from_salesforce( $sf_sync_trigger, $synced_object, $params, $wordpress_id_field_name, $seconds );
						$results = array_merge( $results, $update );
					} else {
						$delete  = $this->delete_called_from_salesforce( $sf_sync_trigger, $synced_object, $wordpress_id_field_name, $seconds, $mapping_objects );
						$results = array_merge( $results, $delete );
					}
				}
			} elseif ( false === $is_new ) {
				// on merge, we should still update the transient.
				$this->sync_transients->set( 'salesforce_pulling_' . $object['Id'], '', $salesforce_mapping['id'], 1, $seconds );
				$this->sync_transients->set( 'salesforce_pulling_object_id', '', $salesforce_mapping['id'], $object['Id'] );
			}
		} // End foreach() on $salesforce_mappings.

		// delete transients that we've already processed for this Salesforce object.
		foreach ( $transients_to_delete as $key => $value ) {
			$fieldmap_id = $value['fieldmap']['id'];
			$transients  = (array) $value['transients'];
			foreach ( $transients as $transient_end ) {
				$this->sync_transients->delete( 'salesforce_pushing_' . $transient_end, '', $fieldmap_id );
			}
			$pushing_id = $this->sync_transients->get( 'salesforce_pushing_object_id', '', $fieldmap_id );
			if ( in_array( $pushing_id, $transients, true ) ) {
				$this->sync_transients->delete( 'salesforce_pushing_object_id', '', $fieldmap_id );
			}
		}

		return $results;
	}

	/**
	 * Generate the synced_object array
	 *
	 * @param array $object The data for the Salesforce object.
	 * @param array $mapping_object The data for the mapping object between the individual Salesforce and WordPress items.
	 * @param array $salesforce_mapping The data for the fieldmap between the object types.
	 * @return array $synced_object The combined array of these items. It allows for filtering of, at least, the mapping_object.
	 */
	private function get_synced_object( $object, $mapping_object, $salesforce_mapping ) {
		// if there's already a connection between the objects, $mapping_object will be an array at this point
		// if it's not already connected (ie on create), the array will be empty.

		// hook to allow other plugins to define or alter the mapping object.
		$mapping_object = apply_filters( $this->option_prefix . 'pull_mapping_object', $mapping_object, $object, $salesforce_mapping );

		// we already have the data from Salesforce at this point; we just need to work with it in WordPress.
		$synced_object = array(
			'salesforce_object' => $object,
			'mapping_object'    => $mapping_object,
			'mapping'           => $salesforce_mapping,
		);
		return $synced_object;
	}

	/**
	 * Create records in WordPress from a Salesforce pull
	 *
	 * @param string $sf_sync_trigger The current operation's trigger.
	 * @param array  $synced_object Combined data for fieldmap, mapping object, and Salesforce object data.
	 * @param array  $params Array of mapped key value pairs between WordPress and Salesforce fields.
	 * @param array  $prematch Array of criteria to determine what to do on upsert operations.
	 * @param string $wordpress_id_field_name The name of the ID field for this particular WordPress object type.
	 * @param int    $seconds Timeout for the transient value to determine the direction for a sync.
	 * @return array $results Currently this contains an array of log entries for each attempt.
	 * @throws Object_Sync_Sf_Exception Exception $e.
	 */
	private function create_called_from_salesforce( $sf_sync_trigger, $synced_object, $params, $prematch, $wordpress_id_field_name, $seconds ) {

		$salesforce_mapping = $synced_object['mapping'];
		$object             = $synced_object['salesforce_object'];
		// methods to run the wp update operations.
		$results = array();
		$op      = '';

		// setup SF record type. CampaignMember objects get their Campaign's type
		// i am still a bit confused about this
		// we should store this as a meta field on each object, if it meets these criteria
		// we need to store the read/modify attributes because the field doesn't exist in the mapping.
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

		// hook to allow other plugins to modify the $wordpress_id string here
		// use hook to change the object that is being matched to developer's own criteria
		// ex: match a WordPress user based on some other criteria than the predefined ones
		// returns a $wordpress_id.
		// it should keep NULL if there is no match
		// the function that calls this hook needs to check the mapping to make sure the WordPress object is the right type.
		$wordpress_id = apply_filters( $this->option_prefix . 'find_wp_object_match', null, $object, $salesforce_mapping, 'pull' );

		// hook to allow other plugins to do something right before WordPress data is saved
		// ex: run outside methods on an object if it exists, or do something in preparation for it if it doesn't.
		do_action( $this->option_prefix . 'pre_pull', $wordpress_id, $salesforce_mapping, $object, $wordpress_id_field_name, $params );

		$op = $this->check_for_upsert( $prematch, $wordpress_id );

		if ( 'Upsert' === $op ) {
			// if a prematch criteria exists, make the values queryable.
			if ( isset( $prematch['field_salesforce'] ) ) {
				$upsert_key     = $prematch['field_wordpress'];
				$upsert_value   = $prematch['value'];
				$upsert_methods = $prematch['methods'];
			}

			if ( null !== $wordpress_id ) {
				$upsert_key     = $wordpress_id_field_name;
				$upsert_value   = $wordpress_id;
				$upsert_methods = array();
			}

			// with the flag at the end, upsert returns a $wordpress_id only
			// we can then check to see if it has a mapping object
			// we should only do this if the above hook didn't already set the $wordpress_id.
			if ( null === $wordpress_id ) {
				$wordpress_id = $this->wordpress->object_upsert( $salesforce_mapping['wordpress_object'], $upsert_key, $upsert_value, $upsert_methods, $params, $salesforce_mapping['pull_to_drafts'], true );
			}

			// placeholder mapping object.
			$mapping_object = array();

			// find out if there is a mapping object for this WordPress object already
			// don't do it if the WordPress id is 0.
			if ( 0 !== $wordpress_id ) {
				$mapping_objects = $this->mappings->get_all_object_maps(
					array(
						'wordpress_id'     => $wordpress_id,
						'wordpress_object' => $salesforce_mapping['wordpress_object'],
					)
				);
				if ( isset( $mapping_objects[0] ) && is_array( $mapping_objects[0] ) ) {
					$mapping_object = $mapping_objects[0];
				}
			} else {
				// if the wp object is 0, check to see if there are any object maps that have an id of 0. if there are any, log them.
				$mapping_object_debug = $this->mappings->get_all_object_maps(
					array(
						'wordpress_id' => $wordpress_id,
					)
				);

				if ( ! empty( $mapping_object_debug ) ) {
					// create log entry to warn about at least one id of 0.
					$status = 'error';
					$title  = sprintf(
						// translators: placeholders are: 1) the log status.
						esc_html__( '%1$s: There is at least one object map with a WordPress ID of 0.', 'object-sync-for-salesforce' ),
						ucfirst( esc_attr( $status ) )
					);
					if ( 1 === count( $mapping_object_debug ) ) {
						$body = sprintf(
							// translators: placeholders are: 1) the mapping object row ID, 2) the name of the WordPress object, 3) the ID of the Salesforce object it was trying to map.
							esc_html__( 'There is an object map with ID of %1$s and it is mapped to the WordPress %2$s with ID of 0 and the Salesforce object with ID of %3$s', 'object-sync-for-salesforce' ),
							absint( $mapping_object_debug[0]['id'] ),
							esc_attr( $mapping_object_debug[0]['wordpress_object'] ),
							esc_attr( $mapping_object_debug[0]['salesforce_id'] )
						);
					} else {
						$body = sprintf( esc_html__( 'There are multiple object maps with WordPress ID of 0. Their IDs are: ', 'object-sync-for-salesforce' ) . '<ul>' );
						foreach ( $mapping_object_debug as $mapping_object ) {
							$body .= sprintf(
								// translators: placeholders are: 1) the mapping object row ID, 2) the ID of the Salesforce object, 3) the WordPress object type.
								'<li>' . esc_html__( 'Mapping object id: %1$s. Salesforce Id: %2$s. WordPress object type: %3$s', 'object-sync-for-salesforce' ) . '</li>',
								absint( $mapping_object['id'] ),
								esc_attr( $mapping_object['salesforce_id'] ),
								esc_attr( $salesforce_mapping['wordpress_object'] )
							);
						}
						$body .= sprintf( '</ul>' );
					}
					$parent = 0;
					$result = array(
						'title'   => $title,
						'message' => $body,
						'trigger' => $sf_sync_trigger,
						'parent'  => $parent,
						'status'  => $status,
					);
					$this->logging->setup( $result );
					$results[] = $result;
				} // End if() statement.
			} // End if() statement checking for a mapping object for this WordPress object.

			// there is already a mapping object. don't change the WordPress data to match this new Salesforce record, but log it.
			if ( isset( $mapping_object['id'] ) ) {
				// set the transients so that salesforce_push doesn't start doing stuff, then return out of here.
				$this->sync_transients->set( 'salesforce_pulling_' . $mapping_object['salesforce_id'], '', $salesforce_mapping['id'], 1, $seconds );
				$this->sync_transients->set( 'salesforce_pulling_object_id', '', $salesforce_mapping['id'], $mapping_object['salesforce_id'] );
				// create log entry to indicate that nothing happened.
				$status = 'notice';
				$title  = sprintf(
					// translators: placeholders are: 1) log status, 2) mapping object row id, 3) WordPress object tyoe, 4) individual WordPress item ID, 5) individual Salesforce item ID.
					esc_html__( '%1$s: Because object map %2$s already exists, WordPress %3$s %4$s was not mapped to Salesforce Id %5$s', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					absint( $mapping_object['id'] ),
					esc_attr( $salesforce_mapping['wordpress_object'] ),
					absint( $wordpress_id ),
					esc_attr( $object['Id'] )
				);
				$body = sprintf(
					// translators: placeholders are 1) WordPress object type, 2) field name for the WordPress id, 3) the WordPress id value, 4) the Salesforce object type, 5) the Salesforce object Id that was modified, 6) the mapping object row id.
					esc_html__( 'The WordPress %1$s with %2$s of %3$s is already mapped to the Salesforce %4$s with Id of %5$s in the mapping object with id of %6$s. The Salesforce %4$s with Id of %5$s was created or modified in Salesforce, and would otherwise have been mapped to this WordPress record. No WordPress data has been changed to prevent changing data unintentionally.', 'object-sync-for-salesforce' ),
					esc_attr( $salesforce_mapping['wordpress_object'] ),
					esc_attr( $wordpress_id_field_name ),
					absint( $wordpress_id ),
					esc_attr( $salesforce_mapping['salesforce_object'] ),
					esc_attr( $object['Id'] ),
					absint( $mapping_object['id'] )
				);
				// if we know the WordPress object id we can put it in there.
				if ( null !== $wordpress_id ) {
					$parent = $wordpress_id;
				} else {
					$parent = 0;
				}
				$already_mapped_log = array(
					'title'   => $title,
					'message' => $body,
					'trigger' => $sf_sync_trigger,
					'parent'  => $parent,
					'status'  => $status,
				);
				$this->logging->setup( $already_mapped_log );
				$results[] = $already_mapped_log;

			} // End if() statement.
		} // end if op is upsert.

		// create the mapping object between the rows. we update it with the correct IDs after successful response.
		$mapping_object_id = $this->create_object_map( $object, $this->mappings->generate_temporary_id( 'pull' ), $salesforce_mapping );
		$mapping_objects   = $this->mappings->get_all_object_maps(
			array(
				'id' => $mapping_object_id,
			)
		);
		if ( isset( $mapping_objects[0] ) && is_array( $mapping_objects[0] ) ) {
			$mapping_object = $mapping_objects[0];
		}

		// try to upsert or create a WordPress record.
		try {
			if ( 'Upsert' === $op ) {
				// right here we should update the pulling transient.
				$this->sync_transients->set( 'salesforce_pulling_' . $object['Id'], '', $salesforce_mapping['id'], 1, $seconds );
				$this->sync_transients->set( 'salesforce_pulling_object_id', '', $salesforce_mapping['id'], $object['Id'] );
				// now we can upsert the object in wp if we've gotten to this point
				// this command will either create or update the object.
				$result = $this->wordpress->object_upsert( $salesforce_mapping['wordpress_object'], $upsert_key, $upsert_value, $upsert_methods, $params, $salesforce_mapping['pull_to_drafts'] );
			} else {
				// No key or prematch field exists on this field map object, create a new object in WordPress.
				$this->sync_transients->set( 'salesforce_pulling_' . $mapping_object_id, '', $salesforce_mapping['id'], 1, $seconds );
				$this->sync_transients->set( 'salesforce_pulling_object_id', '', $salesforce_mapping['id'], $mapping_object_id );
				// now we can create the object in wp if we've gotten to this point.
				$result = $this->wordpress->object_create( $salesforce_mapping['wordpress_object'], $params );
			} // End if() statement.
		} catch ( Object_Sync_Sf_Exception $e ) {
			$result['errors'] = $e->getMessage();
		} // End try() method for create or upsert.

		// set $wordpress_data to the WordPress result.
		$wordpress_data = $result['data'];
		if ( isset( $wordpress_data[ "$wordpress_id_field_name" ] ) ) {
			$wordpress_id = $wordpress_data[ "$wordpress_id_field_name" ];
		} else {
			$wordpress_id = 0;
		}

		// WordPress create/upsert call has finished running
		// If it was successful, the object has already been created/updated in WordPress
		// this is where it creates/updates the object mapping rows and log entries in WordPress
		// this is also where it runs pull_success and pull_fail actions hooks.

		if ( empty( $result['errors'] ) ) {
			// set up log entry for successful create or upsert.
			$status = 'success';
			$title  = sprintf(
				// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the WordPress object type, 4) the WordPress id field name, 5) the WordPress object id value, 6) the name of the Salesforce object, 7) the Salesforce Id value.
				esc_html__( '%1$s: %2$s WordPress %3$s with %4$s of %5$s (Salesforce %6$s Id of %7$s)', 'object-sync-for-salesforce' ),
				ucfirst( esc_attr( $status ) ),
				esc_attr( $op ),
				esc_attr( $salesforce_mapping['wordpress_object'] ),
				esc_attr( $wordpress_id_field_name ),
				esc_attr( $wordpress_id ),
				esc_attr( $salesforce_mapping['salesforce_object'] ),
				esc_attr( $object['Id'] )
			);
			$result = array(
				'title'   => $title,
				'message' => '',
				'trigger' => $sf_sync_trigger,
				'parent'  => $wordpress_id,
				'status'  => $status,
			);

			// set up the mapping object for successful create or upsert.
			$mapping_object['last_sync_status']  = $this->mappings->status_success;
			$mapping_object['last_sync_message'] = esc_html__( 'Mapping object updated via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__;

			// hook for pull success.
			do_action( $this->option_prefix . 'pull_success', $op, $result, $synced_object );
		} else {
			// set up log entry for failed create or upsert.
			$status = 'error';
			$title  = sprintf(
				// translators: placeholders are: 1) the log status, 2) what operation is happening, and 3) the name of the WordPress object.
				esc_html__( '%1$s: %2$s WordPress %3$s', 'object-sync-for-salesforce' ),
				ucfirst( esc_attr( $status ) ),
				esc_attr( $op ),
				esc_attr( $salesforce_mapping['wordpress_object'] )
			);
			if ( isset( $salesforce_id ) && null !== $salesforce_id ) {
				$title .= ' ' . $salesforce_id;
			}
			$title .= sprintf(
				// translators: placeholders are: 1) the name of the Salesforce object, and 2) Id of the Salesforce object.
				esc_html__( ' (Salesforce %1$s with Id of %2$s)', 'object-sync-for-salesforce' ),
				$salesforce_mapping['salesforce_object'],
				$object['Id']
			);
			// if we know the WordPress object id we can put it in there.
			if ( null !== $wordpress_id ) {
				$parent = $wordpress_id;
			} else {
				$parent = 0;
			}

			// set up error message.
			$default_message = esc_html__( 'An error occurred pulling this data from Salesforce. See the plugin logs.', 'object-sync-for-salesforce' );
			$message         = $this->parse_error_message( $result, $default_message );

			$result = array(
				'title'   => $title,
				'message' => $message,
				'trigger' => $sf_sync_trigger,
				'parent'  => $parent,
				'status'  => $status,
			);

			// set up the mapping object for an error.
			$mapping_object['last_sync_status']  = $this->mappings->status_error;
			$mapping_object['last_sync_message'] = substr( $message, 0, 255 );

			// hook for pull fail.
			do_action( $this->option_prefix . 'pull_fail', $op, $result, $synced_object );
		} // End if() statement checking for errors.

		// either way, save the log entry.
		$this->logging->setup( $result );
		$results[] = $result;

		// either way, update the object map.
		if ( 0 !== $wordpress_id ) {
			$mapping_object['wordpress_id'] = $wordpress_id;
		}
		$mapping_object['last_sync'] = current_time( 'mysql' );
		$mapping_object              = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

		return $results;
	}

	/**
	 * Determine whether the current operation is an upsert or a create.
	 *
	 * @param array    $prematch Array of criteria to determine what to do on upsert operations.
	 * @param int|null $wordpress_id The value of the WordPress ID.
	 * @return string  $op Whether it's an upsert or create.
	 */
	private function check_for_upsert( $prematch, $wordpress_id ) {
		if ( isset( $prematch['field_salesforce'] ) || null !== $wordpress_id ) {
			$op = 'Upsert';
		} else {
			$op = 'Create';
		}
		return $op;
	}

	/**
	 * Update records in WordPress from a Salesforce pull
	 *
	 * @param string $sf_sync_trigger The current operation's trigger.
	 * @param array  $synced_object Combined data for fieldmap, mapping object, and Salesforce object data.
	 * @param array  $params Array of mapped key value pairs between WordPress and Salesforce fields.
	 * @param string $wordpress_id_field_name The name of the ID field for this particular WordPress object type.
	 * @param int    $seconds Timeout for the transient value to determine the direction for a sync.
	 * @return array $results Currently this contains an array of log entries for each attempt.
	 * @throws Object_Sync_Sf_Exception Exception $e.
	 */
	private function update_called_from_salesforce( $sf_sync_trigger, $synced_object, $params, $wordpress_id_field_name, $seconds ) {

		$salesforce_mapping = $synced_object['mapping'];
		$mapping_object     = $synced_object['mapping_object'];
		$object             = $synced_object['salesforce_object'];

		// methods to run the wp update operations.
		$results = array();
		$op      = '';

		// if the last sync is greater than the last time this object was updated by Salesforce, skip it
		// this keeps us from doing redundant syncs
		// because SF stores all DateTimes in UTC.
		$mapping_object['object_updated'] = current_time( 'mysql' );

		$pull_trigger_field = $salesforce_mapping['pull_trigger_field'];
		$pull_trigger_value = $object[ $pull_trigger_field ];

		// hook to allow other plugins to do something right before WordPress data is saved
		// ex: run outside methods on an object if it exists, or do something in preparation for it if it doesn't.
		do_action( $this->option_prefix . 'pre_pull', $mapping_object['wordpress_id'], $salesforce_mapping, $object, $wordpress_id_field_name, $params );

		// try to update a WordPress record.
		try {
			$op     = 'Update';
			$result = $this->wordpress->object_update( $salesforce_mapping['wordpress_object'], $mapping_object['wordpress_id'], $params, $mapping_object );
		} catch ( Object_Sync_Sf_Exception $e ) {
			$result['errors'] = $e->getMessage();
		} // End try() method for update.

		// WordPress update call has finished running
		// If it was successful, the object has already been updated in WordPress
		// this is where it updates the object mapping rows and log entries in WordPress
		// this is also where it runs pull_success and pull_fail actions hooks.

		if ( ! isset( $result['errors'] ) || empty( $result['errors'] ) ) {
			// set up the log entry for successful update.
			$status = 'success';
			$title  = sprintf(
				// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the WordPress object type, 4) the WordPress id field name, 5) the WordPress object id value, 6) the name of the Salesforce object, 7) the Salesforce Id value.
				esc_html__( '%1$s: %2$s WordPress %3$s with %4$s of %5$s (Salesforce %6$s Id of %7$s)', 'object-sync-for-salesforce' ),
				ucfirst( esc_attr( $status ) ),
				esc_attr( $op ),
				esc_attr( $salesforce_mapping['wordpress_object'] ),
				esc_attr( $wordpress_id_field_name ),
				esc_attr( $mapping_object['wordpress_id'] ),
				esc_attr( $salesforce_mapping['salesforce_object'] ),
				esc_attr( $object['Id'] )
			);
			$result = array(
				'title'   => $title,
				'message' => is_string( $result['errors'] ) ? esc_html( $result['errors'] ) : '',
				'trigger' => $sf_sync_trigger,
				'parent'  => $mapping_object['wordpress_id'],
				'status'  => $status,
			);

			// set up the mapping object for successful update.
			$mapping_object['last_sync_status']  = $this->mappings->status_success;
			$mapping_object['last_sync_message'] = esc_html__( 'Mapping object updated via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__;

			// hook for pull success.
			do_action( $this->option_prefix . 'pull_success', $op, $result, $synced_object );
		} else {

			// set up the log entry for a failed update.
			$status = 'error';
			$title  = sprintf(
				// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the WordPress object, 4) the WordPress id field name, 5) the WordPress object id value, 6) the name of the Salesforce object, 7) the Salesforce Id value.
				esc_html__( '%1$s: %2$s WordPress %3$s with %4$s of %5$s (Salesforce %6$s with Id of %7$s)', 'object-sync-for-salesforce' ),
				ucfirst( esc_attr( $status ) ),
				esc_attr( $op ),
				esc_attr( $salesforce_mapping['wordpress_object'] ),
				esc_attr( $wordpress_id_field_name ),
				esc_attr( $mapping_object['wordpress_id'] ),
				esc_attr( $salesforce_mapping['salesforce_object'] ),
				esc_attr( $object['Id'] )
			);

			// set up error message.
			$default_message = esc_html__( 'An error occurred pulling this data from Salesforce. See the plugin logs.', 'object-sync-for-salesforce' );
			$message         = $this->parse_error_message( $result, $default_message );

			$result = array(
				'title'   => $title,
				'message' => $message,
				'trigger' => $sf_sync_trigger,
				'parent'  => $mapping_object['wordpress_id'],
				'status'  => $status,
			);

			// set up the mapping object for an error.
			$mapping_object['last_sync_status']  = $this->mappings->status_error;
			$mapping_object['last_sync_message'] = substr( $message, 0, 255 );

			// hook for pull fail.
			do_action( $this->option_prefix . 'pull_fail', $op, $result, $synced_object );
		} // end if statement checking for errors.

		// save the log entry.
		$this->logging->setup( $result );
		$results[] = $result;

		// update the mapping object.
		$mapping_object['last_sync_action'] = 'pull';
		$mapping_object['last_sync']        = current_time( 'mysql' );
		$mapping_object                     = $this->mappings->update_object_map( $mapping_object, $mapping_object['id'] );

		return $results;
	}

	/**
	 * Delete records in WordPress from a Salesforce pull
	 *
	 * @param string $sf_sync_trigger The current operation's trigger.
	 * @param array  $synced_object Combined data for fieldmap, mapping object, and Salesforce object data.
	 * @param string $wordpress_id_field_name The name of the ID field for this particular WordPress object type.
	 * @param int    $seconds Timeout for the transient value to determine the direction for a sync.
	 * @param array  $mapping_objects The data for the mapping objects between the individual Salesforce and WordPress items. We only pass this because of the need to count before deleting records.
	 * @return array $results Currently this contains an array of log entries for each attempt.
	 * @throws Object_Sync_Sf_Exception Exception $e.
	 */
	private function delete_called_from_salesforce( $sf_sync_trigger, $synced_object, $wordpress_id_field_name, $seconds, $mapping_objects ) {

		$salesforce_mapping = $synced_object['mapping'];
		$mapping_object     = $synced_object['mapping_object'];

		// methods to run the wp delete operations.
		$results = array();
		$op      = '';

		// deleting mapped objects.
		if ( $sf_sync_trigger === $this->mappings->sync_sf_delete ) { // trigger is a bit operator.
			if ( isset( $mapping_object['id'] ) ) {

				$op = 'Delete';

				// only delete if there are no additional mapping objects for this record.
				if ( 1 === count( $mapping_objects ) ) {

					$this->sync_transients->set( 'salesforce_pulling_' . $mapping_object['salesforce_id'], '', $salesforce_mapping['id'], 1, $seconds );
					$this->sync_transients->set( 'salesforce_pulling_object_id', '', $salesforce_mapping['id'], $mapping_object['salesforce_id'] );

					try {
						$result = $this->wordpress->object_delete( $salesforce_mapping['wordpress_object'], $mapping_object['wordpress_id'] );
					} catch ( Object_Sync_Sf_Exception $e ) {
						$result['errors'] = $e->getMessage();
					} // End try() method.

					if ( ! isset( $result['errors'] ) || empty( $result['errors'] ) ) {
						// set up the log entry for successful delete.
						$status = 'success';
						$title  = sprintf(
							// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the WordPress object type, 4) the WordPress id field name, 5) the WordPress object id value, 6) the name of the Salesforce object, 7) the Salesforce Id value.
							esc_html__( '%1$s: %2$s WordPress %3$s with %4$s of %5$s (%6$s %7$s)', 'object-sync-for-salesforce' ),
							ucfirst( esc_attr( $status ) ),
							esc_attr( $op ),
							esc_attr( $salesforce_mapping['wordpress_object'] ),
							esc_attr( $wordpress_id_field_name ),
							esc_attr( $mapping_object['wordpress_id'] ),
							esc_attr( $salesforce_mapping['salesforce_object'] ),
							esc_attr( $mapping_object['salesforce_id'] )
						);
						$result = array(
							'title'   => $title,
							'message' => '',
							'trigger' => $sf_sync_trigger,
							'parent'  => $mapping_object['wordpress_id'],
							'status'  => $status,
						);

						// hook for pull success.
						do_action( $this->option_prefix . 'pull_success', $op, $result, $synced_object );
					} else {
						$status = 'error';
						// create log entry for failed delete.
						$title = sprintf(
							// translators: placeholders are: 1) the log status, 2) what operation is happening, 3) the name of the WordPress object type, 4) the WordPress id field name, 5) the WordPress object id value, 6) the name of the Salesforce object, 7) the Salesforce Id value.
							esc_html__( '%1$s: %2$s WordPress %3$s with %4$s of %5$s (%6$s %7$s)', 'object-sync-for-salesforce' ),
							ucfirst( esc_attr( $status ) ),
							esc_attr( $op ),
							esc_attr( $salesforce_mapping['wordpress_object'] ),
							esc_attr( $wordpress_id_field_name ),
							esc_attr( $mapping_object['wordpress_id'] ),
							esc_attr( $salesforce_mapping['salesforce_object'] ),
							esc_attr( $mapping_object['salesforce_id'] )
						);

						// set up error message.
						$default_message = esc_html__( 'An error occurred pulling this data from Salesforce. See the plugin logs.', 'object-sync-for-salesforce' );
						$message         = $this->parse_error_message( $result, $default_message );

						$result = array(
							'title'   => $title,
							'message' => $message,
							'trigger' => $sf_sync_trigger,
							'parent'  => $mapping_object['wordpress_id'],
							'status'  => $status,
						);

						// hook for pull fail.
						do_action( $this->option_prefix . 'pull_fail', $op, $result, $synced_object );
					} // end if statement checking for errors.

					// save the log entry.
					$this->logging->setup( $result );
					$results[] = $result;
				} else {
					// create log entry for additional mapped items.
					$more_ids = sprintf(
						// translators: parameter is the name of the WordPress id field name.
						'<p>' . esc_html__( 'The WordPress record was not deleted because there are multiple Salesforce IDs that match this WordPress %1$s.) They are:', 'object-sync-for-salesforce' ) . '</p>',
						esc_attr( $wordpress_id_field_name )
					);

					$more_ids .= '<ul>';
					foreach ( $mapping_objects as $match ) {
						$more_ids .= '<li>' . $match['salesforce_id'] . '</li>';
					}
					$more_ids .= '</ul>';

					$more_ids .= '<p>' . esc_html__( 'The map row between this Salesforce object and the WordPress object, as stored in the WordPress database, will be deleted, and this Salesforce object has been deleted, but WordPress object data will remain untouched.', 'object-sync-for-salesforce' ) . '</p>';

					$status = 'notice';
					$title  = sprintf(
						// translators: placeholders are: 1) the operation that is happening, 2) the name of the WordPress object type, 3) the WordPress id field name, 4) the WordPress object id value, 5) the name of the Salesforce object type, 6) the Salesforce Id.
						esc_html__( '%1$s: %2$s on WordPress %3$s with %4$s of %5$s was stopped because there are other WordPress records mapped to Salesforce %6$s of %7$s', 'object-sync-for-salesforce' ),
						ucfirst( esc_attr( $status ) ),
						esc_attr( $op ),
						esc_attr( $salesforce_mapping['wordpress_object'] ),
						esc_attr( $wordpress_id_field_name ),
						esc_attr( $mapping_object['wordpress_id'] ),
						esc_attr( $salesforce_mapping['salesforce_object'] ),
						esc_attr( $mapping_object['salesforce_id'] )
					);
					$notice = array(
						'title'   => $title,
						'message' => $more_ids,
						'trigger' => $sf_sync_trigger,
						'parent'  => 0,
						'status'  => $status,
					);
					$this->logging->setup( $notice );
				} // End if() on count
				// delete the map row from WordPress after the WordPress row has been deleted
				// we delete the map row even if the WordPress delete failed, because the Salesforce object is gone.
				$this->mappings->delete_object_map( $mapping_object['id'] );
				// there is no map row if we end this if statement.
			} // End if() statement.
		} // End if() statement.

		return $results;
	}

	/**
	 * Format the error message
	 *
	 * @param array  $result from the WordPress class.
	 * @param string $default_message if there is one.
	 * @return string $message what is getting stored.
	 */
	private function parse_error_message( $result, $default_message = '' ) {
		$message = $default_message;
		$errors  = $result['errors'];
		// try to retrieve a usable error message to save.
		if ( is_string( $errors ) ) {
			$message = $errors;
		} else {
			if ( is_wp_error( $errors ) ) {
				$message = $errors->get_error_message();
			} else {
				$message = print_r( $errors, true ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
			}
		}
		$message = wp_kses_post( $message );
		return $message;
	}

	/**
	 * Clear the currently stored query for the specified content type
	 *
	 * @param string $type e.g. "Contact", "Account", etc.
	 * @param int    $fieldmap_id is the fieldmap ID that goes with this query.
	 */
	public function clear_current_type_query( $type, $fieldmap_id = '' ) {
		// update the last sync timestamp for this content type.
		$this->increment_current_type_datetime( $type, '', $fieldmap_id );
		// delete the option value for the currently pulling query for this type.
		$this->pull_options->delete( 'current_query', $type, $fieldmap_id );
		// delete the option value for the last pull record id.
		$this->pull_options->delete( 'last_id', '', $fieldmap_id );
	}

	/**
	 * Increment the currently running query's datetime
	 *
	 * @param string    $type e.g. "Contact", "Account", etc.
	 * @param timestamp $next_query_modified_date the last record's modified datetime, or the current time if there isn't one.
	 * @param int       $fieldmap_id is the fieldmap ID that goes with this query.
	 */
	private function increment_current_type_datetime( $type, $next_query_modified_date = '', $fieldmap_id = '' ) {
		// update the last sync timestamp for this content type.
		if ( '' === $next_query_modified_date ) {
			$next_query_modified_date = time();
		} else {
			$next_query_modified_date = strtotime( $next_query_modified_date );
		}
		$this->pull_options->set( 'last_sync', $type, $fieldmap_id, $next_query_modified_date );
	}

	/**
	 * Create an object map between a Salesforce object and a WordPress object
	 *
	 * @param array  $salesforce_object Array of the salesforce object's data.
	 * @param string $wordpress_id Unique identifier for the WordPress object.
	 * @param array  $field_mapping The row that maps the object types together, including which fields match which other fields.
	 * @return int $wpdb->insert_id This is the database row for the map object
	 */
	private function create_object_map( $salesforce_object, $wordpress_id, $field_mapping ) {
		// Create object map and save it.
		$mapping_object = $this->mappings->create_object_map(
			array(
				'wordpress_id'      => $wordpress_id, // WordPress unique id.
				'salesforce_id'     => $salesforce_object['Id'], // Salesforce unique id. we don't care what kind of object it is at this point.
				'wordpress_object'  => $field_mapping['wordpress_object'], // keep track of what kind of WordPress object this is.
				'last_sync'         => current_time( 'mysql' ),
				'last_sync_action'  => 'pull',
				'last_sync_status'  => $this->mappings->status_success,
				'last_sync_message' => esc_html__( 'Mapping object created via function: ', 'object-sync-for-salesforce' ) . __FUNCTION__,
				'action'            => 'created',
			)
		);

		return $mapping_object;
	}

	/**
	 * Find out if pull is allowed for this record
	 *
	 * @param string $object_type Salesforce object type.
	 * @param array  $object Array of the salesforce object's data.
	 * @param string $sf_sync_trigger The current operation's trigger.
	 * @param array  $salesforce_mapping the fieldmap that maps the two object types.
	 * @param array  $map_sync_triggers the triggers that are enabled.
	 * @return bool $pull_allowed Whether all this stuff allows the $result to be pulled into WordPress
	 */
	private function is_pull_allowed( $object_type, $object, $sf_sync_trigger, $salesforce_mapping, $map_sync_triggers ) {

		// default is pull is allowed.
		$pull_allowed = true;

		// if the current fieldmap does not allow create, we need to check if there is an object map for the Salesforce object Id. if not, set pull_allowed to false.
		if ( ! in_array( $this->mappings->sync_sf_create, (array) $map_sync_triggers, true ) ) {
			$object_map = $this->mappings->load_object_maps_by_salesforce_id( $object['Id'], $salesforce_mapping );
			if ( empty( $object_map ) ) {
				$pull_allowed = false;
			}
		}

		// Hook to allow other plugins to prevent a pull per-mapping.
		// Putting the pull_allowed hook here will keep the queue from storing data when it is not supposed to store it.
		$pull_allowed = apply_filters( $this->option_prefix . 'pull_object_allowed', $pull_allowed, $object_type, $object, $sf_sync_trigger, $salesforce_mapping );

		// example to keep from pulling the Contact with id of abcdef.
		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		add_filter( 'object_sync_for_salesforce_pull_object_allowed', 'check_user', 10, 5 );
		// can always reduce this number if all the arguments are not necessary
		function check_user( $pull_allowed, $object_type, $object, $sf_sync_trigger, $salesforce_mapping ) {
			if ( 'Contact' === $object_type && 'abcdef' === $object['Id'] ) {
				$pull_allowed = false;
			}
			return $pull_allowed;
		}
		*/

		return $pull_allowed;
	}
}
