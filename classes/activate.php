<?php

if ( ! class_exists( 'Salesforce_Rest_API' ) ) {
    die();
}

class Wordpress_Salesforce_Activate {

    protected $wpdb;
    protected $version;
    protected $installed_version;

    /**
    * What to do when the plugin is activated
    *
    * @param object $wpdb
    * @param string $version
    * @param string $text_domain
    *
    */
    public function __construct( $wpdb, $version, $text_domain ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->installed_version = get_option( 'salesforce_rest_api_db_version', '' );
        register_activation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( &$this, 'wordpress_salesforce_tables' ) );
        register_activation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( $this, 'add_roles_capabilities' ) );
        add_action( 'plugins_loaded', array( &$this, 'wordpress_salesforce_update_db_check' ) );
    }

    /**
    * Create database tables for Salesforce
    * This creates tables for fieldmaps (between types of objects) and object maps (between indidual instances of objects)
    *
    */ 
    public function wordpress_salesforce_tables() {

        $charset_collate = $this->wpdb->get_charset_collate();

        $field_map_table = $this->wpdb->prefix . 'salesforce_field_map';
        $field_map_sql = "CREATE TABLE $field_map_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            label varchar(64) NOT NULL DEFAULT '',
            name varchar(64) NOT NULL DEFAULT '',
            wordpress_object varchar(128) NOT NULL DEFAULT '',
            salesforce_object varchar(255) NOT NULL DEFAULT '',
            salesforce_record_types_allowed longblob,
            salesforce_record_type_default varchar(255) NOT NULL DEFAULT '',
            fields text NOT NULL,
            pull_trigger_field varchar(128) NOT NULL DEFAULT 'LastModifiedDate',
            sync_triggers text NOT NULL,
            push_async tinyint(1) NOT NULL DEFAULT '0',
            ignore_drafts tinyint(1) NOT NULL DEFAULT '0',
            weight tinyint(1) NOT NULL DEFAULT '0',
            PRIMARY KEY  (id)
        ) $charset_collate";

        $object_map_table = $this->wpdb->prefix . 'salesforce_object_map';
        $object_map_sql = "CREATE TABLE $object_map_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            wordpress_id bigint(20) NOT NULL,
            salesforce_id varchar(32) NOT NULL DEFAULT '',
            wordpress_object varchar(128) NOT NULL DEFAULT '',
            created datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
            object_updated datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
            last_sync datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
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
        dbDelta( $field_map_sql );
        dbDelta( $object_map_sql );

        update_option( 'salesforce_rest_api_db_version', $this->version );

    }

    /**
    * Check for database version on plugin upgrade
    * When the plugin is upgraded, if the database version does not match the current version, perform these methods
    *
    */ 
    public function wordpress_salesforce_update_db_check() {
        if ( get_site_option( 'salesforce_rest_api_db_version' ) != $this->version ) {
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
        $roles = apply_filters( 'salesforce_rest_api_roles', NULL );

        // for each role that we have, give it the configure salesforce capability
        if ( $roles !== NULL ) {
            foreach ( $roles as $role ) {
                $role->add_cap( 'configure_salesforce' );
            }
        }
        
    }

}