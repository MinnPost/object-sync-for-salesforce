<?php
/**
 * What to do when the plugin is deactivated
 *
 * @class   Object_Sync_Sf_Deactivate
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Deactivate class.
 */
class Object_Sync_Sf_Deactivate {

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
	 * Constructor for deactivate class
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

		$delete_data = (int) get_option( $this->option_prefix . 'delete_data_on_uninstall', 0 );
		if ( 1 === $delete_data ) {
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'wordpress_salesforce_drop_tables' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'clear_schedule' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'delete_log_post_type' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'remove_roles_capabilities' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'flush_plugin_cache' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $this->slug . '.php', array( $this, 'delete_plugin_options' ) );
		}
	}

	/**
	 * Drop database tables for Salesforce
	 * This removes the tables for fieldmaps (between types of objects) and object maps (between indidual instances of objects)
	 */
	public function wordpress_salesforce_drop_tables() {
		$field_map_table  = $this->wpdb->prefix . 'object_sync_sf_field_map';
		$object_map_table = $this->wpdb->prefix . 'object_sync_sf_object_map';
		$this->wpdb->query( 'DROP TABLE IF EXISTS ' . $field_map_table );
		$this->wpdb->query( 'DROP TABLE IF EXISTS ' . $object_map_table );
		delete_option( $this->option_prefix . 'db_version' );
	}

	/**
	 * Clear the scheduled tasks
	 * This removes all the scheduled tasks that are included in the plugin's $schedulable_classes array
	 */
	public function clear_schedule() {
		if ( ! empty( $this->schedulable_classes ) ) {
			foreach ( $this->schedulable_classes as $key => $value ) {
				$schedule_name     = $key;
				$action_group_name = $schedule_name . $this->action_group_suffix;
				$this->queue->cancel( $action_group_name );
			}
		}
	}

	/**
	 * Delete the log post type
	 * This removes the log post type
	 */
	public function delete_log_post_type() {
		unregister_post_type( 'wp_log' );
	}

	/**
	 * Remove roles and capabilities
	 * This removes the configure_salesforce capability from the admin role
	 *
	 * It also allows other plugins to remove the capability from other roles
	 */
	public function remove_roles_capabilities() {

		// by default, only administrators can configure the plugin.
		$role = get_role( 'administrator' );
		$role->remove_cap( 'configure_salesforce' );

		// hook that allows other roles to configure the plugin as well.
		$roles = apply_filters( $this->option_prefix . 'roles_configure_salesforce', null );

		// for each role that we have, remove the configure salesforce capability.
		if ( null !== $roles ) {
			foreach ( $roles as $role ) {
				$role->remove_cap( 'configure_salesforce' );
			}
		}

	}

	/**
	 * Flush the plugin cache
	 */
	public function flush_plugin_cache() {
		$sfwp_transients = new Object_Sync_Sf_WordPress_Transient( 'sfwp_transients' );
		$sfwp_transients->flush();
	}

	/**
	 * Clear the plugin options
	 */
	public function delete_plugin_options() {
		$wpdb           = $this->wpdb;
		$plugin_options = $wpdb->get_results( $wpdb->prepare( "SELECT option_name FROM `{$wpdb->base_prefix}options` WHERE option_name LIKE %s;", $wpdb->esc_like( $this->option_prefix ) . '%' ), ARRAY_A );

		foreach ( $plugin_options as $option ) {
			delete_option( $option['option_name'] );
		}
	}

}
