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

        $this->table = $this->wpdb->prefix . 'salesforce_field_map';
    }

    public function create( $posted = array() ) {
    	$data = array( 'label' => $posted['label'], 'name' => sanitize_title( $posted['label'] ), 'salesforce_object' => $posted['salesforce_object'], 'wordpress_object' => $posted['wordpress_object'] );
    	$insert = $this->wpdb->insert( $this->table, $data );
    	if ( $insert === 1 ) {
    		return $this->wpdb->insert_id;
    	} else {
    		return false;
    	}
    }

    public function read( $id = '' ) {
    	$map = $this->wpdb->get_row( 'SELECT * FROM ' . $this->table . ' WHERE id = ' . $id, ARRAY_A );
    	return $map;
    }

    public function delete( $id = '' ) {
    	$data = array( 'id' => $id );
    	$delete = $this->wpdb->delete( $this->table, $data );
    	if ( $delete === 1 ) {
    		return true;
    	} else {
    		return false;
    	}
    }

    public function update( $posted = array(), $id = '' ) {
    	$data = array( 'label' => $posted['label'], 'name' => sanitize_title( $posted['label'] ), 'salesforce_object' => $posted['salesforce_object'], 'wordpress_object' => $posted['wordpress_object'] );
    	$update = $this->wpdb->update( $this->table, $data, array( 'id' => $id ) );
    	if ( $update === 1 ) {
    		echo 'this is an update';
    		return true;
    	} else {
    		return false;
    	}
    }

    public function generate_table() {
    	$table = '';
    	$table .= '<h3>Fieldmaps <a class="page-title-action" href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=add' ) . '">Add New</a></h3>';
    	$table .= '<table class="widefat striped"><thead><summary></summary><tr><th>Label</th><th>WordPress Object</th><th>Salesforce Object</th><th colspan="4">Actions</th></thead><tbody>';
    	$results = $this->get_all();
    	foreach ( $results as $record ) {
            $table .= '<tr><td>' . $record['label'] . '</td><td>' . $record['wordpress_object'] . '</td><td>' . $record['salesforce_object'] . '</td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=edit&id=' . $record['id'] ) . '">Edit</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=clone&id=' . $record['id'] ) . '">Clone</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=delete&id=' . $record['id'] ) . '">Delete</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=export&id=' . $record['id'] ) . '">Export</a></td></tr>';
        }
        $table .= '</tbody></table>';
        return $table;
    }

    private function get_all( $offset = '', $limit = '' ) {
        $table = $this->table;
        $results = $this->wpdb->get_results( "SELECT `id`, `label`, `wordpress_object`, `salesforce_object` FROM $table" , ARRAY_A );
        return $results;
    }

}