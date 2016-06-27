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
    	$data = $this->setup_data( $posted );
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
        $map['fields'] = maybe_unserialize( $map['fields'] );
        $map['sync_triggers'] = maybe_unserialize( $map['sync_triggers'] );
    	return $map;
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
    	$data = $this->setup_data( $posted );
    	$update = $this->wpdb->update( $this->table, $data, array( 'id' => $id ) );
    	if ( $update === FALSE ) {
    		return false;
    	} else {
    		return true;
    	}
    }

    /**
    * 
    *
    * @param array $posted
    * @return $data
    */
    private function setup_data( $posted = array() ) {
    	$data = array( 'label' => $posted['label'], 'name' => sanitize_title( $posted['label'] ), 'salesforce_object' => $posted['salesforce_object'], 'wordpress_object' => $posted['wordpress_object'] );
		if ( isset( $posted['wordpress_field'] ) && is_array( $posted['wordpress_field'] ) && isset( $posted['salesforce_field'] ) && is_array( $posted['salesforce_field'] ) ) {
			$setup['fields'] = array();
			foreach ( $posted['wordpress_field'] as $key => $value ) {
				if ( !isset( $posted['direction'][$key] ) ) {
					$posted['direction'][$key] = 'sync';
				}
				if ( !isset( $posted['is_key'][$key] ) ) {
					$posted['is_key'][$key] = false;
				}
				if ( !isset( $posted['is_delete'][$key] ) ) {
					$posted['is_delete'][$key] = false;
				}
				if ( $posted['is_delete'][$key] === false ) {
					$setup['fields'][$key] = array(
						'wordpress_field' => sanitize_text_field( $posted['wordpress_field'][$key] ),
						'salesforce_field' => sanitize_text_field( $posted['salesforce_field'][$key] ),
						'is_key' => sanitize_text_field( $posted['is_key'][$key] ),
						'direction' => sanitize_text_field( $posted['direction'][$key] ),
						'is_delete' => sanitize_text_field( $posted['is_delete'][$key] )
					);
				}
			}
			$data['fields'] = maybe_serialize( $setup['fields'] );
		}
    	if ( isset( $posted['pull_trigger_field'] ) ) {
    		$data['pull_trigger_field'] = $posted['pull_trigger_field'];
    	}
    	if ( isset( $posted['sync_triggers'] ) && is_array( $posted['sync_triggers'] ) ) {
    		$setup['sync_triggers'] = array();
    		foreach ( $posted['sync_triggers'] as $key => $value ) {
    			$setup['sync_triggers'][$key] = esc_html( $posted['sync_triggers'][$key] );
    		}
    	} else {
    		$setup['sync_triggers'] = array();
    	}
    	$data['sync_triggers'] = maybe_serialize( $setup['sync_triggers'] );
    	if ( isset( $posted['pull_trigger_field'] ) ) {
    		$data['pull_trigger_field'] = $posted['pull_trigger_field'];
    	}
		$data['push_async'] = isset( $posted['push_async'] ) ? $posted['push_async'] : '';
    	return $data;
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
        $results = $this->wpdb->get_results( "SELECT `id`, `label`, `wordpress_object`, `salesforce_object`, `fields`, `pull_trigger_field`, `sync_triggers`, `push_async` FROM $table" , ARRAY_A );
        foreach ( $results as $result ) {
        	$result['fields'] = maybe_unserialize( $result['fields'] );
        	$result['sync_triggers'] = maybe_unserialize( $result['sync_triggers'] );
        }
        return $results;
    }

}