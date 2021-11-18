<?php
/**
 * What to do when the plugin is activated
 *
 * @class   Object_Sync_Sf_Activate
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Activate class.
 */
class Object_Sync_Sf_Activate {

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
	 * Suffix for group name in ActionScheduler
	 *
	 * @var string
	 */
	public $action_group_suffix;

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
	 * The version of this plugin's database setup
	 *
	 * @var string
	 */
	public $user_installed_version;

	/**
	 * Constructor for activate class
	 */
	public function __construct() {
		$this->version             = object_sync_for_salesforce()->version;
		$this->file                = object_sync_for_salesforce()->file;
		$this->wpdb                = object_sync_for_salesforce()->wpdb;
		$this->slug                = object_sync_for_salesforce()->slug;
		$this->option_prefix       = object_sync_for_salesforce()->option_prefix;
		$this->action_group_suffix = object_sync_for_salesforce()->action_group_suffix;

		$this->schedulable_classes = object_sync_for_salesforce()->schedulable_classes;
		$this->queue               = object_sync_for_salesforce()->queue;

		// database version.
		$this->user_installed_version = get_option( $this->option_prefix . 'db_version', '' );

		$this->add_actions();
	}

	/**
	 * Activation hooks
	 */
	private function add_actions() {

		// on initial activation, run these hooks.
		register_activation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'php_requirements' ) );
		// to maybe add later:
		// register_activation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'require_ssl' ) );
		// if we determine we need to check for SSL on activation.
		register_activation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'wordpress_salesforce_tables' ) );
		register_activation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'add_roles_capabilities' ) );

		// this should run when the user is in the admin area to make sure the database gets updated.
		add_action( 'admin_init', array( $this, 'wordpress_salesforce_update_db_check' ), 10 );

	}

	/**
	 * Check for the minimum required version of php
	 */
	public function php_requirements() {
		if ( version_compare( PHP_VERSION, '5.6.20', '<' ) ) {
			deactivate_plugins( plugin_basename( __FILE__ ) );
			wp_die( '<strong>This plugin requires PHP Version 5.6.20</strong> <br />Please contact your host to upgrade PHP on your server, and then retry activating the plugin.' );
		}
	}

	/**
	 * Require SSL because otherwise the plugin will not authorize
	 */
	public function require_ssl() {
		// although we might instead have to run this on plugin initalization rather than activation.
	}

	/**
	 * Create database tables for Salesforce
	 * This creates tables for fieldmaps (between types of objects) and object maps (between individual instances of objects).
	 * Important requirement for developers: when you update the SQL for either of these tables, also update it in the documentation file located at /docs/troubleshooting-unable-to-create-database-tables.md and make sure that is included in your commit(s).
	 */
	public function wordpress_salesforce_tables() {

		$charset_collate = $this->wpdb->get_charset_collate();

		$field_map_table = $this->wpdb->prefix . 'object_sync_sf_field_map';
		$field_map_sql   = "CREATE TABLE $field_map_table (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			label varchar(64) NOT NULL DEFAULT '',
			name varchar(64) NOT NULL DEFAULT '',
			fieldmap_status varchar(10) NOT NULL DEFAULT 'active',
			wordpress_object varchar(128) NOT NULL DEFAULT '',
			salesforce_object varchar(255) NOT NULL DEFAULT '',
			salesforce_record_types_allowed longblob,
			salesforce_record_type_default varchar(255) NOT NULL DEFAULT '',
			fields longtext NOT NULL,
			pull_trigger_field varchar(128) NOT NULL DEFAULT 'LastModifiedDate',
			sync_triggers text NOT NULL,
			push_async tinyint(1) NOT NULL DEFAULT '0',
			push_drafts tinyint(1) NOT NULL DEFAULT '0',
			pull_to_drafts tinyint(1) NOT NULL DEFAULT '0',
			weight tinyint(1) NOT NULL DEFAULT '0',
			version varchar(255) NOT NULL DEFAULT '',
			PRIMARY KEY  (id),
			UNIQUE KEY name (name),
			KEY name_sf_type_wordpress_type (wordpress_object,salesforce_object),
			KEY fieldmap_status (fieldmap_status)
		) ENGINE=InnoDB $charset_collate";

		$object_map_table = $this->wpdb->prefix . 'object_sync_sf_object_map';
		$object_map_sql   = "CREATE TABLE $object_map_table (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			wordpress_id varchar(32) NOT NULL,
			salesforce_id varbinary(32) NOT NULL DEFAULT '',
			wordpress_object varchar(128) NOT NULL DEFAULT '',
			created datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			object_updated datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			last_sync datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			last_sync_action varchar(128) DEFAULT NULL,
			last_sync_status tinyint(1) NOT NULL DEFAULT '0',
			last_sync_message varchar(255) DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY wordpress_object (wordpress_object,wordpress_id),
			KEY salesforce_object (salesforce_id)
		) $charset_collate";

		if ( ! function_exists( 'dbDelta' ) ) {
			if ( ! is_admin() ) {
				return false;
			}
			require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		}

		// Note: see https://wordpress.stackexchange.com/questions/67345/how-to-implement-wordpress-plugin-update-that-modifies-the-database
		// When we run the dbDelta method below, "it checks if the table exists. What's more, it checks the column types. So if the table doesn't exist, it creates it, if it does, but some column types have changed it updates them, and if a column doesn't exists - it adds it."
		// This does not remove columns if we remove columns, so we'll need to expand beyond this in the future if that happens, although I think the schema is pretty solid now.
		$result_field_map  = dbDelta( $field_map_sql );
		$result_object_map = dbDelta( $object_map_sql );

		$remove_key_version = '1.8.0';
		if ( '' !== $this->user_installed_version && version_compare( $this->user_installed_version, $remove_key_version, '<' ) ) {
			$wpdb = $this->wpdb;
			$wpdb->query( $wpdb->prepare( 'ALTER TABLE %s DROP INDEX salesforce', $object_map_table ) );
			$wpdb->query( $wpdb->prepare( 'ALTER TABLE %s DROP INDEX salesforce_wordpress', $object_map_table ) );
			$result_key = true;
		}

		// store right now as the time for the plugin's activation.
		update_option( $this->option_prefix . 'activate_time', time() );

		// utf8mb4 conversion.
		maybe_convert_table_to_utf8mb4( $field_map_table );
		maybe_convert_table_to_utf8mb4( $object_map_table );

		if ( '' === $this->user_installed_version || version_compare( $this->user_installed_version, $this->version, '<' ) ) {
			update_option( $this->option_prefix . 'db_version', $this->version );
		}

		if ( ! isset( $result_key ) && empty( $result_field_map ) && empty( $result_object_map ) ) {
			// No changes, database already exists and is up-to-date.
			return;
		}

	}

	/**
	 * Add roles and capabilities
	 * This adds the configure_salesforce capability to the admin role
	 *
	 * It also allows other plugins to add the capability to other roles
	 */
	public function add_roles_capabilities() {

		// by default, only administrators can configure the plugin.
		$role = get_role( 'administrator' );
		$role->add_cap( 'configure_salesforce' );

		// hook that allows other roles to configure the plugin as well.
		$roles = apply_filters( $this->option_prefix . 'roles_configure_salesforce', null );

		// for each role that we have, give it the configure salesforce capability.
		if ( null !== $roles ) {
			foreach ( $roles as $role ) {
				$role = get_role( $role );
				$role->add_cap( 'configure_salesforce' );
			}
		}

	}

	/**
	 * Check for database version
	 * When the plugin is loaded in the admin, if the database version does not match the current version, perform these methods
	 */
	public function wordpress_salesforce_update_db_check() {

		// user is running a version less than the current one.
		if ( version_compare( $this->user_installed_version, $this->version, '<' ) ) {
			$this->log_trigger_settings();
			$this->wordpress_salesforce_tables();
		} else {
			return true;
		}
	}

	/**
	 * Check for log trigger settings based on plugin version
	 * When the plugin is loaded in the admin, if the previously installed version is below 2.0.0, update the values for the log trigger settings.
	 */
	private function log_trigger_settings() {
		$triggers_to_log = get_option( $this->option_prefix . 'triggers_to_log', array() );
		if ( ! empty( $triggers_to_log ) ) {
			// in version 2.0.0 of this plugin, we replaced the bit flags with strings to make them more legible.
			// when the database version changes to 2.0.0, we should update the option value to use the new strings.
			if ( version_compare( $this->version, '2.0.0', '==' ) && version_compare( $this->user_installed_version, '2.0.0', '<' ) ) {
				$mappings                = new Object_Sync_Sf_Mapping();
				$updated_triggers_to_log = array();
				foreach ( $triggers_to_log as $key => $value ) {
					if ( (string) $value === (string) $mappings->sync_off_v1 ) {
						$updated_triggers_to_log[] = $mappings->sync_off;
					}
					if ( (string) $value === (string) $mappings->sync_wordpress_create_v1 ) {
						$updated_triggers_to_log[] = $mappings->sync_wordpress_create;
					}
					if ( (string) $value === (string) $mappings->sync_wordpress_update_v1 ) {
						$updated_triggers_to_log[] = $mappings->sync_wordpress_update;
					}
					if ( (string) $value === (string) $mappings->sync_wordpress_delete_v1 ) {
						$updated_triggers_to_log[] = $mappings->sync_wordpress_delete;
					}
					if ( (string) $value === (string) $mappings->sync_sf_create_v1 ) {
						$updated_triggers_to_log[] = $mappings->sync_sf_create;
					}
					if ( (string) $value === (string) $mappings->sync_sf_update_v1 ) {
						$updated_triggers_to_log[] = $mappings->sync_sf_update;
					}
					if ( (string) $value === (string) $mappings->sync_sf_delete_v1 ) {
						$updated_triggers_to_log[] = $mappings->sync_sf_delete;
					}
				}
				$triggers_to_log = $updated_triggers_to_log;
				update_option( $this->option_prefix . 'triggers_to_log', $triggers_to_log );
			}
		}
	}

	/**
	 * Check whether the user has ActionScheduler tasks when they upgrade
	 *
	 * @param object $upgrader_object this is the WP_Upgrader object.
	 * @param array  $hook_extra the array of bulk item update data.
	 * @see https://developer.wordpress.org/reference/hooks/upgrader_process_complete/
	 * @deprecated since 2.0.0 and will be removed in version 3.0.0.
	 */
	public function check_for_action_scheduler( $upgrader_object, $hook_extra ) {

		// skip if this action isn't this plugin being updated.
		if ( 'plugin' !== $hook_extra['type'] && 'update' !== $hook_extra['action'] && $hook_extra['plugin'] !== $this->slug ) {
			return;
		}

		// user is running a version of this plugin that is less than 1.4.0.
		$action_scheduler_version = '1.4.0';
		$previous_version         = get_transient( $this->option_prefix . 'installed_version' );
		if ( version_compare( $previous_version, $action_scheduler_version, '<' ) ) {
			// delete old options.
			delete_option( $this->option_prefix . 'push_schedule_number' );
			delete_option( $this->option_prefix . 'push_schedule_unit' );
			delete_option( $this->option_prefix . 'salesforce_schedule_number' );
			delete_option( $this->option_prefix . 'salesforce_schedule_unit' );
			if ( '' === $this->queue ) {
				delete_transient( $this->option_prefix . 'installed_version' );
				return;
			}
			foreach ( $this->schedulable_classes as $key => $schedule ) {
				$schedule_name     = $key;
				$action_group_name = $schedule_name . $this->action_group_suffix;
				// exit if there is no initializer property on this schedule.
				if ( ! isset( $this->schedulable_classes[ $schedule_name ]['initializer'] ) ) {
					continue;
				}
				// create new recurring task for ActionScheduler to check for data to pull from Salesforce.
				$this->queue->schedule_recurring(
					time(), // plugin seems to expect UTC.
					$this->queue->get_frequency( $schedule_name, 'seconds' ),
					$this->schedulable_classes[ $schedule_name ]['initializer'],
					array(),
					$action_group_name
				);
			}
			delete_transient( $this->option_prefix . 'installed_version' );
		}
	}

}
