<?php

class Wordpress_Salesforce_Deactivate {

    protected $version;

    /**
    * What to do when the plugin is deactivated
    * @param string $version
    *
    */
    public function __construct( $version, $text_domain ) {
        $this->version = $version;
        register_deactivation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( &$this, 'wordpress_salesforce_drop_tables' ) );
    }

    public function wordpress_salesforce_drop_tables() {
        global $wpdb;
        $field_map_table = $wpdb->prefix . 'salesforce_field_map';
        $object_map_table = $wpdb->prefix . 'salesforce_object_map';
        $object_match_table = $wpdb->prefix . 'salesforce_object_match';
        $e = $wpdb->query( 'DROP TABLE IF EXISTS ' . $field_map_table );
        $wpdb->query( 'DROP TABLE IF EXISTS ' . $object_map_table );
        $wpdb->query( 'DROP TABLE IF EXISTS ' . $object_match_table );
        delete_option( 'salesforce_rest_api_db_version' );
    }

}