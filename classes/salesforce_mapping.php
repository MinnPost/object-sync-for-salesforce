<?php


class Salesforce_Mapping {

	protected $wpdb;
    protected $version;
    protected $login_credentials;
    protected $text_domain;
    protected $salesforce;

    /**
    * Functionality for mapping Salesforce and WordPress objects
    *
    * @param array $loggedin
    * @param array $text_domain
    * @throws \Exception
    */
    public function __construct( $wpdb, $version, $login_credentials, $text_domain, $salesforce ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->login_credentials = $login_credentials;
        $this->text_domain = $text_domain; 
        $this->salesforce = $salesforce;
    }

    public function generate_table() {
    	$table = '';
    	$table .= '<h3>Fieldmaps <a class="page-title-action" href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=add' ) . '">Add New</a></h3>';
    	$table .= '<table class="widefat striped"><thead><summary></summary><tr><th>WordPress Object</th><th>Salesforce Object</th><th>Description</th><th colspan="4">Actions</th></thead><tbody>';
    	$results = $this->get_all();
    	foreach ( $results as $record ) {
            $table .= '<tr><td>' . $record['wordpress_object'] . '</td><td>' . $record['salesforce_object'] . '</td><td>' . $record['description'] . '</td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=edit&id=' . $record['id'] ) . '">Edit</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=clone&id=' . $record['id'] ) . '">Clone</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=delete&id=' . $record['id'] ) . '">Delete</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=export&id=' . $record['id'] ) . '">Export</a></td></tr>';
        }
        $table .= '</tbody></table>';
        return $table;
    }

    private function get_all( $offset = '', $limit = '' ) {
        $table = $this->wpdb->prefix . 'salesforce_field_map';
        $results = $this->wpdb->get_results( "SELECT `id`, `wordpress_object`, `salesforce_object`, `description` FROM $table" , ARRAY_A );
        return $results;
    }

}