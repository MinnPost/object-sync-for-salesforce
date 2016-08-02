<?php

class Wordpress_Salesforce_Deactivate {

    protected $wpdb;
    protected $version;

    /**
    * What to do when the plugin is deactivated
    * @param string $version
    *
    */
    public function __construct( $wpdb, $version, $text_domain ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        register_deactivation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( &$this, 'wordpress_salesforce_drop_tables' ) );
        register_deactivation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( &$this, 'clear_schedule' ) );
    }

    public function wordpress_salesforce_drop_tables() {
        $field_map_table = $this->wpdb->prefix . 'salesforce_field_map';
        $object_map_table = $this->wpdb->prefix . 'salesforce_object_map';
        $object_match_table = $this->wpdb->prefix . 'salesforce_object_match';
        $this->wpdb->query( 'DROP TABLE IF EXISTS ' . $field_map_table );
        $this->wpdb->query( 'DROP TABLE IF EXISTS ' . $object_map_table );
        $this->wpdb->query( 'DROP TABLE IF EXISTS ' . $object_match_table );
        delete_option( 'salesforce_rest_api_db_version' );
    }

    public function clear_schedule() {
        wp_clear_scheduled_hook( 'start_serialized_event' );
    }

}