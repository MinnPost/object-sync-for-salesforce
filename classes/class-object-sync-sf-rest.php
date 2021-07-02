<?php
/**
 * Create WordPress REST API functionality
 *
 * @class   Object_Sync_Sf_Rest
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Rest class.
 */
class Object_Sync_Sf_Rest {

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
	 * Object_Sync_Sf_WordPress_Transient class
	 *
	 * @var object
	 */
	private $sfwp_transients;

	/**
	 * The namespace for the REST endpoints
	 *
	 * @var string
	 */
	private $namespace;

	/**
	 * Constructor for rest class
	 */
	public function __construct() {
		$this->version       = object_sync_for_salesforce()->version;
		$this->file          = object_sync_for_salesforce()->file;
		$this->wpdb          = object_sync_for_salesforce()->wpdb;
		$this->slug          = object_sync_for_salesforce()->slug;
		$this->option_prefix = object_sync_for_salesforce()->option_prefix;

		$this->mappings   = object_sync_for_salesforce()->mappings;
		$this->wordpress  = object_sync_for_salesforce()->wordpress;
		$this->salesforce = object_sync_for_salesforce()->salesforce;
		$this->push       = object_sync_for_salesforce()->push;
		$this->pull       = object_sync_for_salesforce()->pull;

		$this->sfwp_transients = object_sync_for_salesforce()->wordpress->sfwp_transients;

		$this->namespace = $this->slug;

		$this->add_actions();

	}

	/**
	 * Create the action hooks to create the reset methods
	 */
	public function add_actions() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST API routes
	 */
	public function register_routes() {
		$namespace   = $this->namespace;
		$method_list = WP_REST_Server::ALLMETHODS;
		register_rest_route(
			$namespace,
			'/(?P<class>([\w-])+)/',
			array(
				array(
					'methods'             => $method_list,
					'args'                => array(
						'class'                  => array(
							'validate_callback' => array( $this, 'check_class' ),
							'required'          => true,
						),
						'salesforce_object_type' => array(
							'type' => 'string',
						),
						'salesforce_id'          => array(
							'type' => 'string',
						),
						'wordpress_object_type'  => array(
							'type' => 'string',
						),
					),
					'permission_callback' => array( $this, 'can_process' ),
					'callback'            => array( $this, 'process' ),
				),
			)
		);

	}

	/**
	 * Check for a valid class from the parameter
	 *
	 * @param string $class check if the class is a real object.
	 * @return bool
	 */
	public function check_class( $class ) {
		if ( is_object( $this->{ $class } ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Check for a valid ID from the parameter. This one is not in use yet.
	 *
	 * @param string $id check if the ID from the parameter is a real object.
	 * @return bool
	 */
	public function check_id( $id ) {
		if ( is_object( $id ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Check to see if the user has permission to do this
	 *
	 * @param WP_REST_Request $request the request object sent to the API.
	 */
	public function can_process( WP_REST_Request $request ) {
		// unless we specify it here, the method will not be allowed unless the user has configure_salesforce capability.
		$http_method = $request->get_method();
		$class       = $request->get_url_params()['class'];
		switch ( $class ) {
			case 'salesforce':
				if ( ! in_array( $http_method, explode( ',', WP_REST_Server::ALLMETHODS ), true ) ) {
					return new WP_Error( 'rest_forbidden', esc_html__( 'This kind of request is not allowed.', 'object-sync-for-salesforce' ), array( 'status' => 401 ) );
				}
				if ( ! current_user_can( 'configure_salesforce' ) ) {
					return new WP_Error( 'rest_forbidden', esc_html__( 'You do not have permissions to view this data.', 'object-sync-for-salesforce' ), array( 'status' => 401 ) );
				}
				break;
			case 'mappings':
				if ( ! in_array( $http_method, explode( ',', WP_REST_Server::ALLMETHODS ), true ) ) {
					return new WP_Error( 'rest_forbidden', esc_html__( 'This kind of request is not allowed.', 'object-sync-for-salesforce' ), array( 'status' => 401 ) );
				}
				if ( ! current_user_can( 'configure_salesforce' ) ) {
					return new WP_Error( 'rest_forbidden', esc_html__( 'You do not have permissions to view this data.', 'object-sync-for-salesforce' ), array( 'status' => 401 ) );
				}
				break;
			case 'pull':
				if ( ! in_array( $http_method, array( 'GET', 'POST', 'PUT' ), true ) ) {
					return new WP_Error( 'rest_forbidden', esc_html__( 'This kind of request is not allowed.', 'object-sync-for-salesforce' ), array( 'status' => 401 ) );
				}
				break;
			case 'push':
				if ( ! in_array( $http_method, array( 'POST', 'PUT' ), true ) ) {
					return new WP_Error( 'rest_forbidden', esc_html__( 'This kind of request is not allowed.', 'object-sync-for-salesforce' ), array( 'status' => 401 ) );
				}
				break;
			default:
				if ( ! current_user_can( 'configure_salesforce' ) ) {
					return new WP_Error( 'rest_forbidden', esc_html__( 'You do not have permissions to view this data.', 'object-sync-for-salesforce' ), array( 'status' => 401 ) );
				}
				break;
		}
		return true;
	}

	/**
	 * Process the REST API request
	 *
	 * @param WP_REST_Request $request the request that was made.
	 * @return array $result
	 */
	public function process( WP_REST_Request $request ) {
		// see methods: https://developer.wordpress.org/reference/classes/wp_rest_request/
		// use error_log( 'request is ' . print_r( $request, true ) ); to log the request.
		$http_method = $request->get_method();
		$route       = $request->get_route();
		$url_params  = $request->get_url_params();
		$body_params = $request->get_body_params();
		$class       = $request->get_url_params()['class'];
		$api_call    = str_replace( '/' . $this->namespace . $this->version . '/', '', $route );
		// use error_log( 'api call is ' . $api_call . ' and params are ' . print_r( $params, true ) ); to log more of the api call.
		$result = '';
		switch ( $class ) {
			case 'salesforce':
				break;
			case 'mappings':
				break;
			case 'pull':
				if ( 'GET' === $http_method ) {
					$result = $this->pull->salesforce_pull_webhook( $request );
				}
				if ( 'POST' === $http_method && isset( $body_params['salesforce_object_type'] ) && isset( $body_params['salesforce_id'] ) ) {
					$result = $this->pull->manual_pull( $body_params['salesforce_object_type'], $body_params['salesforce_id'] );
				}
				break;
			case 'push':
				if ( ( 'POST' === $http_method || 'PUT' === $http_method || 'DELETE' === $http_method ) && isset( $body_params['wordpress_object_type'] ) && isset( $body_params['wordpress_id'] ) ) {
					$result = $this->push->manual_push( $body_params['wordpress_object_type'], $body_params['wordpress_id'], $http_method );
				}
				break;
		}

		return $result;
	}

}
