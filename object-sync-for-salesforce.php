<?php
/*
Plugin Name: Object Sync for Salesforce
Description: Object Sync for Salesforce maps and syncs data between Salesforce objects and WordPress objects.
Version: 1.3.6
Author: MinnPost
Author URI: https://code.minnpost.com
License: GPL2+
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: object-sync-for-salesforce
*/

/**
 * Start up the Object Sync for Salesforce plugin; initialize parameters and classes
 */
class Object_Sync_Salesforce {

	/**
	* @var object
	* Global object of `$wpdb`, the WordPress database
	*/
	private $wpdb;

	/**
	* @var array
	* Login credentials for the Salesforce API; comes from wp-config or from the plugin settings
	*/
	private $login_credentials;

	/**
	* @var string
	* The plugin's slug so we can include it when necessary
	*/
	private $slug;

	/**
	* @var array
	* Array of what classes in the plugin can be scheduled to occur with `wp_cron` events
	*/
	public $schedulable_classes;

	/**
	* @var string
	* Current version of the plugin
	*/
	private $version;

	/**
	* @var object
	*/
	private $activated;

	/**
	* @var object
	* Load and initialize the Object_Sync_Sf_Logging class
	*/
	private $logging;

	/**
	* @var object
	* Load and initialize the Object_Sync_Sf_Mapping class
	*/
	private $mappings;

	/**
	* @var object
	* Load and initialize the Object_Sync_Sf_WordPress class
	*/
	private $wordpress;

	/**
	* @var object
	* Load and initialize the Object_Sync_Sf_Salesforce class.
	* This contains the Salesforce API methods
	*/
	public $salesforce;

	/**
	* @var object
	* Load and initialize the Object_Sync_Sf_Salesforce_Push class
	*/
	private $push;

	/**
	* @var object
	* Load and initialize the Object_Sync_Sf_Salesforce_Pull class
	*/
	private $pull;

	/**
	 * @var object
	 * Static property to hold an instance of the class; this seems to make it reusable
	 *
	 */
	static $instance = null;

	/**
	* Load the static $instance property that holds the instance of the class.
	* This instance makes the class reusable by other plugins
	*
	* @return object
	*   The sfapi object if it is authenticated (empty, otherwise)
	*
	*/
	static public function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new Object_Sync_Salesforce();
		}
		return self::$instance;
	}

	/**
	 * Constructor that sets up the parameters to pass to all the other classes, and the methods that call the other classes
	 *
	 * @return void
	 */
	protected function __construct() {

		global $wpdb;

		$this->wpdb              = $wpdb;
		$this->version           = '1.3.6';
		$this->login_credentials = $this->get_login_credentials();
		$this->slug              = 'object-sync-for-salesforce';

		$this->schedulable_classes = array(
			'salesforce_push' => array(
				'label'    => 'Push to Salesforce',
				'class'    => 'Object_Sync_Sf_Salesforce_Push',
				'callback' => 'salesforce_push_sync_rest',
			),
			'salesforce_pull' => array(
				'label'       => 'Pull from Salesforce',
				'class'       => 'Object_Sync_Sf_Salesforce_Pull',
				'initializer' => 'salesforce_pull',
				'callback'    => 'salesforce_pull_process_records',
			),
			'salesforce'      => array(
				'label' => 'Salesforce Authorization',
				'class' => 'Object_Sync_Sf_Salesforce',
			),
		);

		// users can modify the list of schedulable classes
		$this->schedulable_classes = apply_filters( 'object_sync_for_salesforce_modify_schedulable_classes', $this->schedulable_classes );

		/*
		 * example to modify the array of classes by adding one and removing one
		 * add_filter( 'object_sync_for_salesforce_modify_schedulable_classes', 'modify_schedulable_classes', 10, 1 );
		 * function modify_schedulable_classes( $schedulable_classes ) {
		 * 	$schedulable_classes = array(
		 * 		'salesforce_push' => array(
		 * 		    'label' => 'Push to Salesforce',
		 * 		    'class' => 'Object_Sync_Sf_Salesforce_Push',
		 * 		    'callback' => 'salesforce_push_sync_rest',
		 * 		),
		 * 		'wordpress' => array( // WPCS: spelling ok.
		 * 		    'label' => 'WordPress',
		 * 		    'class' => 'Object_Sync_Sf_WordPress',
		 * 		),
		 * 		'salesforce' => array(
		 * 		    'label' => 'Salesforce Authorization',
		 * 		    'class' => 'Object_Sync_Sf_Salesforce',
		 * 		),
		 * 	);
		 * 	return $schedulable_classes;
		 * }
		*/

		$this->activated = $this->activate( $this->wpdb, $this->version, $this->slug );
		$this->deactivate( $this->wpdb, $this->version, $this->slug, $this->schedulable_classes );

		$this->logging = $this->logging( $this->wpdb, $this->version );

		$this->mappings = $this->mappings( $this->wpdb, $this->version, $this->slug, $this->logging );

		$this->wordpress  = $this->wordpress( $this->wpdb, $this->version, $this->slug, $this->mappings, $this->logging );
		$this->salesforce = $this->salesforce_get_api();

		$this->push = $this->push( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->wordpress, $this->salesforce, $this->mappings, $this->logging, $this->schedulable_classes );

		$this->pull = $this->pull( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->wordpress, $this->salesforce, $this->mappings, $this->logging, $this->schedulable_classes );

		$this->load_admin( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->wordpress, $this->salesforce, $this->mappings, $this->push, $this->pull, $this->logging, $this->schedulable_classes );

	}

	/**
	 * Log events
	 *
	 * @param object $wpdb
	 * @param string $version
	 * @param string $slug
	 *
	 * @return object
	 *   Instance of Object_Sync_Sf_Logging
	 */
	private function logging( $wpdb, $version ) {
		if ( ! class_exists( 'WP_Logging' ) && file_exists( plugin_dir_path( __FILE__ ) . 'vendor/autoload.php' ) ) {
			require_once plugin_dir_path( __FILE__ ) . 'vendor/autoload.php';
			require_once plugin_dir_path( __FILE__ ) . 'classes/logging.php';
		}
		$logging = new Object_Sync_Sf_Logging( $wpdb, $version );
		return $logging;
	}

	/**
	 * Map the Salesforce and WordPress objects and fields to each other
	 *
	 * @param object $wpdb
	 * @param string $version
	 * @param string $slug
	 * @param object $logging
	 *
	 * @return object
	 *   Instance of Object_Sync_Sf_Mapping
	 */
	private function mappings( $wpdb, $version, $slug, $logging ) {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/salesforce_mapping.php' );
		$mappings = new Object_Sync_Sf_Mapping( $wpdb, $version, $slug, $logging );
		return $mappings;
	}

	/**
	* Private helper to load methods for manipulating core WordPress data across the plugin
	*
	* @param object $wpdb
	* @param string $version
	* @param string $slug
	* @param object $mappings
	* @param object $logging
	*
	* @return object
	*   Instance of Object_Sync_Sf_WordPress
	*/
	private function wordpress( $wpdb, $version, $slug, $mappings, $logging ) {
		require_once plugin_dir_path( __FILE__ ) . 'classes/wordpress.php';
		$wordpress = new Object_Sync_Sf_WordPress( $wpdb, $version, $slug, $mappings, $logging );
		return $wordpress;
	}

	/**
	* Public helper to load the Salesforce API and see if it is authenticated.
	* This is public so other plugins can access the same SF API instance
	*
	* @return array
	*   Whether Salesforce is authenticated (boolean)
	*   The sfapi object if it is authenticated (empty, otherwise)
	*/
	public function salesforce_get_api() {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/salesforce.php' );
		require_once( plugin_dir_path( __FILE__ ) . 'classes/salesforce_query.php' ); // this can be used to generate soql queries, but we don't often need it so it gets initialized whenever it's needed
		$consumer_key        = $this->login_credentials['consumer_key'];
		$consumer_secret     = $this->login_credentials['consumer_secret'];
		$login_url           = $this->login_credentials['login_url'];
		$callback_url        = $this->login_credentials['callback_url'];
		$authorize_path      = $this->login_credentials['authorize_path'];
		$token_path          = $this->login_credentials['token_path'];
		$rest_api_version    = $this->login_credentials['rest_api_version'];
		$slug                = $this->slug;
		$wordpress           = $this->wordpress;
		$logging             = $this->logging;
		$schedulable_classes = $this->schedulable_classes;
		$is_authorized       = false;
		$sfapi               = '';
		if ( $consumer_key && $consumer_secret ) {
			$sfapi = new Object_Sync_Sf_Salesforce( $consumer_key, $consumer_secret, $login_url, $callback_url, $authorize_path, $token_path, $rest_api_version, $wordpress, $slug, $logging, $schedulable_classes );
			if ( $sfapi->is_authorized() === true ) {
				$is_authorized = true;
			}
		}
		return array(
			'is_authorized' => $is_authorized,
			'sfapi'         => $sfapi,
		);
	}

	/**
	 * What to do upon activation of the plugin
	 *
	 * @param object $wpdb
	 * @param string $version
	 * @param string $slug
	 *
	 * @return object
	 *   Instance of Object_Sync_Sf_Activate
	 */
	private function activate( $wpdb, $version, $slug ) {
		require_once plugin_dir_path( __FILE__ ) . 'classes/activate.php';
		$activate = new Object_Sync_Sf_Activate( $wpdb, $version, $slug );
		return $activate;
	}

	/**
	 * What to do upon deactivation of the plugin
	 *
	 * @param object $wpdb
	 * @param string $version
	 * @param string $slug
	 * @param array $schedulable_classes
	 *
	 * @return object
	 *   Instance of Object_Sync_Sf_Deactivate
	 */
	private function deactivate( $wpdb, $version, $slug, $schedulable_classes ) {
		require_once plugin_dir_path( __FILE__ ) . 'classes/deactivate.php';
		$deactivate = new Object_Sync_Sf_Deactivate( $wpdb, $version, $slug, $schedulable_classes );
	}


	/**
	 * Methods to push data from WordPress to Salesforce
	 *
	 * @param object $wpdb
	 * @param string $version
	 * @param array $login_credentials
	 * @param string $slug
	 * @param object $wordpress
	 * @param object $salesforce
	 * @param object $mappings
	 * @param object $logging
	 * @param array $schedulable_classes
	 *
	 * @return object
	 *   Instance of Object_Sync_Sf_Salesforce_Push
	 */
	private function push( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $logging, $schedulable_classes ) {
		require_once plugin_dir_path( __FILE__ ) . 'classes/salesforce_push.php';
		$push = new Object_Sync_Sf_Salesforce_Push( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $logging, $schedulable_classes );
		return $push;
	}

	/**
	 * Methods to pull data from Salesforce to WordPress
	 *
	 * @param object $wpdb
	 * @param string $version
	 * @param array $login_credentials
	 * @param string $slug
	 * @param object $wordpress
	 * @param object $salesforce
	 * @param object $mappings
	 * @param object $logging
	 * @param array $schedulable_classes
	 * @return object
	 *   Instance of Object_Sync_Sf_Salesforce_Pull
	 */
	private function pull( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $logging, $schedulable_classes ) {
		require_once plugin_dir_path( __FILE__ ) . 'classes/salesforce_pull.php';
		$pull = new Object_Sync_Sf_Salesforce_Pull( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $logging, $schedulable_classes );
		return $pull;
	}

	/**
	* Load the admin class.
	* This also creates admin menu, unless the plugin that calls this library has indicated that it has its own menu
	*
	* @param object $wpdb
	* @param string $version
	* @param array $login_credentials
	* @param string $slug
	* @param object $wordpress
	* @param object $salesforce
	* @param object $mappings
	* @param object $push
	* @param object $pull
	* @param object $logging
	* @param array $schedulable_classes
	* @return object $admin
	*   Instance of Object_Sync_Sf_Admin
	*
	*/
	private function load_admin( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $push, $pull, $logging, $schedulable_classes ) {
		require_once( plugin_dir_path( __FILE__ ) . 'classes/admin.php' );
		$admin = new Object_Sync_Sf_Admin( $wpdb, $version, $login_credentials, $slug, $wordpress, $salesforce, $mappings, $push, $pull, $logging, $schedulable_classes );
		add_action( 'admin_menu', array( $admin, 'create_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_scripts_and_styles' ) );
		add_action( 'plugins_loaded', array( $this, 'textdomain' ) );
		add_filter( 'plugin_action_links', array( $this, 'plugin_action_links' ), 10, 5 );
		return $admin;
	}

	/**
	* Display a Settings link on the main Plugins page
	*
	* @param array $links
	* @param string $file
	* @return array $links
	*   These are the links that go with this plugin's entry
	*/
	public function plugin_action_links( $links, $file ) {
		if ( plugin_basename( __FILE__ ) === $file ) {
			$settings = '<a href="' . get_admin_url() . 'options-general.php?page=object-sync-salesforce-admin">' . __( 'Settings', 'object-sync-for-salesforce' ) . '</a>';
			// make the 'Settings' link appear first
			array_unshift( $links, $settings );
		}
		return $links;
	}


	/**
	* Admin styles. Load the CSS and JavaScript for the plugin's settings
	*
	* @return void
	*/
	public function admin_scripts_and_styles() {
		wp_enqueue_script( $this->slug . '-admin', plugins_url( 'assets/js/object-sync-for-salesforce-admin.min.js', __FILE__ ), array( 'jquery' ), filemtime( plugin_dir_path( __FILE__ ) . 'assets/js/object-sync-for-salesforce-admin.js' ), true );
		wp_enqueue_style( $this->slug . '-admin', plugins_url( 'assets/css/object-sync-for-salesforce-admin.min.css', __FILE__ ), array(), filemtime( plugin_dir_path( __FILE__ ) . 'assets/css/object-sync-for-salesforce-admin.css' ), 'all' );
	}

	/**
	 * Load textdomain
	 *
	 * @return void
	 */
	public function textdomain() {
		load_plugin_textdomain( 'object-sync-for-salesforce', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
	}

	/**
	* Get the pre-login Salesforce credentials.
	* These depend on the plugin's settings or constants defined in wp-config.php.
	*
	* @return array $login_credentials
	*   Includes all settings necessary to log into the Salesforce API.
	*   Replaces settings options with wp-config.php values if they exist.
	*/
	private function get_login_credentials() {

		$consumer_key       = defined( 'OBJECT_SYNC_SF_SALESFORCE_CONSUMER_KEY' ) ? OBJECT_SYNC_SF_SALESFORCE_CONSUMER_KEY : get_option( 'object_sync_for_salesforce_consumer_key', '' );
		$consumer_secret    = defined( 'OBJECT_SYNC_SF_SALESFORCE_CONSUMER_SECRET' ) ? OBJECT_SYNC_SF_SALESFORCE_CONSUMER_SECRET : get_option( 'object_sync_for_salesforce_consumer_secret', '' );
		$callback_url       = defined( 'OBJECT_SYNC_SF_SALESFORCE_CALLBACK_URL' ) ? OBJECT_SYNC_SF_SALESFORCE_CALLBACK_URL : get_option( 'object_sync_for_salesforce_callback_url', '' );
		$login_base_url     = defined( 'OBJECT_SYNC_SF_SALESFORCE_LOGIN_BASE_URL' ) ? OBJECT_SYNC_SF_SALESFORCE_LOGIN_BASE_URL : get_option( 'object_sync_for_salesforce_login_base_url', '' );
		$authorize_url_path = defined( 'OBJECT_SYNC_SF_SALESFORCE_AUTHORIZE_URL_PATH' ) ? OBJECT_SYNC_SF_SALESFORCE_AUTHORIZE_URL_PATH : get_option( 'object_sync_for_salesforce_authorize_url_path', '' );
		$token_url_path     = defined( 'OBJECT_SYNC_SF_SALESFORCE_TOKEN_URL_PATH' ) ? OBJECT_SYNC_SF_SALESFORCE_TOKEN_URL_PATH : get_option( 'object_sync_for_salesforce_token_url_path', '' );
		$api_version        = defined( 'OBJECT_SYNC_SF_SALESFORCE_API_VERSION' ) ? OBJECT_SYNC_SF_SALESFORCE_API_VERSION : get_option( 'object_sync_for_salesforce_api_version', '' );

		$login_credentials = array(
			'consumer_key'     => $consumer_key,
			'consumer_secret'  => $consumer_secret,
			'callback_url'     => $callback_url,
			'login_url'        => $login_base_url,
			'authorize_path'   => $authorize_url_path,
			'token_path'       => $token_url_path,
			'rest_api_version' => $api_version,
		);

		return $login_credentials;

	}

} // end class
// Instantiate our class
$object_sync_salesforce = Object_Sync_Salesforce::get_instance();
