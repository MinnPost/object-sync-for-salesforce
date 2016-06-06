<?php
/**
 * Salesforce REST API Wordpress library.
 * @author Jonathan Stegall <@jonathanstegall>
 */



// If this file is called directly, nope.
if ( ! defined( 'WPINC' ) ) {
    die;
}

/**
 * Call a Salesforce API GET method.
 * 
 * @param string endpoint/method, e.g. "users/show"
 * @param array Request arguments, e.g. array( 'screen_name' => 'timwhitlock' )
 * @return array raw, deserialised data from Twitter
 * @throws SalesforceApiException
 */ 
function salesforce_api_get( $path, array $args = array() ){
    $Client = salesforce_api_client();
    return $Client->call( $path, $args, 'GET' );
} 




/**
 * Call a Salesforce API POST method.
 * 
 * @param string endpoint/method, e.g. "users/show"
 * @param array Request arguments, e.g. array( 'screen_name' => 'timwhitlock' )
 * @return array raw, deserialised data from Twitter
 * @throws SalesforceApiException
 */ 
function salesforce_api_post( $path, array $args = array() ){
    $Client = salesforce_api_client();
    return $Client->call( $path, $args, 'POST' );
} 




/**
 * Enable caching of Salesforce API responses using APC
 * @param int Cache lifetime in seconds
 * @return SalesforceApiClient
 */
function salesforce_api_enable_cache( $ttl ){
    $Client = salesforce_api_client();
    return $Client->enable_cache( $ttl );
}




/**
 * Disable caching of Salesforce API responses
 * @return SalesforceApiClient
 */
function salesforce_api_disable_cache(){
    $Client = salesforce_api_client();
    return $Client->disable_cache();
}



 
/** 
 * Include a component from the lib directory.
 * @param string $component e.g. "core", or "admin"
 * @return void fatal error on failure
 */
function salesforce_api_include(){
    foreach( func_get_args() as $component ){
        require_once salesforce_api_basedir().'/lib/salesforce-api-'.$component.'.php';
    }
} 



/**
 * Get plugin local base directory in case __DIR__ isn't available (php<5.3)
 */
function salesforce_api_basedir(){
    static $dir;
    isset($dir) or $dir = dirname(__FILE__);
    return $dir;    
}    



/**
 * Test if system-configured client is authed and ready to use
 */
function salesforce_api_configured(){
    function_exists('_salesforce_api_config') or salesforce_api_include('core');
    extract( _salesforce_api_config() );
    return $consumer_key && $consumer_secret && $callback_url && $login_base_url && $access_token && $instance_url;
} 



/**
 * Get fully configured and authenticated Salesforce API client.
 * @return SalesforceApiClient
 */ 
function salesforce_api_client( $id = null ){
    static $clients = array();
    if( ! isset($clients[$id]) ){
        salesforce_api_include('core');
        $clients[$id] = SalesforceApiClient::create_instance( is_null($id) );
    }
    return $clients[$id];
}




/**
 * Contact Salesforce for an authorization code, which will be exchanged for an access token later.
 * @return SalesforceOAuthToken authorization code
 */
// probably do not need this function at all

/*
function salesforce_api_oauth_authorization_code( $consumer_key, $consumer_secret, $oauth_callback = 'oob' ){
    $Client = salesforce_api_client('oauth');
    $Client->set_oauth( $consumer_key, $consumer_secret );     
    $params = $Client->oauth_exchange( SALESFORCE_OAUTH_AUTHORIZATION_CODE_URL, compact('oauth_callback') );
    return new SalesforceOAuthToken( $params['code'] );
}
*/





/**
 * Exchange authorization code for an access token after authentication/authorization by user
 * @return SalesforceOAuthToken Access token, instance url, and refresh token
 */
function salesforce_api_oauth_access_token( $consumer_key, $consumer_secret, $callback_url, $login_base_url, $authorization_code ){
    $Client = salesforce_api_client('oauth');
    $Client->set_oauth( $consumer_key, $consumer_secret, $login_base_url, $authorization_code );

    $url = $login_base_url . '/services/oauth2/token';
    $args = array(
        'code' => $authorization_code,
        'grant_type' => 'authorization_code',
        'client_id' => SALESFORCE_CONSUMER_KEY,
        'client_secret' => SALESFORCE_CONSUMER_SECRET,
        'redirect_uri' => SALESFORCE_CALLBACK_URL,
    );

    $params = $Client->oauth_exchange( $url, $args );
    return new SalesforceOAuthToken( $params['access_token'], $params['instance_url'], $params['refresh_token'] );
}




/**
 * Exchange refresh token for an access token if the access token has expired
 * @return SalesforceOAuthToken Access token
 */
function salesforce_api_oauth_refresh_access_token( $consumer_key, $consumer_secret, $request_key, $request_secret, $oauth_verifier ){
    $Client = salesforce_api_client('oauth');
    $Client->set_oauth( $consumer_key, $consumer_secret, $request_key, $request_secret );     
    $params = $Client->oauth_exchange( SALESFORCE_OAUTH_REFRESH_ACCESS_TOKEN_URL, compact('oauth_verifier') );
    return new SalesforceOAuthToken( $params['access_token'], $params['instance_url'], $params['refresh_token'] );
}




// Include application settings panel if in admin area
if( is_admin() ){
    salesforce_api_include('core','admin');
}
