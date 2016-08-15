<?php

class Salesforce_Mapping {

	protected $wpdb;
    protected $version;
    protected $text_domain;
    protected $fieldmap_table;
    protected $object_map_table;

    public $sync_off;
    public $sync_wordpress_create;
    public $sync_wordpress_update;
    public $sync_wordpress_delete;
    public $sync_sf_create;
    public $sync_sf_update;
    public $sync_sf_delete;

    public $direction_wordpress_sf;
    public $direction_sf_wordpress;
    public $direction_sync;

    public $default_record_type;

    public $array_delimiter;

    public $name_length;

    public $status_success;
    public $status_error;

    /**
    * Functionality for mapping Salesforce and WordPress objects
    *
    * @param object $wpdb
    * @param string $version
    * @param string $text_domain
    * @throws \Exception
    */
    public function __construct( $wpdb, $version, $text_domain ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->text_domain = $text_domain;

        $this->fieldmap_table = $this->wpdb->prefix . 'salesforce_field_map';
        $this->object_map_table = $this->wpdb->prefix . 'salesforce_object_map';

        // this is how we define when syncing should occur on each field map
        // it gets used in the admin settings, as well as the push/pull methods to see if something should happen
        // i don't know why it uses these bit flags, but can't think of a reason not to keep the convention
        $this->sync_off = 0x0000;
        $this->sync_wordpress_create = 0x0001;
        $this->sync_wordpress_update = 0x0002;
        $this->sync_wordpress_delete = 0x0004;
        $this->sync_sf_create = 0x0008;
        $this->sync_sf_update = 0x0010;
        $this->sync_sf_delete = 0x0020;

        // constants for the directions to map things
        $this->direction_wordpress_sf = 'drupal_sf';
        $this->direction_sf_wordpress = 'sf_drupal';
        $this->direction_sync = 'sync';

        // what kind of record are we dealing with
        $this->default_record_type = 'default';

        // salesforce has multipicklists and they have a delimiter
        $this->array_delimiter = ';';

        // max length for a mapping field
        $this->name_length = 128;

        // statuses for object sync
        $this->status_success = 1;
        $this->status_error = 0;

    }

    /**
    * Create a fieldmap row between a WordPress and Salesforce object
    *
    * @param array $posted
    * @throws \Exception
    */
    public function create_fieldmap( $posted = array() ) {
    	$data = $this->setup_fieldmap_data( $posted );
    	$insert = $this->wpdb->insert( $this->fieldmap_table, $data );
    	if ( $insert === 1 ) {
    		return $this->wpdb->insert_id;
    	} else {
    		return false;
    	}
    }

    /**
    * Get one or more fieldmap rows between a WordPress and Salesforce object
    *
    * @param int $id
    * @param array $conditions
    * @param bool $reset
    * @return $map or $mappings
    * @throws \Exception
    */
    public function get_fieldmaps( $id = NULL, $conditions = array(), $reset = false ) {
        $table = $this->fieldmap_table;
        if ( $id !== NULL ) { // get one fieldmap
            $map = $this->wpdb->get_row( 'SELECT * FROM ' . $table . ' WHERE id = ' . $id, ARRAY_A );
            $map['fields'] = maybe_unserialize( $map['fields'] );
            $map['sync_triggers'] = maybe_unserialize( $map['sync_triggers'] );
            return $map;
        } else if ( !empty( $conditions ) ) { // get multiple but with a limitation
            $mappings = array();
        
            if ( !empty( $conditions ) ) {
                $where = ' WHERE ';
                $i = 0;
                foreach ( $conditions as $key => $value ) {
                    $i++;
                    if ( $i > 1 ) {
                        $where .= ' AND ';
                    }
                    $where .= '`' . $key . '`' . ' = "' . $value . '"';
                }
            } else {
                $where = '';
            }

            $mappings = $this->wpdb->get_results( 'SELECT * FROM ' . $table . $where . ' ORDER BY `weight`', ARRAY_A );

            if (!empty($mappings)) {
                foreach ( $mappings as $mapping ) {
                    $mapping['fields'] = maybe_unserialize( $mapping['fields'] );
                    $mapping['sync_triggers'] = maybe_unserialize( $mapping['sync_triggers'] );
                }
            }

            return $mappings;

        } else { // get all of em

            $mappings = $this->wpdb->get_results( "SELECT `id`, `label`, `wordpress_object`, `salesforce_object`, `fields`, `pull_trigger_field`, `sync_triggers`, `push_async`, `weight` FROM $table" , ARRAY_A );
            foreach ( $mappings as $mapping ) {
                $mapping['fields'] = maybe_unserialize( $mapping['fields'] );
                $mapping['sync_triggers'] = maybe_unserialize( $mapping['sync_triggers'] );
            }
            return $mappings;
        }
        
    }

    /**
    * Update a fieldmap row between a WordPress and Salesforce object
    *
    * @param array $posted
    * @param array $id
    * @return $map
    * @throws \Exception
    */
    public function update_fieldmap( $posted = array(), $id = '' ) {
    	$data = $this->setup_fieldmap_data( $posted );
    	$update = $this->wpdb->update( $this->fieldmap_table, $data, array( 'id' => $id ) );
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
    private function setup_fieldmap_data( $posted = array() ) {
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
        $data['ignore_drafts'] = isset( $posted['ignore_drafts'] ) ? $posted['ignore_drafts'] : '';
        $data['weight'] = isset( $posted['weight'] ) ? $posted['weight'] : '';
    	return $data;
    }

    /**
    * Delete a fieldmap row between a WordPress and Salesforce object
    *
    * @param array $id
    * @throws \Exception
    */
    public function delete_fieldmap( $id = '' ) {
    	$data = array( 'id' => $id );
    	$delete = $this->wpdb->delete( $this->fieldmap_table, $data );
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
        $results = $this->wpdb->get_results( "SELECT `id`, `label`, `wordpress_object`, `salesforce_object`, `fields`, `pull_trigger_field`, `sync_triggers`, `push_async`, `weight` FROM $table" , ARRAY_A );
        foreach ( $results as $result ) {
        	$result['fields'] = maybe_unserialize( $result['fields'] );
        	$result['sync_triggers'] = maybe_unserialize( $result['sync_triggers'] );
        }
        return $results;
    }

    /**
    * Loads multiple salesforce_mappings based on a set of matching conditions.
    *
    * @param array $properties
    *   An array of properties on the {salesforce_mapping} table in the form
    *     'field' => $value.
    * @param bool $reset
    *   Whether to reset the internal contact loading cache.
    *
    * @return array
    *   An array of salesforce_mapping objects.
    */
    function load_multiple( $properties = array(), $reset = FALSE ) {
        $mappings = new stdClass();
        
        if ( !empty( $properties ) ) {
            $where = ' WHERE ';
            $i = 0;
            foreach ( $properties as $key => $value ) {
                $i++;
                if ( $i > 1 ) {
                    $where .= ' AND ';
                }
                $where .= '`' . $key . '`' . ' = "' . $value . '"';
            }
        } else {
            $where = '';
        }

        $results = $this->wpdb->get_results( 'SELECT * FROM wp_salesforce_field_map' . $where . ' ORDER BY `weight`', OBJECT );

        if (!empty($results)) {
            $mappings = $results;
        }

        return $mappings;
        
    }

}