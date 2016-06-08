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
	protected $login_credentials;

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
    	//print_r($this);
    	//echo 'this ' . print_r($this->loggedin);
    }

    public function loggedin() {
    	$authorized = $this->get_authorized();
    	$login_credentials = $this->get_login_credentials();
    	if ( $this->access_token == '' || $this->refresh_token == '' || $this->instance_url == '' ) {
    		$href = $login_credentials['login_base_url'] .'/services/oauth2/authorize?response_type=code' . '&client_id=' . $login_credentials['consumer_key'] . '&redirect_uri=' . urlencode( $login_credentials['callback_url'] );
    		$result = array( 'loggedin' => FALSE, 'link' => esc_html( $href ), 'credentials' => $login_credentials );
    	} else {
    		$result = array( 'loggedin' => TRUE, 'credentials' => $login_credentials );
    	}
    	return $result;
    }

    private function get_authorized() {
    	$this->access_token = get_option( 'salesforce_api_access_token' );
    	$this->instance_url = get_option( 'salesforce_api_instance_url' );
    	$this->refresh_token = get_option( 'salesforce_api_refresh_token' );
    }

    private function get_login_credentials() {

    	$consumer_key = defined('SALESFORCE_CONSUMER_KEY') ? SALESFORCE_CONSUMER_KEY : '';
    	$consumer_secret = defined('SALESFORCE_CONSUMER_SECRET') ? SALESFORCE_CONSUMER_SECRET : '';
    	$callback_url = defined('SALESFORCE_CALLBACK_URL') ? SALESFORCE_CALLBACK_URL : '';
    	$login_base_url = defined('SALESFORCE_LOGIN_BASE_URL') ? SALESFORCE_LOGIN_BASE_URL : '';

    	$login_credentials = array( 'consumer_key' => $consumer_key, 'consumer_secret' => $consumer_secret, 'callback_url' => $callback_url, 'login_base_url' => $login_base_url );

    	return $login_credentials;

    }

}

class Wordpress_Salesforce_Admin {

	protected $loggedin;

	public function __construct( $loggedin, $parent_settings = array() ) {

		$this->loggedin = $loggedin;
		$this->parent_settings = $parent_settings;

	}

	public function create_admin_menu() {
	    $title = __('Salesforce API','salesforce-api');
	    add_options_page( $title, $title, 'manage_options', 'salesforce-api-admin', array( &$this, 'show_admin_page', ) );
	}

	/**
	 * Render full admin page
	 */ 
	function show_admin_page() {
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
			        	
			        	$authenticate = $this->authenticate( $credentials['consumer_key'], $credentials['consumer_secret'], $credentials['callback_url'], $credentials['login_base_url'], $_GET['code'] );
			        } else if ( $this->loggedin['loggedin'] !== true ) {            
			            echo '<p><a class="button-primary" href="' . $this->loggedin['link'] . '">' . esc_html__('Connect to Salesforce','salesforce-api') . '</a></p>';
			        } else {
			        	echo '<div class="success"><h2>Salesforce is successfully authenticated.</h2></div>';
			        	echo '<p><a class="button-primary" href="' . $credentials['callback_url'] . '&amp;tab=logout">Disconnect from Salesforce</a></p>';
			        }
	    			break;
	    		case 'logout':
	    			$message = $this->logout();
	    			echo '<p>' . $message . '</p>';
	    			break;
	    		default:
	    			echo 'show settings';
	    			break;
	    	}

	    }
	    catch( SalesforceApiException $Ex ){
	        salesforce_api_admin_render_header( $Ex->getStatus().': Error '.$Ex->getCode().', '.$Ex->getMessage(), 'error' );
	        if( 401 === $Ex->getStatus() ){
	            echo '<p><a class="button-primary" href="' . $loggedin['link'] . '">' . esc_html__('Connect to Salesforce','salesforce-api') . '</a></p>';
	        }
	    }
	    catch( Exception $Ex ){
	        salesforce_api_admin_render_header( $Ex->getMessage(), 'error' );
	    }

	    echo '</div>';
	    
	    // end admin page with options form and close wrapper
	    //salesforce_api_admin_render_form();
	    //salesforce_api_admin_render_footer();
	}

	private function authenticate( $consumer_key, $consumer_secret, $callback_url, $login_base_url, $authorization_code ) {

		$url = $login_base_url . '/services/oauth2/token';
	    $args = array(
	        'code' => $authorization_code,
	        'grant_type' => 'authorization_code',
	        'client_id' => $consumer_key,
	        'client_secret' => $consumer_secret,
	        'redirect_uri' => $callback_url,
	    );

	    $params = array(
            'method' => 'POST',
            'timeout' => 45,
            'redirection' => 5,
            'httpversion' => '1.0',
            'blocking' => true,
            'headers' => array(),
            'body' => $args,
            'cookies' => array()
        );

	    $http = wp_remote_request( $url, $params );
        if( $http instanceof WP_Error ){
            foreach( $http->get_error_messages() as $message ){
            	echo 'error';
            	echo $message;
                //throw new SalesforceApiException( $message, -1 );
            }
        }
        if( empty($http['response']) ){
        	// handle errors
            //throw new SalesforceApiException( __('Wordpress HTTP request failure','salesforce-api'), -1 );
        }

        $body = trim( $http['body'] );
        $stat = $http['response']['code'];
        if( 200 !== $stat ){
        	// handle errors
            //throw new SalesforceApiException( $body, -1, $stat );
        }

        $result = json_decode( $body, true );

        if( ! is_array($result) || ! isset($result['access_token']) || ! isset($result['instance_url']) || ! isset($result['refresh_token']) ){
        	// handle errors
            //throw new SalesforceApiException( __('Malformed response from Salesforce','salesforce-api'), -1, $stat );
        }

        update_option( 'salesforce_api_access_token', $result['access_token'] );
        update_option( 'salesforce_api_instance_url', $result['instance_url'] );
        update_option( 'salesforce_api_refresh_token', $result['refresh_token'] );

        echo "<script>window.location = '$callback_url';</script>";
        // we have to use javascript here because the template_redirect WP hook does not run in wp-admin

        return $result;

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