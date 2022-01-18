<?php
/**
 * Handles getting and setting the transients.
 *
 * @class   Object_Sync_Sf_Sync_Transients
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Sync_Transients class.
 */
class Object_Sync_Sf_Sync_Transients {

	/**
	 * Current version of the plugin
	 *
	 * @var string
	 */
	public $version;

	/**
	 * The plugin's prefix when saving options to the database
	 *
	 * @var string
	 */
	public $option_prefix;

	/**
	 * Transient keys that can be upgraded
	 *
	 * @var string
	 * @deprecated   this was added in 2.1.0 to upgrade old option keys, but will be removed in a future version.
	 */
	private $upgradeable_keys;

	/**
	 * Constructor for transient records class
	 */
	public function __construct() {
		$this->version          = object_sync_for_salesforce()->version;
		$this->option_prefix    = object_sync_for_salesforce()->option_prefix;
		$this->upgradeable_keys = $this->get_upgradeable_keys();

	}

	/**
	 * Generate a transient key
	 *
	 * @param array $params the pieces to put together.
	 * @param bool  $legacy whether this is a legacy key. This is for deprecated keys and will be removed in a future version.
	 * @return string $key the full transient key.
	 */
	private function generate_transient_key( $params, $legacy = false ) {
		array_unshift( $params, substr( $this->option_prefix, 0, -1 ) ); // add the prefixes.
		// remove null and empty values.
		$params = array_filter(
			$params,
			function( $value ) {
				return ! is_null( $value ) && '' !== $value;
			}
		);

		// legacy keys don't have a fieldmap.
		if ( true === $legacy && isset( $params['fieldmap_id'] ) ) {
			unset( $params['fieldmap_id'] );
		}

		// make the key a string.
		$key = implode( '_', $params );

		// note: the WordPress codex indicates that option names do not need to be escaped.
		// see: https://developer.wordpress.org/reference/functions/update_option/.

		return $key;
	}

	/**
	 * Set individual transient records for sync operations
	 *
	 * @param string $operation what is the transient related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @param mixed  $value the value to be saved in the option.
	 * @param int    $expiration whether to expire the transient.
	 * @return bool  $result value of the save operation.
	 */
	public function set( $operation, $object_type = '', $fieldmap_id = '', $value = '', $expiration = 0 ) {
		// generate the option key parameters.
		$params = array(
			'operation'   => $operation,
			'object_type' => $object_type,
			'fieldmap_id' => $fieldmap_id,
		);
		$key    = $this->generate_transient_key( $params );
		$value  = isset( $value ) ? $value : '';

		/*
		 * examples
		 * object_sync_for_salesforce_pull_last_sync_Contact_1
		 * object_sync_for_salesforce_currently_pulling_query_Contact_1
		 * object_sync_for_salesforce_pull_merge_last_Contact_1
		 * object_sync_for_salesforce_pull_delete_last_Contact_1
		 */

		$result = set_transient( $key, $value, $expiration );

		if ( true === $result ) {
			$legacy_key = $this->generate_transient_key( $params, true );
			// if the legacy key exists and the keys are not the same, we might need to upgrade.
			if ( get_transient( $legacy_key ) && $key !== $legacy_key ) {
				$this->legacy_transient_upgrade( $operation, $object_type, $fieldmap_id );
			}
		}
		return $result;
	}

	/**
	 * Set individual transient records for sync operations
	 *
	 * @param string $operation what is the option related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @param mixed  $value the value to be saved in the option.
	 * @param int    $expiration whether to expire the transient.
	 * @return bool  $result value of the save operation.
	 * @deprecated   this was added in 2.1.0 to upgrade old transient keys, but will be removed in a future version.
	 */
	private function legacy_transient_upgrade( $operation, $object_type = '', $fieldmap_id = '', $value = '', $expiration = 0 ) {
		$result       = false;
		$legacy_value = $this->legacy_get( $operation, $object_type, $fieldmap_id );
		if ( false !== $legacy_value ) {
			// generate the option key parameters.
			$params = array(
				'operation'   => $operation,
				'object_type' => $object_type,
				'fieldmap_id' => $fieldmap_id,
			);
			$key    = $this->generate_transient_key( $params, true );
			$this->add_upgradeable_key( $key );
			$result = $this->set( $operation, $object_type, $fieldmap_id, $legacy_value );
			if ( true === $result ) {
				$this->legacy_delete( $key );
			}
		}
		return $result;
	}

	/**
	 * Get individual transient records for sync operations
	 *
	 * @param string $operation what is the option related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the WordPress or Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @param mixed  $default the default value for the transient.
	 * @return mixed $value the value of the item. False if it's empty.
	 */
	public function get( $operation, $object_type = '', $fieldmap_id = '', $default = false ) {
		// generate the transient key parameters.
		$params = array(
			'operation'   => $operation,
			'object_type' => $object_type,
			'fieldmap_id' => $fieldmap_id,
		);
		$key    = $this->generate_transient_key( $params );
		$value  = get_transient( $key );

		/*
		 * examples
		 * object_sync_for_salesforce_pull_last_sync_Contact_1
		 * object_sync_for_salesforce_currently_pulling_query_Contact_1
		 * object_sync_for_salesforce_pull_merge_last_Contact_1
		 * object_sync_for_salesforce_pull_delete_last_Contact_1
		 */

		// if the new transient value does exist but it has a default value, try to upgrade the old one.
		if ( get_transient( $key ) && $default === $value ) {
			$legacy_key = $this->generate_transient_key( $params, true );
			// if the keys are not the same, we might need to upgrade.
			if ( $key !== $legacy_key ) {
				$this->legacy_transient_upgrade( $operation, $object_type, $fieldmap_id, $value );
			}
		}
		return $value;
	}

	/**
	 * Get legacy named individual transiuent records for sync operations
	 *
	 * @param string $operation what is the transient related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the WordPress or Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @return mixed $value the value of the item. False if it's empty.
	 * @deprecated   this was added in 2.1.0 to upgrade old option keys, but will be removed in a future version.
	 */
	public function legacy_get( $operation, $object_type = '', $fieldmap_id ) {
		// generate the transient key parameters.
		$params = array(
			'operation'   => $operation,
			'object_type' => $object_type,
			'fieldmap_id' => $fieldmap_id,
		);
		$key    = $this->generate_transient_key( $params, true );
		$value  = get_transient( $key );
		return $value;
	}

	/**
	 * Delete the individual transient records for sync operation
	 *
	 * @param string $operation what is the transient related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the WordPress or Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @return bool  $result True if successful, false otherwise.
	 */
	public function delete( $operation, $object_type = '', $fieldmap_id = '' ) {
		// generate the transient key parameters.
		$params = array(
			'operation'   => $operation,
			'object_type' => $object_type,
			'fieldmap_id' => $fieldmap_id,
		);
		$key    = $this->generate_transient_key( $params );
		$result = delete_transient( $key );
		return $result;
	}

	/**
	 * Delete the legacy individual transient records for sync operation
	 *
	 * @param string $key the legacy key to delete.
	 * @return bool  $result True if successful, false otherwise.
	 * @deprecated   this was added in 2.1.0 to upgrade old transient keys, but will be removed in a future version.
	 */
	public function legacy_delete( $key ) {
		$result = delete_transient( $key );
		if ( true === $result ) {
			$this->remove_upgradeable_key( $key );
		}
		return $result;
	}

	/**
	 * Add an transient key to the array of upgradeable keys.
	 *
	 * @param string $key the key to add to the array.
	 * @return array $this->upgradeable_keys the array of keys.
	 * @deprecated   this was added in 2.1.0 to upgrade old transient keys, but will be removed in a future version.
	 */
	private function add_upgradeable_key( $key ) {
		$keys   = $this->get_upgradeable_keys();
		$keys[] = $key;
		$keys   = array_unique( $keys );
		$result = update_option( $this->option_prefix . 'upgradeable_keys', $keys );
		if ( true === $result ) {
			$this->upgradeable_keys = $keys;
			return $this->upgradeable_keys;
		}
	}

	/**
	 * Remove a transient key from the array of upgradeable keys.
	 *
	 * @param string $key the key to remove from the array.
	 * @return array $this->upgradeable_keys the array of keys.
	 * @deprecated   this was added in 2.1.0 to upgrade old transient keys, but will be removed in a future version.
	 */
	private function remove_upgradeable_key( $key ) {
		$keys      = $this->get_upgradeable_keys();
		$array_key = array_search( $key, $keys, true );
		if ( false !== $array_key ) {
			unset( $keys[ $array_key ] );
		}
		$result = update_option( $this->option_prefix . 'upgradeable_keys', $keys );
		if ( true === $result ) {
			$this->upgradeable_keys = $keys;
			if ( empty( $keys ) ) {
				delete_option( $this->option_prefix . 'upgradeable_keys' );
			}
			return $this->upgradeable_keys;
		}
	}

	/**
	 * Get the array of upgradeable keys.
	 *
	 * @return array $this->upgradeable_keys the array of keys.
	 * @deprecated   this was added in 2.1.0 to upgrade old transient keys, but will be removed in a future version.
	 */
	private function get_upgradeable_keys() {
		$keys                   = get_option( $this->option_prefix . 'upgradeable_keys', array() );
		$keys                   = array_unique( $keys );
		$this->upgradeable_keys = $keys;
		return $this->upgradeable_keys;
	}
}
