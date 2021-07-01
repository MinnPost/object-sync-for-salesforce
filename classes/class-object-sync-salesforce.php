<?php
/**
 * The main plugin class
 *
 * @class   Object_Sync_Salesforce
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Salesforce class.
 */
class Object_Sync_Salesforce {

	/**
	 * Current version of the plugin
	 *
	 * @var string
	 */
	public $version;

	/**
	 * The main plugin file
	 *
	 * @var string
	 */
	public $file;

	/**
	 * Global object of `$wpdb`, the WordPress database
	 *
	 * @var object
	 */
	public $wpdb;

	/**
	 * The plugin's slug so we can include it when necessary
	 *
	 * @var string
	 */
	public $slug;

	/**
	 * The plugin's prefix when saving options to the database
	 *
	 * @var string
	 */
	public $option_prefix;

	/**
	 * Login credentials for the Salesforce API; comes from wp-config or from the plugin settings
	 *
	 * @var array
	 */
	public $login_credentials;

	/**
	 * Array of what classes in the plugin can be scheduled to occur with `wp_cron` events
	 *
	 * @var array
	 */
	public $schedulable_classes;

	/**
	 * Array of what classes in the plugin can be scheduled to occur with `wp_cron` events
	 *
	 * @var array
	 */
	public $queue;

	/**
	 * Tells us if composer has been autoloaded
	 *
	 * @var bool
	 */
	private $composer_loaded;

	/**
	 * Object_Sync_Sf_Activate class
	 *
	 * @var object
	 */
	private $activated;

	/**
	 * Object_Sync_Sf_Logging class
	 *
	 * @var object
	 */
	public $logging;

	/**
	 * Object_Sync_Sf_Mapping class
	 *
	 * @var object
	 */
	public $mappings;

	/**
	 * Object_Sync_Sf_WordPress class
	 *
	 * @var object
	 */
	public $wordpress;

	/**
	 * Object_Sync_Sf_Salesforce class
	 * This contains Salesforce API methods
	 *
	 * @var array
	 */
	public $salesforce;

	/**
	 * Object_Sync_Sf_Salesforce_Push class
	 *
	 * @var object
	 */
	public $push;

	/**
	 * Object_Sync_Sf_Salesforce_Pull class
	 *
	 * @var object
	 */
	public $pull;

	/**
	 * Object_Sync_Sf_Rest class
	 *
	 * @var object
	 */
	private $rest;

	/**
	 * Legacy property that holds an instance of the plugin class.
	 *
	 * @var object
	 * @deprecated since 2.0.0
	 */
	public static $instance;

	/**
	 * This is our constructor
	 *
	 * @param string $version is the plugin version.
	 * @param string $file is the main plugin file.
	 * @return void
	 */
	public function __construct( $version, $file ) {

		global $wpdb;

		$this->version       = $version;
		$this->file          = $file;
		$this->wpdb          = $wpdb;
		$this->slug          = 'object-sync-for-salesforce';
		$this->option_prefix = 'object_sync_for_salesforce_';

		$this->schedulable_classes = array(
			'salesforce_push' => array(
				'label'    => 'Push to Salesforce',
				'class'    => 'Object_Sync_Sf_Salesforce_Push',
				'callback' => $this->option_prefix . 'push_record',
			),
			'salesforce_pull' => array(
				'label'       => 'Pull from Salesforce',
				'class'       => 'Object_Sync_Sf_Salesforce_Pull',
				'initializer' => $this->option_prefix . 'pull_check_records',
				'callback'    => $this->option_prefix . 'pull_process_records',
			),
		);

		// users can modify the list of schedulable classes.
		$this->schedulable_classes = apply_filters( $this->option_prefix . 'modify_schedulable_classes', $this->schedulable_classes );

		/* // phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		 * example to modify the array of classes by adding one and removing one
		 * add_filter( 'object_sync_for_salesforce_modify_schedulable_classes', 'modify_schedulable_classes', 10, 1 );
		 * function modify_schedulable_classes( $schedulable_classes ) {
		 * 	$schedulable_classes = array(
		 * 		'salesforce_push' => array(
		 * 		    'label' => 'Push to Salesforce',
		 * 		    'class' => 'Object_Sync_Sf_Salesforce_Push',
		 * 		    'callback' => 'salesforce_push_sync_rest',
		 * 		),
		 * 		'wordpress' => array( // phpcs:ignore WordPress.WP.CapitalPDangit.Misspelled
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
	}

	/**
	 * Load the static $instance property that holds the instance of the class.
	 * This is preserved for legacy usage, as the same thing exists in the `object_sync_for_salesforce` function.
	 *
	 * @return object $plugin
	 * @deprecated since 2.0.0
	 */
	public static function get_instance() {

		if ( function_exists( 'object_sync_for_salesforce' ) ) {
			return object_sync_for_salesforce();
		}

		static $plugin;

		if ( is_null( $plugin ) ) {
			$plugin = new Object_Sync_Salesforce( OBJECT_SYNC_SALESFORCE_VERSION, OBJECT_SYNC_SALESFORCE_FILE );
		}

		return $plugin;
	}

	/**
	 * Initialize the plugin and start the action hooks.
	 * We run this separately because activate can't run without the right priority.
	 */
	public function init() {
		$this->activated = $this->activate( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->schedulable_classes, $this->queue );
		$this->add_actions();
	}

	/**
	 * What to do upon activation of the plugin
	 *
	 * @return object $activate
	 */
	private function activate() {
		$activate = new Object_Sync_Sf_Activate( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->schedulable_classes, $this->queue );
		return $activate;
	}

	/**
	 * Run non-activation actions.
	 * We do this on -10 because ActionScheduler has to have access to plugins_loaded with priority of zero.
	 */
	private function add_actions() {
		// public actions.
		add_action( 'plugins_loaded', array( $this, 'run' ), -10 );
		add_action( 'plugins_loaded', array( $this, 'textdomain' ) );
	}

	/**
	 * Run the plugin, independent of activation methods.
	 */
	public function run() {

		$this->composer_loaded = $this->composer_loaded();

		$this->login_credentials = $this->get_login_credentials();

		$this->deactivate( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->schedulable_classes, $this->queue );

		$this->logging = $this->logging( $this->wpdb, $this->version, $this->slug, $this->option_prefix );

		$this->queue = $this->queue( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->schedulable_classes );

		$this->mappings = $this->mappings( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->logging );

		$this->wordpress  = $this->wordpress( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->mappings, $this->logging );
		$this->salesforce = $this->salesforce_get_api();

		$this->push = $this->push( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->option_prefix, $this->wordpress, $this->salesforce, $this->mappings, $this->logging, $this->schedulable_classes, $this->queue );

		$this->pull = $this->pull( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->option_prefix, $this->wordpress, $this->salesforce, $this->mappings, $this->logging, $this->schedulable_classes, $this->queue );

		$this->rest = $this->rest( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->wordpress, $this->salesforce, $this->mappings, $this->push, $this->pull );

		new Object_Sync_Sf_Admin();
	}

	/**
	 * Autoload things from Composer.
	 *
	 * @return bool true
	 */
	private function composer_loaded() {
		require_once plugin_dir_path( $this->file ) . 'vendor/autoload.php';
		return true;
	}

	/**
	 * Get the pre-login Salesforce credentials.
	 * These depend on the plugin's settings or constants defined in wp-config.php.
	 *
	 * @return array $login_credentials
	 */
	private function get_login_credentials() {

		$consumer_key       = defined( 'OBJECT_SYNC_SF_SALESFORCE_CONSUMER_KEY' ) ? OBJECT_SYNC_SF_SALESFORCE_CONSUMER_KEY : get_option( $this->option_prefix . 'consumer_key', '' );
		$consumer_secret    = defined( 'OBJECT_SYNC_SF_SALESFORCE_CONSUMER_SECRET' ) ? OBJECT_SYNC_SF_SALESFORCE_CONSUMER_SECRET : get_option( $this->option_prefix . 'consumer_secret', '' );
		$callback_url       = defined( 'OBJECT_SYNC_SF_SALESFORCE_CALLBACK_URL' ) ? OBJECT_SYNC_SF_SALESFORCE_CALLBACK_URL : get_option( $this->option_prefix . 'callback_url', '' );
		$login_base_url     = defined( 'OBJECT_SYNC_SF_SALESFORCE_LOGIN_BASE_URL' ) ? OBJECT_SYNC_SF_SALESFORCE_LOGIN_BASE_URL : get_option( $this->option_prefix . 'login_base_url', '' );
		$authorize_url_path = defined( 'OBJECT_SYNC_SF_SALESFORCE_AUTHORIZE_URL_PATH' ) ? OBJECT_SYNC_SF_SALESFORCE_AUTHORIZE_URL_PATH : get_option( $this->option_prefix . 'authorize_url_path', '' );
		$token_url_path     = defined( 'OBJECT_SYNC_SF_SALESFORCE_TOKEN_URL_PATH' ) ? OBJECT_SYNC_SF_SALESFORCE_TOKEN_URL_PATH : get_option( $this->option_prefix . 'token_url_path', '' );
		$api_version        = defined( 'OBJECT_SYNC_SF_SALESFORCE_API_VERSION' ) ? OBJECT_SYNC_SF_SALESFORCE_API_VERSION : get_option( $this->option_prefix . 'api_version', '' );

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

	/**
	 * What to do upon deactivation of the plugin
	 */
	private function deactivate() {
		$deactivate = new Object_Sync_Sf_Deactivate( $this->wpdb, $this->version, $this->slug, $this->schedulable_classes, $this->option_prefix, $this->queue );
	}

	/**
	 * Log plugin events
	 *
	 * @return object $logging
	 */
	private function logging() {
		$logging = new Object_Sync_Sf_Logging( $this->wpdb, $this->version, $this->slug, $this->option_prefix );
		return $logging;
	}

	/**
	 * Get queue instance
	 *
	 * @return object $queue
	 */
	public function queue() {
		$queue = new Object_Sync_Sf_Queue( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->schedulable_classes );
		return $queue;
	}

	/**
	 * Map the Salesforce and WordPress objects and fields to each other
	 *
	 * @return object $mappings
	 */
	public function mappings() {
		$mappings = new Object_Sync_Sf_Mapping( $this->wpdb, $this->version, $this->slug, $this->logging, $this->option_prefix );
		return $mappings;
	}

	/**
	 * Load methods for manipulating core WordPress data across the plugin
	 *
	 * @return object $wordpress
	 */
	public function wordpress() {
		$wordpress = new Object_Sync_Sf_WordPress( $this->wpdb, $this->version, $this->slug, $this->mappings, $this->logging, $this->option_prefix );
		return $wordpress;
	}

	/**
	 * Public helper to load the Salesforce API and see if it is authenticated.
	 * This is public so other plugins can access the same SF API instance we use.
	 *
	 * @return array
	 */
	public function salesforce_get_api() {

		$soap_available = $this->is_soap_available();
		$soap_loaded    = $this->is_soap_loaded();

		$consumer_key        = $this->login_credentials['consumer_key'];
		$consumer_secret     = $this->login_credentials['consumer_secret'];
		$login_url           = $this->login_credentials['login_url'];
		$callback_url        = $this->login_credentials['callback_url'];
		$authorize_path      = $this->login_credentials['authorize_path'];
		$token_path          = $this->login_credentials['token_path'];
		$rest_api_version    = $this->login_credentials['rest_api_version'];
		$slug                = $this->slug;
		$option_prefix       = $this->option_prefix;
		$wordpress           = $this->wordpress;
		$logging             = $this->logging;
		$schedulable_classes = $this->schedulable_classes;
		$is_authorized       = false;
		$sfapi               = '';
		if ( $consumer_key && $consumer_secret ) {
			$sfapi = new Object_Sync_Sf_Salesforce( $consumer_key, $consumer_secret, $login_url, $callback_url, $authorize_path, $token_path, $rest_api_version, $wordpress, $slug, $logging, $schedulable_classes, $option_prefix );
			if ( true === $sfapi->is_authorized() ) {
				$is_authorized = true;
			}
		}

		return array(
			'is_authorized'  => $is_authorized,
			'sfapi'          => $sfapi,
			'soap_available' => $soap_available,
			'soap_loaded'    => $soap_loaded,
		);
	}

	/**
	 * Methods to push data from WordPress to Salesforce
	 *
	 * @return object $push
	 */
	public function push() {
		$push = new Object_Sync_Sf_Salesforce_Push( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->wordpress, $this->salesforce, $this->mappings, $this->logging, $this->schedulable_classes, $this->queue, $this->option_prefix );
		return $push;
	}

	/**
	 * Methods to pull data from Salesforce to WordPress
	 *
	 * @return object $pull
	 */
	public function pull() {
		$pull = new Object_Sync_Sf_Salesforce_Pull( $this->wpdb, $this->version, $this->login_credentials, $this->slug, $this->wordpress, $this->salesforce, $this->mappings, $this->logging, $this->schedulable_classes, $this->queue, $this->option_prefix );
		return $pull;
	}

	/**
	 * REST API methods
	 *
	 * @return object $rest
	 */
	private function rest() {
		$rest = new Object_Sync_Sf_Rest( $this->wpdb, $this->version, $this->slug, $this->option_prefix, $this->wordpress, $this->salesforce, $this->mappings, $this->push, $this->pull );
		return $rest;
	}

	/**
	 * Load textdomain
	 */
	public function textdomain() {
		load_plugin_textdomain( 'object-sync-for-salesforce', false, dirname( plugin_basename( $this->file ) ) . '/languages/' );
	}

	/**
	 * Check the server to see if Soap is available
	 *
	 * @return bool $is_soap_available
	 */
	private function is_soap_available() {
		$is_soap_available = false;
		if ( extension_loaded( 'soap' ) && class_exists( 'SoapClient' ) ) {
			$is_soap_available = true;
		}
		return $is_soap_available;
	}

	/**
	 * Check the plugin to see if the Soap option has been enabled and the class has been loaded
	 *
	 * @return bool $is_soap_loaded
	 */
	private function is_soap_loaded() {
		$is_soap_loaded = false;
		if ( false === $this->is_soap_available() ) {
			return $is_soap_loaded;
		}
		$use_soap = filter_var( get_option( 'object_sync_for_salesforce_use_soap', false ), FILTER_VALIDATE_BOOLEAN );
		if ( false === $use_soap ) {
			return $is_soap_loaded;
		}
		if ( class_exists( 'Object_Sync_Sf_Salesforce_Soap_Partner' ) ) {
			$is_soap_loaded = true;
		}
		return $is_soap_loaded;
	}

} // end class
