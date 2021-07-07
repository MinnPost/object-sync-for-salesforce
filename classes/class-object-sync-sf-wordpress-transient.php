<?php
/**
 * Store all theme/plugin transients as an array in one WordPress transient
 *
 * @class   Object_Sync_Sf_WordPress_Transient
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_WordPress_Transient class.
 */
class Object_Sync_Sf_WordPress_Transient {

	/**
	 * Name of the field that lists the cache keys
	 *
	 * @var string
	 */
	public $name;

	/**
	 * Prefix for plugin cache keys
	 *
	 * @var string
	 */
	public $cache_prefix;

	/**
	 * Constructor which sets cache options and the name of the field that lists this plugin's cache keys.
	 *
	 * @param string $name The name of the field that lists all cache keys.
	 */
	public function __construct( $name ) {
		$this->name         = $name;
		$this->cache_prefix = esc_sql( 'sfwp_' );
	}

	/**
	 * Get the transient that lists all the other transients for this plugin.
	 *
	 * @return mixed value of transient. False of empty, otherwise array.
	 */
	public function all_keys() {
		return get_transient( $this->name );
	}

	/**
	 * Set individual transient, and add its key to the list of this plugin's transients.
	 *
	 * @param string $cachekey the key for this cache item.
	 * @param mixed  $value the value of the cache item.
	 * @param int    $cache_expiration How long the plugin key cache, and this individual item cache, should last before expiring.
	 * @return mixed value of transient. False of empty, otherwise array.
	 */
	public function set( $cachekey, $value, $cache_expiration = 0 ) {

		$prefix   = $this->cache_prefix;
		$cachekey = $prefix . $cachekey;

		$keys   = $this->all_keys();
		$keys[] = $cachekey;
		set_transient( $this->name, $keys, $cache_expiration );

		return set_transient( $cachekey, $value, $cache_expiration );
	}

	/**
	 * Get the individual cache value
	 *
	 * @param string $cachekey the key for this cache item.
	 * @return mixed value of transient. False of empty, otherwise array.
	 */
	public function get( $cachekey ) {
		$prefix   = $this->cache_prefix;
		$cachekey = $prefix . $cachekey;
		return get_transient( $cachekey );
	}

	/**
	 * Delete the individual cache value
	 *
	 * @param string $cachekey the key for this cache item.
	 * @return bool True if successful, false otherwise.
	 */
	public function delete( $cachekey ) {
		$prefix   = $this->cache_prefix;
		$cachekey = $prefix . $cachekey;
		return delete_transient( $cachekey );
	}

	/**
	 * Delete the entire cache for this plugin
	 *
	 * @return array $result has the success result and how many entries were cleared.
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
