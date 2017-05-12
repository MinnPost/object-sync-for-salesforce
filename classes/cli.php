<?php
/**
 * test Cli Name.
 *
 * @since   0.0.0
 * @package Test
 */

/**
 * test Cli Name.
 *
 * @since 0.0.0
 */
class Salesforce_Cli {
	/**
	 * Parent plugin class
	 *
	 * @var   Test
	 *
	 * @since 0.0.0
	 */
	protected $wpdb;
	protected $version;
	protected $text_domain;

	/**
	 * Constructor.
	 *
	 * @since  0.0.0
	 *
	 * @param  Test $plugin Main plugin object.
	 */
	public function __construct( $wpdb, $version, $text_domain ) {

		// If we have WP CLI, add our commands.
		if ( $this->verify_wp_cli() ) {
			$this->add_commands();
		}
	}

	/**
	 * Check for WP CLI running.
	 *
	 * @since  0.0.0
	 *
	 * @return boolean True if WP CLI currently running.
	 */
	public function verify_wp_cli() {
		return ( defined( 'WP_CLI' ) && WP_CLI );
	}

	/**
	 * Add our commands.
	 *
	 * @since  0.0.0
	 */
	public function add_commands() {
		WP_CLI::add_command( 'test', array( $this, 'test_command' ) );
	}

	/**
	 * Create a method stub for our first CLI command.
	 *
	 * @since 0.0.0
	 */
	public function test_command() {
		WP_CLI::success( 'yay' );
	}
}
