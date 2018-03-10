<?php
/**
 * Class file for the Object_Sync_Sf_Activate class.
 *
 * @file
 */

if ( ! class_exists( 'Object_Sync_Salesforce' ) ) {
	die();
}

/**
 * What to do when the plugin is activated
 */
class Object_Sync_Sf_Activate {

	protected $wpdb;
	protected $version;
	protected $installed_version;

	/**
	* Constructor which sets up activate hooks
	*
	* @param object $wpdb
	* @param string $version
	* @param string $slug
	*
	*/
	public function __construct( $wpdb, $version, $slug ) {
		$this->wpdb              = $wpdb;
		$this->version           = $version;
		$this->installed_version = get_option( 'object_sync_for_salesforce_db_version', '' );
		register_activation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'php_requirements' ) );
		register_activation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'wordpress_salesforce_tables' ) );
		register_activation_hook( dirname( __DIR__ ) . '/' . $slug . '.php', array( $this, 'add_roles_capabilities' ) );
		add_action( 'plugins_loaded', array( $this, 'wordpress_salesforce_update_db_check' ) );
	}

	/**
	* Check for the minimum required version of php
	*/
	public function php_requirements() {
		if ( version_compare( PHP_VERSION, '5.5', '<' ) ) {
			deactivate_plugins( plugin_basename( __FILE__ ) );
			wp_die( '<strong>This plugin requires PHP Version 5.5</strong> <br />Please contact your host to upgrade PHP on your server, and then retry activating the plugin.' );
		}
	}

	/**
	* Create database tables for Salesforce
	* This creates tables for fieldmaps (between types of objects) and object maps (between indidual instances of objects)
	*
	*/
	public function wordpress_salesforce_tables() {

		$charset_collate = $this->wpdb->get_charset_collate();

		$field_map_table = $this->wpdb->prefix . 'object_sync_sf_field_map';
		$field_map_sql   = "CREATE TABLE $field_map_table (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			label varchar(64) NOT NULL DEFAULT '',
			name varchar(64) NOT NULL DEFAULT '',
			wordpress_object varchar(128) NOT NULL DEFAULT '',
			salesforce_object varchar(255) NOT NULL DEFAULT '',
			salesforce_record_types_allowed longblob,
			salesforce_record_type_default varchar(255) NOT NULL DEFAULT '',
			fields longtext NOT NULL,
			pull_trigger_field varchar(128) NOT NULL DEFAULT 'LastModifiedDate',
			sync_triggers text NOT NULL,
			push_async tinyint(1) NOT NULL DEFAULT '0',
			push_drafts tinyint(1) NOT NULL DEFAULT '0',
			weight tinyint(1) NOT NULL DEFAULT '0',
			version varchar(255) NOT NULL DEFAULT '',
			PRIMARY KEY  (id),
			UNIQUE KEY name (name),
			KEY name_sf_type_wordpress_type (wordpress_object,salesforce_object)
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
			UNIQUE KEY salesforce (salesforce_id),
			UNIQUE KEY salesforce_wordpress (wordpress_object,wordpress_id),
			KEY wordpress_object (wordpress_object,wordpress_id),
			KEY salesforce_object (salesforce_id)
		) $charset_collate";

		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

		// Note: see https://wordpress.stackexchange.com/questions/67345/how-to-implement-wordpress-plugin-update-that-modifies-the-database
		// When we run the dbDelta method below, "it checks if the table exists. What's more, it checks the column types. So if the table doesn't exist, it creates it, if it does, but some column types have changed it updates them, and if a column doesn't exists - it adds it."
		// This does not remove columns if we remove columns, so we'll need to expand beyond this in the future if that happens, although I think the schema is pretty solid now.
		dbDelta( $field_map_sql );
		dbDelta( $object_map_sql );

		update_option( 'object_sync_for_salesforce_db_version', $this->version );

		// store right now as the time for the plugin's activation
		update_option( 'object_sync_for_salesforce_activate_time', current_time( 'timestamp', true ) );

	}

	/**
	* Check for database version on plugin upgrade
	* When the plugin is upgraded, if the database version does not match the current version, perform these methods
	*
	*/
	public function wordpress_salesforce_update_db_check() {
		if ( get_site_option( 'object_sync_for_salesforce_db_version' ) !== $this->version ) {
			$this->wordpress_salesforce_tables();
		}
	}

	/**
	* Add roles and capabilities
	* This adds the configure_salesforce capability to the admin role
	*
	* It also allows other plugins to add the capability to other roles
	*
	*/
	public function add_roles_capabilities() {

		// by default, only administrators can configure the plugin
		$role = get_role( 'administrator' );
		$role->add_cap( 'configure_salesforce' );

		// hook that allows other roles to configure the plugin as well
		$roles = apply_filters( 'object_sync_for_salesforce_roles_configure_salesforce', null );

		// for each role that we have, give it the configure salesforce capability
		if ( null !== $roles ) {
			foreach ( $roles as $role ) {
				$role = get_role( $role );
				$role->add_cap( 'configure_salesforce' );
			}
		}

	}

}
