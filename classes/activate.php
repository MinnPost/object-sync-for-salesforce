<?php

class Wordpress_Salesforce_Activate {

    protected $version;
    protected $installed_version;

    /**
    * What to do when the plugin is activated
    * @param string $version
    *
    */
    public function __construct( $version, $text_domain ) {
        $this->version = $version;
        $this->installed_version = get_option( 'salesforce_rest_api_db_version', '' );
        register_activation_hook( dirname( __DIR__ ) . '/' . $text_domain . '.php', array( &$this, 'wordpress_salesforce_tables' ) );
        add_action( 'plugins_loaded', array( &$this, 'wordpress_salesforce_update_db_check' ) );
    }

    public function wordpress_salesforce_tables() {

        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        $field_map_table = $wpdb->prefix . 'salesforce_field_map';
        $field_map_sql = "CREATE TABLE $field_map_table (
          id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
          name varchar(64) DEFAULT '',
          wordpress_object varchar(32) NOT NULL DEFAULT '',
          salesforce_object varchar(32) NOT NULL DEFAULT '',
          description varchar(255) DEFAULT '',
          fields text NOT NULL,
          PRIMARY KEY (id)
        ) $charset_collate";

        $object_map_table = $wpdb->prefix . 'salesforce_object_map';
        $object_map_sql = "CREATE TABLE $object_map_table (
          id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
          field_map_id bigint(20) NOT NULL,
          wordpress_id bigint(20) NOT NULL,
          salesforce_id varchar(32) NOT NULL DEFAULT '',
          map_created datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
          map_last_exported datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
          map_last_imported datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
          PRIMARY KEY (id)
        ) $charset_collate";

        $object_match_table = $wpdb->prefix . 'salesforce_object_match';
        $object_match_sql = "CREATE TABLE $object_match_table (
          id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
          field_map_id bigint(20) NOT NULL,
          wordpress_field varchar(128) NOT NULL,
          match_order int(11) NOT NULL DEFAULT '0',
          PRIMARY KEY (id)
        ) $charset_collate";

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $field_map_sql );
        dbDelta( $object_map_sql );
        dbDelta( $object_match_sql );

        update_option( 'salesforce_rest_api_db_version', $this->version );

    }

    public function wordpress_salesforce_update_db_check() {
        if ( get_site_option( 'salesforce_rest_api_db_version' ) != $this->version ) {
            $this->wordpress_salesforce_tables();
        }
    }

}