<?php
/**
 * Class file for the Object_Sync_Sf_Deactivate class.
 *
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * What to do when the plugin is deactivated
 */
class Object_Sync_Sf_Deactivate {

	protected $wpdb;
	protected $version;
	protected $slug;
	protected $schedulable_classes;
	protected $option_prefix;
	protected $queue;

	/**
	* Constructor which sets up deactivate hooks
	* @param object $wpdb
	* @param string $version
	* @param string $slug
	* @param array $schedulable_classes
	* @param string $option_prefix
	* @param object $queue
	*
	*/
	public function __construct( $wpdb, $version, $slug, $schedulable_classes, $option_prefix = '', $queue = '' ) {
		$this->wpdb                = $wpdb;
		$this->version             = $version;
		$this->slug                = $slug;
		$this->option_prefix       = isset( $option_prefix ) ? $option_prefix : 'object_sync_for_salesforce_';
		$this->schedulable_classes = $schedulable_classes;
		$this->queue               = $queue;

		$this->action_group_suffix = '_check_records';
		$delete_data               = (int) get_option( $this->option_prefix . 'delete_data_on_uninstall', 0 );
		if ( 1 === $delete_data ) {
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'wordpress_salesforce_drop_tables' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'clear_schedule' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'delete_log_post_type' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'remove_roles_capabilities' ) );
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'flush_plugin_cache' )
			);
			register_deactivation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'delete_plugin_options' ) );
		}
	}

	/**
	* Drop database tables for Salesforce
	* This removes the tables for fieldmaps (between types of objects) and object maps (between indidual instances of objects)
	*
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
	*
	*/
	public function clear_schedule() {
		if ( '' === $this->queue ) {
			return;
		}
		foreach ( $this->schedulable_classes as $key => $value ) {
			$schedule_name     = $key;
			$action_group_name = $schedule_name . $this->action_group_suffix;
			$this->queue->cancel( $action_group_name );
		}
	}

	/**
	* Delete the log post type
	* This removes the log post type
	*
	*/
	public function delete_log_post_type() {
		unregister_post_type( 'wp_log' );
	}

	/**
	* Remove roles and capabilities
	* This removes the configure_salesforce capability from the admin role
	*
	* It also allows other plugins to remove the capability from other roles
	*
	*/
	public function remove_roles_capabilities() {

		// by default, only administrators can configure the plugin
		$role = get_role( 'administrator' );
		$role->remove_cap( 'configure_salesforce' );

		// hook that allows other roles to configure the plugin as well
		$roles = apply_filters( $this->option_prefix . 'roles_configure_salesforce', null );

		// for each role that we have, remove the configure salesforce capability
		if ( null !== $roles ) {
			foreach ( $roles as $role ) {
				$role->remove_cap( 'configure_salesforce' );
			}
		}

	}

	/**
	* Flush the plugin cache
	*
	*/
	public function flush_plugin_cache() {
		$sfwp_transients = new Object_Sync_Sf_WordPress_Transient( 'sfwp_transients' );
		$sfwp_transients->flush();
	}

	/**
	* Clear the plugin options
	*
	*/
	public function delete_plugin_options() {
		$table          = $this->wpdb->prefix . 'options';
		$plugin_options = $this->wpdb->get_results( 'SELECT option_name FROM ' . $table . ' WHERE option_name LIKE "object_sync_for_salesforce_%"', ARRAY_A );
		foreach ( $plugin_options as $option ) {
			delete_option( $option['option_name'] );
		}
	}

}
