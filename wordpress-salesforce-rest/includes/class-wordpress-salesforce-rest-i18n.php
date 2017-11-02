<?php

/**
 * Define the internationalization functionality
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @link       http://code.minnpost.com
 * @since      1.0.0
 *
 * @package    Wordpress_Salesforce_Rest
 * @subpackage Wordpress_Salesforce_Rest/includes
 */

/**
 * Define the internationalization functionality.
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @since      1.0.0
 * @package    Wordpress_Salesforce_Rest
 * @subpackage Wordpress_Salesforce_Rest/includes
 * @author     Jonathan Stegall <jstegall@minnpost.com>
 */
class Wordpress_Salesforce_Rest_i18n {


	/**
	 * Load the plugin text domain for translation.
	 *
	 * @since    1.0.0
	 */
	public function load_plugin_textdomain() {

		load_plugin_textdomain(
			'wordpress-salesforce-rest',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages/'
		);

	}



}
