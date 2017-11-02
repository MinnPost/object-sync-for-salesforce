<?php

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              http://code.minnpost.com
 * @since             1.0.0
 * @package           Wordpress_Salesforce_Rest
 *
 * @wordpress-plugin
 * Plugin Name:       WordPress Salesforce Rest API
 * Plugin URI:        https://github.com/MinnPost/wordpress-salesforce-rest
 * Description:       This is a short description of what the plugin does. It's displayed in the WordPress admin area.
 * Version:           1.0.0
 * Author:            Jonathan Stegall
 * Author URI:        http://code.minnpost.com
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       wordpress-salesforce-rest
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-wordpress-salesforce-rest-activator.php
 */
function activate_wordpress_salesforce_rest() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-wordpress-salesforce-rest-activator.php';
	Wordpress_Salesforce_Rest_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-wordpress-salesforce-rest-deactivator.php
 */
function deactivate_wordpress_salesforce_rest() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-wordpress-salesforce-rest-deactivator.php';
	Wordpress_Salesforce_Rest_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_wordpress_salesforce_rest' );
register_deactivation_hook( __FILE__, 'deactivate_wordpress_salesforce_rest' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-wordpress-salesforce-rest.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_wordpress_salesforce_rest() {

	$plugin = new Wordpress_Salesforce_Rest();
	$plugin->run();

}
run_wordpress_salesforce_rest();
