<?php
/**
 * @file
 */

if ( ! class_exists( 'Salesforce_Rest_API' ) ) {
    die();
}

/**
 * What to do when the plugin is deactivated
 */
class Wordpress_Salesforce_Deactivate {

    protected $wpdb;
    protected $version;

    /**
    * Constructor which sets up deactivate hooks
    * @param object $wpdb
    * @param string $version
    * @param string $text_domain
    * @param array $schedulable_classes
    *
    */
    public function __construct( $wpdb, $version, $text_domain, $schedulable_classes ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->schedulable_classes = $schedulable_classes;
        register_deactivation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( $this, 'wordpress_salesforce_drop_tables' ) );
        register_deactivation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( $this, 'clear_schedule' ) );
        register_deactivation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( $this, 'delete_log_post_type' ) );
        register_deactivation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( $this, 'remove_roles_capabilities' ) );
    }

    /**
    * Drop database tables for Salesforce
    * This removes the tables for fieldmaps (between types of objects) and object maps (between indidual instances of objects)
    *
    */ 
    public function wordpress_salesforce_drop_tables() {
        $field_map_table = $this->wpdb->prefix . 'salesforce_field_map';
        $object_map_table = $this->wpdb->prefix . 'salesforce_object_map';
        $this->wpdb->query( 'DROP TABLE IF EXISTS ' . $field_map_table );
        $this->wpdb->query( 'DROP TABLE IF EXISTS ' . $object_map_table );
        delete_option( 'salesforce_rest_api_db_version' );
    }

    /**
    * Clear the scheduled tasks
    * This removes all the scheduled tasks that are included in the plugin's $schedulable_classes array
    *
    */ 
    public function clear_schedule() {
        foreach ( $this->schedulable_classes as $key => $value ) {
            wp_clear_scheduled_hook( $key );
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
        $roles = apply_filters( 'salesforce_rest_api_roles_configure_salesforce', null );

        // for each role that we have, remove the configure salesforce capability
        if ( null !== $roles ) {
            foreach ( $roles as $role ) {
                $role = get_role( $role );
                $role->remove_cap( 'configure_salesforce' );
            }
        }
        
    }

}