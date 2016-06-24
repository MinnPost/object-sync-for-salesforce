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

    /**
    * Create a map row between a WordPress and Salesforce object
    *
    * @param array $posted
    * @throws \Exception
    */
    public function create( $posted = array() ) {
    	$data = array( 'label' => $posted['label'], 'name' => sanitize_title( $posted['label'] ), 'salesforce_object' => $posted['salesforce_object'], 'wordpress_object' => $posted['wordpress_object'] );
    	if ( isset( $posted['pull_trigger_field'] ) ) {
    		$data['pull_trigger_field'] = $posted['pull_trigger_field'];
    	}
    	$insert = $this->wpdb->insert( $this->table, $data );
    	if ( $insert === 1 ) {
    		return $this->wpdb->insert_id;
    	} else {
    		return false;
    	}
    }

    /**
    * Read a map row between a WordPress and Salesforce object
    *
    * @param array $id
    * @return $map
    * @throws \Exception
    */
    public function read( $id = '' ) {
    	$map = $this->wpdb->get_row( 'SELECT * FROM ' . $this->table . ' WHERE id = ' . $id, ARRAY_A );
    	return $map;
    }

    /**
    * Delete a map row between a WordPress and Salesforce object
    *
    * @param array $id
    * @throws \Exception
    */
    public function delete( $id = '' ) {
    	$data = array( 'id' => $id );
    	$delete = $this->wpdb->delete( $this->table, $data );
    	if ( $delete === 1 ) {
    		return true;
    	} else {
    		return false;
    	}
    }

    /**
    * Update a map row between a WordPress and Salesforce object
    *
    * @param array $posted
    * @param array $id
    * @return $map
    * @throws \Exception
    */
    public function update( $posted = array(), $id = '' ) {
    	$data = array( 'label' => $posted['label'], 'name' => sanitize_title( $posted['label'] ), 'salesforce_object' => $posted['salesforce_object'], 'wordpress_object' => $posted['wordpress_object'] );
    	if ( isset( $posted['pull_trigger_field'] ) ) {
    		$data['pull_trigger_field'] = $posted['pull_trigger_field'];
    	}
    	$update = $this->wpdb->update( $this->table, $data, array( 'id' => $id ) );
    	if ( $update === FALSE ) {
    		return false;
    	} else {
    		return true;
    	}
    }

    /**
    * Get all map rows between WordPress and Salesforce objects
    * Can optionally limit or offset, if necessary
    *
    * @param int $offset
    * @param int $limit
    * @return $results
    * @throws \Exception
    */
    public function get_all( $offset = '', $limit = '' ) {
        $table = $this->table;
        $results = $this->wpdb->get_results( "SELECT `id`, `label`, `wordpress_object`, `salesforce_object`, `fields`, `pull_trigger_field` FROM $table" , ARRAY_A );
        return $results;
    }

}