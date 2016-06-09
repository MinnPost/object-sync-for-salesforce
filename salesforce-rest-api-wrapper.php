<?php
class Salesforce_REST_API {

	/**
	* @var string
	*/
	protected $login_base_url;

	/**
	* @var string
	*/
	protected $consumer_key;

	/**
	* @var string
	*/
	protected $consumer_secret;


	/**
	* @var array
	*/
	public $login_credentials;

	/**
	* @var array
	*/
	protected $loggedin;


	/**
	* @var string
	*/
	private $access_token;

	/**
	* @var string
	*/
	private $refresh_token;

	/**
	* @var string
	*/
	private $instance_url;

	/**
	* @var string
	*/
	private $api_version;

	/**
	* @var array
	*/
	private $parent_settings;


	// Supported request methods
    const METH_DELETE = 'DELETE';
    const METH_GET = 'GET';
    const METH_POST = 'POST';
    const METH_PUT = 'PUT';
    const METH_PATCH = 'PATCH';
    // Return types
    const RETURN_OBJECT = 'object';
    const RETURN_ARRAY_A = 'array_a';

	/**
     * Create a sf client. Optionally can use an array of parent plugin settings
     *
     * @param array $parent_settings
     * @param \GuzzleHttp\Client    $guzzleClient
     * @throws \Exception
     */
    public function __construct( $parent_settings = array() ) {
    	$this->loggedin = $this->loggedin();
    	$this->load_admin( $this->loggedin(), $parent_settings );
        //$this->login_credentials = $this->get_login_credentials();
    }

    private function load_admin( $login_credentials, $parent_settings ) {
    	$admin = new Wordpress_Salesforce_Admin( $login_credentials );
    	if ( !isset( $parent_settings['has_menu'] ) || $parent_settings['has_menu'] !== true ) {
    		add_action( 'admin_menu', array( $admin, 'create_admin_menu' ) );
    	}
    }

    public function loggedin() {
    	$authorized = $this->get_authorized();
    	$login_credentials = $this->get_login_credentials();
    	if ( $this->access_token == '' || $this->refresh_token == '' || $this->instance_url == '' ) {

    		$href = add_query_arg( 
			    array( 
			        'response_type' => 'code',
			        'client_id' => $login_credentials['consumer_key'],
			        'redirect_uri' => urlencode( $login_credentials['callback_url'] )
			    ), 
			    $login_credentials['login_base_url'] . $login_credentials['authorize_url_path']
			);

    		$result = array( 'loggedin' => FALSE, 'link' => esc_html( $href ), 'credentials' => $login_credentials );
    	} else {
    		$result = array( 'loggedin' => TRUE, 'credentials' => $login_credentials );
    	}
    	return $result;
    }

    public function refresh_token() {
    	$authorized = $this->get_authorized();
    	$login_credentials = $this->get_login_credentials();
    }

    private function get_authorized() {
    	$this->access_token = get_option( 'salesforce_api_access_token', '' );
    	$this->instance_url = get_option( 'salesforce_api_instance_url', '' );
    	$this->refresh_token = get_option( 'salesforce_api_refresh_token', '' );
    	$this->base_url = $this->instance_url . '/services/data/v' . SALESFORCE_API_VERSION . '/';
    }

    private function get_login_credentials() {

    	$consumer_key = defined('SALESFORCE_CONSUMER_KEY') ? SALESFORCE_CONSUMER_KEY : get_option( 'salesforce_api_consumer_key', '' );
    	$consumer_secret = defined('SALESFORCE_CONSUMER_SECRET') ? SALESFORCE_CONSUMER_SECRET : get_option( 'salesforce_api_consumer_secret', '' );
    	$callback_url = defined('SALESFORCE_CALLBACK_URL') ? SALESFORCE_CALLBACK_URL : get_option( 'salesforce_api_callback_url', '' );
    	$login_base_url = defined('SALESFORCE_LOGIN_BASE_URL') ? SALESFORCE_LOGIN_BASE_URL : get_option( 'salesforce_api_login_base_url', '' );
    	$authorize_url_path = defined('SALESFORCE_AUTHORIZE_URL_PATH') ? SALESFORCE_AUTHORIZE_URL_PATH : get_option( 'salesforce_api_authorize_url_path', '' );
    	$token_url_path = defined('SALESFORCE_TOKEN_URL_PATH') ? SALESFORCE_TOKEN_URL_PATH : get_option( 'salesforce_api_token_url_path', '' );
    	$api_version = defined('SALESFORCE_API_VERSION') ? SALESFORCE_API_VERSION : get_option( 'salesforce_api_version', '' );

    	$login_credentials = array( 'consumer_key' => $consumer_key, 'consumer_secret' => $consumer_secret, 'callback_url' => $callback_url, 'login_base_url' => $login_base_url, 'authorize_url_path' => $authorize_url_path, 'token_url_path' => $token_url_path, 'api_version', $api_version );

    	return $login_credentials;

    }


    public function authenticate( $consumer_key, $consumer_secret, $callback_url, $login_base_url, $token_url_path, $authorization_code = '', $refresh_token = '' ) {

		$url = $login_base_url . $token_url_path;

		if ( $authorization_code !== '' ) {
		    $args = array(
		        'code' => $authorization_code,
		        'grant_type' => 'authorization_code',
		        'client_id' => $consumer_key,
		        'client_secret' => $consumer_secret,
		        'redirect_uri' => $callback_url,
		    );
		    $headers = false;
		}

		if ( $refresh_token !== '' ) {
			$args = array(
		        'refresh_token' => $refresh_token,
		        'grant_type' => 'refresh_token',
		        'client_id' => $consumer_key,
		        'client_secret' => $consumer_secret,
		    );
			$headers = false;
		}

		$result = $this->request( $url, false, $args, self::METH_POST, $headers );

        if( ! is_array($result) || ! isset( $result['access_token'] ) || ! isset( $result['instance_url'] ) || ! isset( $result['refresh_token'] ) ){
        	// handle errors
            //throw new SalesforceApiException( __('Malformed response from Salesforce','salesforce-api'), -1, $stat );
        }

        if ( isset( $result['access_token'] ) ) {
        	update_option( 'salesforce_api_access_token', $result['access_token'] );
        }
        if ( isset( $result['instance_url'] ) ) {
        	update_option( 'salesforce_api_instance_url', $result['instance_url'] );
    	}

        if ( $refresh_token === '' && isset( $result['refresh_token'] ) ) {
        	update_option( 'salesforce_api_refresh_token', $result['refresh_token'] );
        	//echo "<script>window.location = '$callback_url';</script>";
        	// we have to use javascript here because the template_redirect WP hook does not run in wp-admin
        }

        return $result;

	}

    public function searchSOQL($query, $all = false, $explain = false) {
        $search_data = [
            'q' => $query,
        ];
        // If the explain flag is set, it will return feedback on the query performance
        if ($explain) {
            $search_data['explain'] = $search_data['q'];
            unset($search_data['q']);
        }
        // If is set, search through deleted and merged data as well
        if ($all) {
            $path = 'queryAll/';
        } else {
            $path = 'query/';
        }
        return $this->request( $this->base_url . $path . '?q=' . urlencode($query), true, [], self::METH_GET );
    }

	function request( $url, $require_authenticated = true, $args = [], $method = self::METH_GET, $headers = [] ) {

		if ( $require_authenticated === true ) { 
			$authorized = $this->get_authorized();
	    	
	    	if ( $this->access_token == '' && $this->refresh_token == '' ) {
	    		//throw new SalesforceAPIException('You have not logged in yet.');
	    	}

	    	$authenticated_headers = [
	            'Authorization' => 'Authorization: OAuth ' . $this->access_token,
	        ];

	        // Merge all the headers
        	$headers = array_merge( $authenticated_headers, $headers );
    	}

		$params = array(
            'method' => $method,
            'timeout' => 45,
            'redirection' => 5,
            'httpversion' => '1.0',
            'blocking' => true,
            'headers' => $headers,
            'body' => $args,
            'cookies' => array()
        );

		$result = $this->httprequest( $url, $headers, $method, $args );

		$json_response = $result['json_response'];
		$status = $result['status'];
		$response = $result['response'];

		// handle error if the auth token has expired
		if ( ( $status === 401 && $response[0]['errorCode'] === 'INVALID_SESSION_ID' ) || ( isset( $response['error'] ) && $status === 400 && $response['error'] === 'invalid_grant' ) ) {

			$credentials = array(
				'consumer_key' => $this->loggedin['credentials']['consumer_key'],
				'consumer_secret' => $this->loggedin['credentials']['consumer_key'],
				'callback_url' => $this->loggedin['credentials']['callback_url'],
				'login_base_url' => $this->loggedin['credentials']['login_base_url'],
				'token_url_path' => $this->loggedin['credentials']['token_url_path'],
			);
			$credentials = $this->loggedin['credentials'];
			$refresh_token = $this->authenticate( $credentials['consumer_key'], $credentials['consumer_secret'], $credentials['callback_url'], $credentials['login_base_url'], $credentials['token_url_path'], '', $this->refresh_token );
			
			// rerun the same function we ran before the token expired
			$redo = $this->httprequest( $url, $headers, $method, $args );

			$json_response = $redo['json_response'];
			$status = $redo['status'];
			$response = $redo['response'];

		}

		// pass all the info for reuse
		$result = array( 'url' => $url, 'body' => $json_response, 'code' => $status, 'data' => $response );
		//print_r($result);
		$body = $result['body'];



	    /*$http = wp_remote_request( $url, $params );
	    print_r($http);

        if( $http instanceof WP_Error ){
        	//$body = array();
            foreach( $http->get_error_messages() as $message ){
            	//echo 'error';
            	echo $message;
                //throw new SalesforceApiException( $message, -1 );
                $body = $message;
            }
        } else {
	        if( empty( $http['response'] ) ){
	        	// handle errors
	            //throw new SalesforceApiException( __('Wordpress HTTP request failure','salesforce-api'), -1 );
	        }

	        $body = trim( $http['body'] );
	        $stat = $http['response']['code'];
	        if( 200 !== $stat ){
	        	// handle errors
	            //throw new SalesforceApiException( $body, -1, $stat );
	        }

        }*/

        $result = json_decode( $body, true );
        return $result;
	}

	function httprequest( $url, $headers, $method, $args ) {
		// run query with curl
		$curl = curl_init();
		curl_setopt( $curl, CURLOPT_URL, $url );
		curl_setopt( $curl, CURLOPT_RETURNTRANSFER, TRUE );
		curl_setopt( $curl, CURLOPT_FOLLOWLOCATION, TRUE );
		if ( $headers !== false ) {
			curl_setopt( $curl, CURLOPT_HTTPHEADER, $headers );
		} else {
			curl_setopt( $curl, CURLOPT_HEADER, false );
		}

		if ( $method === self::METH_POST ) {
			curl_setopt( $curl, CURLOPT_POST, TRUE );
			curl_setopt( $curl, CURLOPT_POSTFIELDS, $args );
		}

		$json_response = curl_exec( $curl );
		$status = curl_getinfo( $curl, CURLINFO_HTTP_CODE );
		$response = json_decode( $json_response, true );

		if ( $status !== 200 ) {
			$curl_error = curl_error( $curl );
			if ( $curl_error !== '' ) {
				throw new SalesforceAPIException( $curl_error );
			} else if ( $response[0]['errorCode'] !== '' ) {
				throw new SalesforceAPIException( $response[0]['message'], -1, $status );
			}
		}

		curl_close( $curl );

		return array( 'json_response' => $json_response, 'status' => $status, 'response' => $response );

	}

}

class Wordpress_Salesforce_Admin {

	protected $loggedin;

	public function __construct( $loggedin, $parent_settings = array() ) {

		$this->loggedin = $loggedin;
		$this->parent_settings = $parent_settings;

		add_action('admin_init', array( &$this, 'salesforce_settings_form' ) );

	}

	public function create_admin_menu() {
	    $title = __('Salesforce API','salesforce-api');
	    add_options_page( $title, $title, 'manage_options', 'salesforce-api-admin', array( &$this, 'show_admin_page', ) );
	}

	function salesforce_settings_form() {
	    //$salesforce_api_settings = '';
	}

	function demo( $salesforce_rest_api ) {
		echo '<h3>Salesforce Demo</h3>';
		$result = $salesforce_rest_api->searchSOQL('SELECT Name, Id from Contact LIMIT 100');
		
		// format this array into html so users can see the contacts
		//print_r($result);
		echo 'this is a successful result';
	}

	/**
	 * Render full admin page
	 */ 
	function show_admin_page() {
		$salesforce_rest_api = new Salesforce_REST_API();
		$tabs = array('settings' => 'Settings', 'authorize' => 'Authorize');
		$tab = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
		echo '<div class="wrap">';
		$this->tabs( $tabs, $tab );
		echo '<h1>Salesforce</h1>';

	    if ( ! current_user_can('manage_options') ){
	        //salesforce_api_admin_render_header( __("You don't have permission to manage Salesforce API settings",'salesforce-api'),'error');
	        //salesforce_api_admin_render_footer();
	        return;
	    }
	    try {

	    	$loggedin = $this->loggedin;

	    	switch( $tab ) {
	    		case 'authorize':
	    			$credentials = $this->loggedin['credentials'];
			        if ( isset( $_GET['code'] ) )  { // we have an authorization code. try to get an access token.
			        	
			        	$authenticate = $salesforce_rest_api->authenticate( $credentials['consumer_key'], $credentials['consumer_secret'], $credentials['callback_url'], $credentials['login_base_url'], $credentials['token_url_path'], $_GET['code'] );
			        } else if ( $this->loggedin['loggedin'] !== true ) {            
			            echo '<p><a class="button-primary" href="' . $this->loggedin['link'] . '">' . esc_html__('Connect to Salesforce','salesforce-api') . '</a></p>';
			        } else {
			        	echo '<div class="success"><h2>Salesforce is successfully authenticated.</h2></div>';
			        	echo '<p><a class="button-primary" href="' . $credentials['callback_url'] . '&amp;tab=logout">Disconnect from Salesforce</a></p>';
			        	$demo = $this->demo( $salesforce_rest_api );
			        }
	    			break;
	    		case 'logout':
	    			$message = $this->logout();
	    			echo '<p>' . $message . '</p>';
	    			break;
	    		default:
	    			echo '<form method="post" action="options.php">' . 
		                settings_fields( $tab ) . do_settings_sections( $tab ) . submit_button() .
		            '</form>';
	    			break;
	    	}

	    }
	    catch( SalesforceApiException $Ex ) {
	        //salesforce_api_admin_render_header( $Ex->getStatus().': Error '.$Ex->getCode().', '.$Ex->getMessage(), 'error' );
	        //print_r($Ex);
	        echo 'Error '.$Ex->getCode().', '.$Ex->getMessage();
	    }
	    catch( Exception $Ex ) {
	    	echo 'Error '.$Ex->getCode().', '.$Ex->getMessage();
	    }

	    echo '</div>';
	    
	    // end admin page with options form and close wrapper
	    //salesforce_api_admin_render_form();
	    //salesforce_api_admin_render_footer();
	}

	

	private function logout() {
    	$this->access_token = delete_option( 'salesforce_api_access_token' );
    	$this->instance_url = delete_option( 'salesforce_api_instance_url' );
    	$this->refresh_token = delete_option( 'salesforce_api_refresh_token' );
    	return 'You have been logged out. You can use use the connect button to log in again.';
    }

    private function tabs( $tabs, $tab = '' ) {

    	$current_tab = $tab;
	    screen_icon();
	    echo '<h2 class="nav-tab-wrapper">';
	    foreach ( $tabs as $tab_key => $tab_caption ) {
	        $active = $current_tab == $tab_key ? 'nav-tab-active' : '';
	        echo '<a class="nav-tab ' . $active . '" href="?page=salesforce-api-admin&tab=' . $tab_key . '">' . $tab_caption . '</a>';
	    }
	    echo '</h2>';

    	if ( isset( $_GET['tab'] ) ) {
    		$tab = urlencode( $_GET['tab'] );	
    	} else {
    		$tab = '';
    	}
    }

}

class SalesforceAPIException extends Exception {
    /**
     * @var null
     */
    public $curlInfo = null;
    /**
     * Constructor
     *
     * @param string $message
     * @param null   $curlInfo
     * @param int    $code
     * @param Exception $previous
     */
    public function __construct( $message = '', $curlInfo = null, $code = 0, Exception $previous = null ) {
        $this->curlInfo = $curlInfo;
        parent::__construct( $message, $code, $previous );
    }
}