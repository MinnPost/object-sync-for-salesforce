<?php
/**
 * Expose the partner SOAP API by extending SforcePartnerClient and configuring
 * it with the OAUTH credentials and endpoints from the Salesforce API class.
 *
 * @class   Object_Sync_Sf_Salesforce_Soap_Partner
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Salesforce_Soap_Partner class.
 */
class Object_Sync_Sf_Salesforce_Soap_Partner extends SforcePartnerClient {

	/**
	 * The main plugin file
	 *
	 * @var string
	 */
	public $file;

	/**
	 * The directory where the Soap client is stored
	 *
	 * @var string
	 */
	public $soap_client_directory;

	/**
	 * The salesforce_get_api() helper method from root class
	 * This contains Salesforce API methods and flags.
	 *
	 * @var array
	 */
	public $salesforce_get_api;

	/**
	 * Object_Sync_Sf_Salesforce class
	 * This contains Salesforce API methods
	 *
	 * @var array
	 */
	public $salesforce_api;

	/**
	 * Whether Salesforce is authorized
	 *
	 * @var bool
	 */
	public $is_authorized;

	/**
	 * Whether Salesforce is refreshed
	 *
	 * @var bool
	 */
	public $refreshed;

	/**
	 * The path to the WSDL file
	 *
	 * @var string
	 */
	public $wsdl;

	/**
	 * Constructor for soap class
	 */
	public function __construct() {

		$this->file                  = object_sync_for_salesforce()->file;
		$this->soap_client_directory = plugin_dir_path( $this->file ) . 'vendor/messageagency/force.com-toolkit-for-php/soapclient/';

		$this->wsdl = get_option( 'object_sync_for_salesforce_soap_wsdl_path', $this->soap_client_directory . 'partner.wsdl.xml' );

		$this->salesforce_get_api = object_sync_for_salesforce()->salesforce;
		parent::__construct();

		$this->init();
	}

	/**
	 * Initialize.
	 */
	private function init() {
		if ( false === $this->salesforce_get_api['soap_available'] ) {
			return;
		}
		if ( ! class_exists( 'SforceBaseClient' ) && file_exists( plugin_dir_path( $this->file ) . 'vendor/autoload.php' ) ) {
			require_once $this->soap_client_directory . 'SforcePartnerClient.php';
		}

		if ( empty( $wsdl ) ) {
			$this->wsdl = $this->soap_client_directory . 'partner.wsdl.xml';
		}

		$this->set_authorized( false );
		$this->createConnection( $this->wsdl );

		$this->salesforce_api = $this->salesforce_get_api['sfapi'];

		if ( $this->salesforce_api->is_authorized() ) {
			$token = $this->salesforce_api->get_access_token();
			if ( ! $token ) {
				$token = $this->salesforce_api->refresh_token();
			}
			$this->setSessionHeader( $token );
			$this->setEndPoint( $this->salesforce_api->get_api_endpoint( 'partner' ) );
			$this->set_authorized( true );
		} else {
			$this->set_authorized( false );
		}
	}

	/**
	 * Set whether Salesforce is authorized
	 *
	 * @param bool $is_authorized whether Salesforce is authorized.
	 */
	protected function set_authorized( $is_authorized ) {
		$this->is_authorized = $is_authorized;
	}

	/**
	 * Get whether Salesforce is authorized
	 *
	 * @return bool $is_authorized whether Salesforce is authorized.
	 */
	public function is_authorized() {
		return $this->is_authorized;
	}

	/**
	 * Try to use the SOAP API
	 *
	 * @param string $function function we want to call.
	 * @return array $results
	 * @throws SoapFault $e If there is an error from SOAP.
	 */
	public function try_soap( $function ) {
		$args = func_get_args();
		array_shift( $args );
		try {
			$results = call_user_func_array( array( $this, $function ), $args );
			// If returned without exceptions, reset the refreshed flag.
			$this->refreshed = false;
			return $results;
		} catch ( SoapFault $e ) {
			// sf:INVALID_SESSION_ID is thrown on expired login (and other reasons).
			// Our only recourse is to try refreshing our auth token. If we get any
			// other exception, bubble it up.
			if ( 'sf:INVALID_SESSION_ID' !== $e->faultcode ) {
				throw $e;
			}

			if ( ! $this->refreshed ) {
				// If we got an invalid session exception, try to refresh the auth
				// token through REST API. The "refreshed" flag will make sure we retry
				// only once.
				$this->refreshed = true;
				$this->salesforce_api->refresh_token();
				return $this->try_soap( $function, $args );
			}

			// If we've already tried a refresh, this refresh token is probably
			// invalid. Kill it, log, and bubble the exception.
			$this->set_authorized( false );
			throw $e;

		}
	}

}
