<?php
/**
 * Handles getting and setting the pull options.
 *
 * @class   Object_Sync_Sf_Pull_Options
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Pull_Options class.
 */
class Object_Sync_Sf_Pull_Options {

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
	 * Direction of the operation
	 *
	 * @var string
	 */
	public $direction;

	/**
	 * Constructor for option records class
	 */
	public function __construct() {
		$this->version       = object_sync_for_salesforce()->version;
		$this->option_prefix = object_sync_for_salesforce()->option_prefix;

		$this->direction = 'pull';
	}

	/**
	 * Generate an option key
	 *
	 * @param array $params the pieces to put together.
	 * @param bool  $legacy whether this is a legacy key.
	 * @return string $key the full option key.
	 */
	private function generate_option_key( $params, $legacy = false ) {
		array_unshift( $params, substr( $this->option_prefix, 0, -1 ), $this->direction ); // add the prefixes.
		$params = array_filter( $params, fn( $value ) => ! is_null( $value ) && '' !== $value ); // remove null and empty values.
		$key    = implode( '_', $params ); // make the key string.

		// allow developers to filter the key.
		$key = apply_filters( $this->option_prefix . 'pull_option_key', $key, $params );

		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		add_filter( 'object_sync_for_salesforce_pull_option_key', 'change_pull_option_key', 10, 2 );
		function change_pull_query( $key, $params ) {
			$key = 'my_key_name';
			return $key;
		}
		*/

		if ( true === $legacy ) {
			// allow developers to filter the legacy key.
			$key = apply_filters( $this->option_prefix . 'pull_option_legacy_key', $params );
		}

		$key = esc_attr( $key ); // make sure it's escaped.

		return $key;
	}

	/**
	 * Set individual option records for sync operations
	 *
	 * @param string $operation what is the option related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @param mixed  $value the value to be saved in the option.
	 * @param bool   $autoload whether to autoload the option value.
	 * @return bool  $result value of the save operation.
	 */
	public function set( $operation, $object_type = '', $fieldmap_id = '', $value = '', $autoload = true ) {
		// generate the option key parameters.
		$params = array(
			$operation,
			$object_type,
			$fieldmap_id,
		);
		$key    = $this->generate_option_key( $params );
		$value  = isset( $value ) ? $value : '';

		/*
		 * examples
		 * object_sync_for_salesforce_pull_last_sync_Contact_1
		 * object_sync_for_salesforce_currently_pulling_query_Contact_1
		 * object_sync_for_salesforce_pull_merge_last_Contact_1
		 * object_sync_for_salesforce_pull_delete_last_Contact_1
		 */

		$result = update_option( $key, $value, $autoload );
		return $result;
	}

	/**
	 * Get individual option records for sync operations
	 *
	 * @param string $operation what is the option related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @param mixed  $default the default value for the option.
	 * @return mixed $value the value of the item. False if it's empty.
	 */
	public function get( $operation, $object_type = '', $fieldmap_id = '', $default = false ) {
		// generate the option key parameters.
		$params = array(
			$operation,
			$object_type,
			$fieldmap_id,
		);
		$key    = $this->generate_option_key( $params );
		error_log( 'key is ' . $key );
		$value  = get_option( $key, $default );

		/*
		 * examples
		 * object_sync_for_salesforce_pull_last_sync_Contact_1
		 * object_sync_for_salesforce_currently_pulling_query_Contact_1
		 * object_sync_for_salesforce_pull_merge_last_Contact_1
		 * object_sync_for_salesforce_pull_delete_last_Contact_1
		 */

		// if the new option does not exist, try to load the old one and save it as a new value.
		if ( $default === $value ) {
			error_log( 'load the legacy value' );
			$legacy_value = $this->legacy_get( $key, $operation, $object_type, $fieldmap_id );
			if ( false !== $legacy_value ) {
				error_log( 'there is a legacy value' );
				$value  = $legacy_value;
				$result = $this->set( $operation, $object_type, $fieldmap_id, $value );
				if ( true === $result ) {
					error_log( 'delete the legacy value' );
					$this->legacy_delete( $operation, $object_type );
				}
			} else {
				error_log( 'there is not a legacy value' );
			}
		}

		return $value;
	}

	/**
	 * Get legacy named individual option records for sync operations
	 *
	 * @param string $operation what is the option related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @return mixed $value the value of the item. False if it's empty.
	 */
	public function legacy_get( $operation, $object_type = '', $fieldmap_id ) {
		// generate the option key parameters.
		$params = array(
			$operation,
			$object_type,
			$fieldmap_id,
		);
		$key    = $this->generate_option_key( $params, true );
		$value  = get_option( $key, false );

		return $value;
	}

	/**
	 * Delete the individual option records for sync operation
	 *
	 * @param string $operation what is the option related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @return bool  $result True if successful, false otherwise.
	 */
	public function delete( $operation, $object_type = '', $fieldmap_id = '' ) {
		// generate the option key parameters.
		$params = array(
			$operation,
			$object_type,
			$fieldmap_id,
		);
		$key    = $this->generate_option_key( $params );

		$result = delete_option( $key );
		return $result;
	}

	/**
	 * Delete the legacy individual option records for sync operation
	 *
	 * @param string $operation what is the option related to? last pull, current pull, merge, delete, etc.
	 * @param string $object_type the Salesforce object type.
	 * @param int    $fieldmap_id the ID of the specific fieldmap that is running.
	 * @return bool  $result True if successful, false otherwise.
	 */
	public function legacy_delete( $operation, $object_type = '', $fieldmap_id = '' ) {
		// generate the option key parameters.
		$params = array(
			$operation,
			$object_type,
			$fieldmap_id,
		);
		$key    = $this->generate_option_key( $params, true );

		$result = delete_option( $key );
		return $result;
	}

	/**
	 * Delete the entire set of current sync data
	 *
	 * @return array $result has the success result and how many values were cleared.
	 */
	public function flush() {
		$keys    = $this->all_keys();
		$success = true;
		$count   = 0;
		if ( ! empty( $keys ) ) {
			foreach ( $keys as $key ) {
				$success = delete_transient( $key );
				$count++;
			}
		}
		$success = delete_transient( $this->name );
		if ( true === $success ) {
			$count++;
		}
		$result            = array();
		$result['success'] = $success;
		$result['count']   = $count;
		return $result;
	}
}
