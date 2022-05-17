<?php
/**
 * Log events based on plugin settings. Extend the WP_Logging class for the purposes of Object Sync for Salesforce.
 *
 * @class   Object_Sync_Sf_Logging
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Logging class.
 */
class Object_Sync_Sf_Logging extends WP_Logging {

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
	 * The setting value for whether logging is enabled
	 *
	 * @var bool
	 */
	public $enabled;

	/**
	 * Which statuses to log, from the settings value
	 *
	 * @var array
	 */
	public $statuses_to_log;

	/**
	 * The name of the schedule to prune logs
	 *
	 * @var string
	 */
	public $schedule_name;

	/**
	 * Whether the plugin is in debug mode
	 *
	 * @var bool
	 */
	public $debug;

	/**
	 * Constructor for logging class
	 */
	public function __construct() {
		$this->version       = object_sync_for_salesforce()->version;
		$this->file          = object_sync_for_salesforce()->file;
		$this->wpdb          = object_sync_for_salesforce()->wpdb;
		$this->slug          = object_sync_for_salesforce()->slug;
		$this->option_prefix = object_sync_for_salesforce()->option_prefix;

		$this->enabled         = filter_var( get_option( $this->option_prefix . 'enable_logging', false ), FILTER_VALIDATE_BOOLEAN );
		$this->statuses_to_log = maybe_unserialize( get_option( $this->option_prefix . 'statuses_to_log', array() ) );

		$this->schedule_name = 'wp_logging_prune_routine';

		$this->capability = 'configure_salesforce';

		// use the option value for whether we're in debug mode.
		$this->debug = filter_var( get_option( $this->option_prefix . 'debug_mode', false ), FILTER_VALIDATE_BOOLEAN );

		add_action( 'plugins_loaded', array( $this, 'init' ) );

	}

	/**
	 * Initialize. This creates a schedule for pruning logs, and also the custom content type
	 */
	public function init() {
		$this->configure_debugging();
		if ( true === $this->enabled ) {
			add_filter( 'cron_schedules', array( $this, 'add_prune_interval' ) );
			add_filter( 'wp_log_types', array( $this, 'set_log_types' ), 10, 1 );
			add_filter( 'wp_logging_should_we_prune', array( $this, 'set_prune_option' ), 10, 1 );
			add_filter( 'wp_logging_prune_when', array( $this, 'set_prune_age' ), 10, 1 );
			add_filter( 'wp_logging_prune_query_args', array( $this, 'set_prune_args' ), 10, 1 );
			add_filter( 'wp_logging_post_type_args', array( $this, 'set_log_visibility' ), 10, 1 );
			add_filter( 'pre_wp_unique_post_slug', array( $this, 'set_log_slug' ), 10, 5 );

			// add a filter to check for other plugins that might be filtering the log screen.
			$are_logs_filtered = apply_filters( 'wp_logging_manage_logs_filtered', false );
			add_filter( 'wp_logging_manage_logs_filtered', '__return_true' );

			if ( false === $are_logs_filtered ) {
				// add a sortable Type column to the posts admin.
				add_filter( 'manage_edit-wp_log_columns', array( $this, 'type_column' ), 10, 1 );
				add_filter( 'manage_edit-wp_log_sortable_columns', array( $this, 'sortable_columns' ), 10, 1 );
				add_action( 'manage_wp_log_posts_custom_column', array( $this, 'type_column_content' ), 10, 2 );

				// filter the log posts admin by log type.
				add_filter( 'parse_query', array( $this, 'posts_filter' ), 10, 1 );
				add_action( 'restrict_manage_posts', array( $this, 'restrict_logs_by_type' ), 10, 1 );
			}

			// when the schedule might change.
			add_action( 'update_option_' . $this->option_prefix . 'logs_how_often_unit', array( $this, 'check_log_schedule' ), 10, 3 );
			add_action( 'update_option_' . $this->option_prefix . 'logs_how_often_number', array( $this, 'check_log_schedule' ), 10, 3 );

			$this->save_log_schedule();
		}
	}

	/**
	 * Configure log settings based on debug status.
	 */
	private function configure_debugging() {
		// set debug log status based on the plugin's debug mode setting.
		if ( true === $this->debug ) {
			$this->statuses_to_log[] = 'debug';
			$this->enabled           = true;
		} else {
			if ( in_array( 'debug', $this->statuses_to_log, true ) ) {
				$delete_value          = 'debug';
				$this->statuses_to_log = array_filter(
					$this->statuses_to_log,
					function( $e ) use ( $delete_value ) {
						return ( $e !== $delete_value );
					}
				);
				update_option( $this->option_prefix . 'statuses_to_log', $this->statuses_to_log );
			}
		}
	}

	/**
	 * Set visibility for the post type
	 *
	 * @param array $log_args The post arguments.
	 * @return array $log_args
	 */
	public function set_log_visibility( $log_args ) {
		// set public to true overrides the WP_DEBUG setting that is the default on the class
		// capabilities makes it so (currently) only admin users can see the log posts in their admin view
		// note: a public value of true is required to show Logs as a nav menu item on the admin.
		// however, if we don't set exclude_from_search to true and publicly_queryable to false, logs *can* appear in search results.
		$log_args['public']              = true;
		$log_args['publicly_queryable']  = false;
		$log_args['exclude_from_search'] = true;
		$log_args['capabilities']        = array(
			'edit_post'          => $this->capability,
			'read_post'          => $this->capability,
			'delete_post'        => $this->capability,
			'edit_posts'         => $this->capability,
			'edit_others_posts'  => $this->capability,
			'delete_posts'       => $this->capability,
			'publish_posts'      => $this->capability,
			'read_private_posts' => $this->capability,
		);

		$log_args = apply_filters( $this->option_prefix . 'logging_post_type_args', $log_args );

		return $log_args;
	}

	/**
	 * Create a (probably unique) post name for logs in a more performant manner than wp_unique_post_slug().
	 *
	 * @param string $override_slug Short-circuit return value.
	 * @param string $slug The desired slug (post_name).
	 * @param int    $post_ID The post ID.
	 * @param string $post_status The post status.
	 * @param string $post_type The post type.
	 * @return string
	 */
	public function set_log_slug( $override_slug, $slug, $post_ID, $post_status, $post_type ) {
		if ( 'wp_log' === $post_type ) {
			$override_slug = uniqid( $post_type . '-', true ) . '-' . wp_generate_password( 32, false );
		}
		return $override_slug;
	}

	/**
	 * Add a Type column to the posts admin for this post type
	 *
	 * @param array $columns the columns for the post list table.
	 * @return array $columns
	 */
	public function type_column( $columns ) {
		$columns['type'] = __( 'Type', 'object-sync-for-salesforce' );
		return $columns;
	}

	/**
	 * Make the Type column in the posts admin for this post type sortable
	 *
	 * @param array $columns the sortable columns for the post list table.
	 * @return array $columns
	 */
	public function sortable_columns( $columns ) {
		$columns['type'] = 'type';
		return $columns;
	}

	/**
	 * Add the content for the Type column in the posts admin for this post type
	 *
	 * @param string $column_name the value for the type column on the list table.
	 * @param int    $post_id the ID of the currently listed post in the table.
	 */
	public function type_column_content( $column_name, $post_id ) {
		if ( 'type' !== $column_name ) {
			return;
		}
		// get wp_log_type.
		$terms = wp_get_post_terms(
			$post_id,
			'wp_log_type',
			array(
				'fields' => 'names',
			)
		);
		if ( is_array( $terms ) ) {
			echo esc_attr( $terms[0] );
		}
	}

	/**
	 * Filter log posts by the taxonomy from the dropdown when a value is present
	 *
	 * @param object $query the current WP query for the list table.
	 */
	public function posts_filter( $query ) {
		global $pagenow;
		$type     = 'wp_log';
		$taxonomy = 'wp_log_type';
		if ( is_admin() && 'edit.php' === $pagenow ) {
			if ( isset( $_GET['post_type'] ) && esc_attr( $_GET['post_type'] ) === $type ) {
				if ( isset( $_GET[ $taxonomy ] ) && '' !== $_GET[ $taxonomy ] ) {
					$query->post_type = $type;
					$query->tax_query = array(
						array(
							'taxonomy' => $taxonomy,
							'field'    => 'slug',
							'terms'    => esc_attr( $_GET[ $taxonomy ] ),
						),
					);
				}
			}
		}
	}

	/**
	 * Add a filter form for the log admin so we can filter by wp_log_type taxonomy values
	 *
	 * @param string $post_type what type of log we want to show.
	 */
	public function restrict_logs_by_type( $post_type ) {
		$type     = 'wp_log';
		$taxonomy = 'wp_log_type';
		// only add filter to post type you want.
		if ( 'wp_log' === $post_type ) {
			// get wp_log_type.
			$terms = get_terms(
				array(
					'taxonomy'   => $taxonomy,
					'hide_empty' => true,
				)
			);
			if ( is_wp_error( $terms ) || empty( $terms ) ) {
				// no terms, or the taxonomy doesn't exist, skip.
				return;
			}
			?>
			<select name="wp_log_type">
				<option value=""><?php esc_html_e( 'All log types ', 'object-sync-for-salesforce' ); ?></option>
				<?php
				$current_log_type = isset( $_GET[ $taxonomy ] ) ? esc_attr( $_GET[ $taxonomy ] ) : '';
				foreach ( $terms as $key => $term ) {
					printf(
						'<option value="%s"%s>%s</option>',
						esc_attr( $term->slug ),
						selected( $term->slug, $current_log_type, false ),
						esc_html( $term->name )
					);
				}
				?>
			</select>
			<?php
		}
	}

	/**
	 * When the cron settings change, clear the relevant schedule
	 *
	 * @param string $old_value Previous option value.
	 * @param string $new_value New option value.
	 * @param string $option Name of option.
	 */
	public function check_log_schedule( $old_value, $new_value, $option ) {
		$clear_schedule  = false;
		$schedule_unit   = get_option( $this->option_prefix . 'logs_how_often_unit', '' );
		$schedule_number = get_option( $this->option_prefix . 'logs_how_often_number', '' );
		if ( $this->option_prefix . 'logs_how_often_unit' === $option ) {
			$old_frequency = $this->get_schedule_frequency( $old_value, $schedule_number );
			$new_frequency = $this->get_schedule_frequency( $new_value, $schedule_number );
			$old_key       = $old_frequency['key'];
			$new_key       = $new_frequency['key'];
			if ( $old_key !== $new_key ) {
				$clear_schedule = true;
			}
		}
		if ( $this->option_prefix . 'logs_how_often_number' === $option ) {
			$old_frequency = $this->get_schedule_frequency( $schedule_unit, $old_value );
			$new_frequency = $this->get_schedule_frequency( $schedule_unit, $new_value );
			$old_key       = $old_frequency['key'];
			$new_key       = $new_frequency['key'];
			if ( $old_key !== $new_key ) {
				$clear_schedule = true;
			}
		}
		if ( true === $clear_schedule ) {
			wp_clear_scheduled_hook( $this->schedule_name );
			$this->save_log_schedule();
		}
	}

	/**
	 * Save a cron schedule
	 */
	public function save_log_schedule() {
		global $pagenow;
		if ( ( 'options.php' !== $pagenow ) && ( ! isset( $_GET['page'] ) || $this->slug . '-admin' !== $_GET['page'] ) ) {
			return;
		}
		$schedule_unit   = get_option( $this->option_prefix . 'logs_how_often_unit', '' );
		$schedule_number = get_option( $this->option_prefix . 'logs_how_often_number', '' );
		$frequency       = $this->get_schedule_frequency( $schedule_unit, $schedule_number );
		$key             = $frequency['key'];
		if ( ! wp_next_scheduled( $this->schedule_name ) ) {
			wp_schedule_event( time(), $key, $this->schedule_name );
		}
	}

	/**
	 * Add interval to wp schedules based on admin settings
	 *
	 * @param array $schedules An array of scheduled cron items.
	 * @return array $frequency
	 */
	public function add_prune_interval( $schedules ) {

		$schedule_unit   = get_option( $this->option_prefix . 'logs_how_often_unit', '' );
		$schedule_number = get_option( $this->option_prefix . 'logs_how_often_number', '' );
		$frequency       = $this->get_schedule_frequency( $schedule_unit, $schedule_number );
		$key             = $frequency['key'];
		$seconds         = $frequency['seconds'];

		$schedules[ $key ] = array(
			'interval' => $seconds * $schedule_number,
			'display'  => 'Every ' . $schedule_number . ' ' . $schedule_unit,
		);

		return $schedules;

	}

	/**
	 * Convert the schedule frequency from the admin settings into an array
	 * interval must be in seconds for the class to use it
	 *
	 * @param string $unit A unit of time.
	 * @param string $number The number of those units.
	 * @return array
	 */
	public function get_schedule_frequency( $unit, $number ) {

		switch ( $unit ) {
			case 'minutes':
				$seconds = 60;
				break;
			case 'hours':
				$seconds = 3600;
				break;
			case 'days':
				$seconds = 86400;
				break;
			default:
				$seconds = 0;
		}

		$key = $unit . '_' . $number;

		return array(
			'key'     => $key,
			'seconds' => $seconds,
		);

	}

	/**
	 * Set terms for Salesforce logs
	 *
	 * @param array $terms An array of string log types in the WP_Logging class.
	 * @return array $terms
	 */
	public function set_log_types( $terms ) {
		$terms[] = 'salesforce';
		return $terms;
	}

	/**
	 * Should logs be pruned at all?
	 *
	 * @param string $should_we_prune Whether to prune old log items.
	 * @return string $should_we_prune Whether to prune old log items.
	 */
	public function set_prune_option( $should_we_prune ) {
		$should_we_prune = get_option( $this->option_prefix . 'prune_logs', $should_we_prune );
		$should_we_prune = filter_var( $should_we_prune, FILTER_VALIDATE_BOOLEAN );
		return $should_we_prune;
	}

	/**
	 * Set how often to prune the Salesforce logs
	 *
	 * @param string $how_old How old the oldest non-pruned log items should be allowed to be.
	 * @return string $how_old
	 */
	public function set_prune_age( $how_old ) {
		$value = get_option( $this->option_prefix . 'logs_how_old', '' ) . ' ago';
		if ( '' !== $value ) {
			return $value;
		} else {
			return $how_old;
		}
	}

	/**
	 * Set arguments for only getting the Salesforce logs
	 *
	 * @param array $args Argument array for get_posts determining what posts are eligible for pruning.
	 * @return array $args
	 */
	public function set_prune_args( $args ) {
		$args['wp_log_type'] = 'salesforce';
		$number_to_prune     = get_option( $this->option_prefix . 'logs_how_many_number', '' );
		if ( '' !== $number_to_prune ) {
			$args['posts_per_page'] = filter_var( $number_to_prune, FILTER_SANITIZE_NUMBER_INT );
		}
		return $args;
	}

	/**
	 * Setup new log entry
	 *
	 * Check and see if we should log anything, and if so, send it to add()
	 *
	 * @access      public
	 * @since       1.0
	 *
	 * @param       string|array $title_or_params A log post title, or the full array of parameters.
	 * @param       string       $message The log message.
	 * @param       string|0     $trigger The type of log triggered. Usually one of: debug, notice, warning, error.
	 * @param       int          $parent The parent WordPress object.
	 * @param       string       $status The log status.
	 *
	 * @uses        self::add()
	 * @see         Object_Sync_Sf_Mapping::__construct()    the location of the parameters that define the logging triggers.
	 *
	 * @return      void
	 */
	public function setup( $title_or_params, $message = '', $trigger = 0, $parent = 0, $status = '' ) {

		if ( is_array( $title_or_params ) ) {
			$title   = $title_or_params['title'];
			$message = $title_or_params['message'];
			$trigger = $title_or_params['trigger'];
			$parent  = $title_or_params['parent'];
			$status  = $title_or_params['status'];
		} else {
			$title = $title_or_params;
		}

		if ( true === $this->enabled && in_array( $status, $this->statuses_to_log, true ) ) {
			$triggers_to_log = maybe_unserialize( get_option( $this->option_prefix . 'triggers_to_log', array() ) );
			if ( in_array( $trigger, $triggers_to_log, true ) || 0 === $trigger ) {
				$this->add( $title, $message, $parent );
			} elseif ( is_array( $trigger ) && array_intersect( $trigger, $triggers_to_log ) ) {
				$this->add( $title, $message, $parent );
			} elseif ( true === $this->debug ) {
				// if the plugin is in debug mode, treat all triggers as triggers to log.
				$this->add( $title, $message, $parent );
			}
		}
	}

	/**
	 * Create new log entry
	 *
	 * This is just a simple and fast way to log something. Use self::insert_log()
	 * if you need to store custom meta data
	 *
	 * @access      public
	 * @since       1.0
	 *
	 * @param       string $title A log post title.
	 *
	 * @uses        self::insert_log()
	 * @param       string $message The log message.
	 * @param       int    $parent The parent WordPress object.
	 * @param       string $type The type of log message; defaults to 'salesforce'.
	 *
	 * @return      int The ID of the new log entry
	 */
	public static function add( $title = '', $message = '', $parent = 0, $type = 'salesforce' ) {

		$log_data = array(
			'post_title'   => esc_html( $title ),
			'post_content' => wp_kses_post( $message ),
			'post_parent'  => absint( $parent ),
			'log_type'     => esc_attr( $type ),
		);

		return self::insert_log( $log_data );

	}


	/**
	 * Easily retrieves log items for a particular object ID
	 *
	 * @access      private
	 * @since       1.0
	 *
	 * @param       int    $object_id A WordPress object ID.
	 * @param       string $type The type of log item; defaults to 'salesforce' because that's the type of logs we create.
	 * @param       int    $paged show which page of results we want.
	 *
	 * @uses        self::get_connected_logs()
	 *
	 * @return      array
	 */
	public static function get_logs( $object_id = 0, $type = 'salesforce', $paged = null ) {
		return self::get_connected_logs(
			array(
				'post_parent' => (int) $object_id,
				'paged'       => (int) $paged,
				'log_type'    => (string) $type,
			)
		);
	}


	/**
	 * Retrieve all connected logs
	 *
	 * Used for retrieving logs related to particular items, such as a specific purchase.
	 *
	 * @access  private
	 * @since   1.0
	 *
	 * @param   Array $args An array of arguments for get_posts().
	 *
	 * @uses    wp_parse_args()
	 * @uses    get_posts()
	 * @uses    get_query_var()
	 * @uses    self::valid_type()
	 *
	 * @return  array / false
	 */
	public static function get_connected_logs( $args = array() ) {

		$defaults = array(
			'post_parent'    => 0,
			'post_type'      => 'wp_log',
			'posts_per_page' => 10,
			'post_status'    => 'publish',
			'paged'          => get_query_var( 'paged' ),
			'log_type'       => 'salesforce',
		);

		$query_args = wp_parse_args( $args, $defaults );

		if ( $query_args['log_type'] && self::valid_type( $query_args['log_type'] ) ) {

			$query_args['tax_query'] = array(
				array(
					'taxonomy' => 'wp_log_type',
					'field'    => 'slug',
					'terms'    => $query_args['log_type'],
				),
			);

		}

		$logs = get_posts( $query_args );

		if ( $logs ) {
			return $logs;
		}

		// no logs found.
		return false;

	}


	/**
	 * Retrieves number of log entries connected to particular object ID
	 *
	 * @access  private
	 * @since   1.0
	 *
	 * @param       int    $object_id A WordPress object ID.
	 * @param       string $type The type of log item; defaults to 'salesforce' because that's the type of logs we create.
	 * @param       array  $meta_query A WordPress meta query, parseable by WP_Meta_Query.
	 *
	 * @uses    WP_Query()
	 * @uses    self::valid_type()
	 *
	 * @return  int
	 */
	public static function get_log_count( $object_id = 0, $type = 'salesforce', $meta_query = null ) {

		$query_args = array(
			'post_parent'    => (int) $object_id,
			'post_type'      => 'wp_log',
			'posts_per_page' => 100,
			'post_status'    => 'publish',
		);

		if ( ! empty( $type ) && self::valid_type( $type ) ) {

			$query_args['tax_query'] = array(
				array(
					'taxonomy' => 'wp_log_type',
					'field'    => 'slug',
					'terms'    => sanitize_key( $type ),
				),
			);

		}

		if ( ! empty( $meta_query ) ) {
			$query_args['meta_query'] = $meta_query;
		}

		$logs = new WP_Query( $query_args );

		return (int) $logs->post_count;

	}

}
