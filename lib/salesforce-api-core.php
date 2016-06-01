<?php
/**
 * Salesforce API client and related utilities.
 * Uses built-in wordpress HTTP utilities.
 * @author Jonathan Stegall <@jonathanstegall>
 */
 

//define('SALESFORCE_API_BASE', '' );

define('SALESFORCE_OAUTH_AUTHORIZATION_CODE_URL', ''); // returns authorization code
//SALESFORCE_LOGIN_BASE_URL . '/services/oauth2/authorize?response_type=code' . '&client_id=' . SALESFORCE_CONSUMER_KEY . '&redirect_uri=' . urlencode( SALESFORCE_CALLBACK_URL );
//$code = $_REQUEST['code'];


define('SALESFORCE_OAUTH_ACCESS_TOKEN_URL', ''); // returns access tokens

/*
SALESFORCE_LOGIN_BASE_URL . '/services/oauth2/token';
$post_fields = array(
    'code' => $code,
    'grant_type' => 'authorization_code',
    'client_id' => SALESFORCE_CONSUMER_KEY,
    'client_secret' => SALESFORCE_CONSUMER_SECRET,
    'redirect_uri' => SALESFORCE_CALLBACK_URL,
);
*/
/*
$_SESSION['access_token'] = $token_request_data['access_token'];
$_SESSION['instance_url'] = $token_request_data['instance_url'];
$_SESSION['refresh_token'] = $token_request_data['refresh_token'];
*/

define('SALESFORCE_OAUTH_REFRESH_ACCESS_TOKEN_URL', ''); // returns new access token
/*

$params = 'grant_type=refresh_token' .
'&client_id=' . SALESFORCE_CONSUMER_KEY .
'&client_secret=' . SALESFORCE_CONSUMER_SECRET .
'&refresh_token=' . urlencode( $refresh_token );

$token_url = SALESFORCE_LOGIN_BASE_URL . '/services/oauth2/token';
*/

define('SALESFORCE_CACHE_APC', (bool) ini_get('apc.enabled') );
 

 
/**
 * Get config options from DB
 * @param array any new options to update
 */
function _salesforce_api_config( array $update = array() ){
    static $conf;
    if( ! isset($conf) ){
        $conf = array (
            'consumer_key'    => '',
            'consumer_secret' => '',
            'callback_url'    => '',
            'login_base_url'  => '',
            'data_endpoint'   => '',
            'access_token'    => '',
            'instance_url'    => '',
            'refresh_token'   => '',
        );
        foreach( $conf as $key => $val ){
            $conf[$key] = get_option('salesforce_api_'.$key) or
            $conf[$key] = $val;
        }
    }
    foreach( $update as $key => $val ){
        if( isset($conf[$key]) ){
            update_option( 'salesforce_api_'.$key, $val );
            $conf[$key] = $val;
        }
    }
    return $conf;
}




/**
 * abstraction of cache fetching, using apc where possible
 * @return mixed 
 */
function _salesforce_api_cache_get( $key ){
    if( SALESFORCE_CACHE_APC ){
        return apc_fetch( $key );
    }
    if( isset($key{45}) ){
        $key = 'twcache_'.md5($key);
    }
    return get_transient( $key );
} 



/**
 * abstraction of cache setting, using apc where possible
 * @internal
 * @return void
 */
function _salesforce_api_cache_set( $key, $value, $ttl ){
    if( SALESFORCE_CACHE_APC ){
        apc_store( $key, $value, $ttl );
        return;
    }
    if( isset($key{45}) ){
        $key = 'twcache_'.md5($key);
    }
    if( ! $ttl ){
        // WP will expire immediately as opposed to never, setting to ten days.
        $ttl = 864000;
    }
    set_transient( $key, $value, $ttl );
} 




/**
 * Client for the Salesforce REST API
 */
class SalesforceApiClient {

    /**
     * Consumer key token for application
     * @var SalesforceOAuthToken
     */
    private $Consumer;

    /**
     * Authenticated access token
     * @var SalesforceOAuthToken
     */
    private $AccessToken;

    /**
     * Authenticated refresh token
     * @var SalesforceOAuthRefreshToken
     */
    private $RefreshToken;
    
    /**
     * Whether caching API GET requests
     * @var int
     */
    private $cache_ttl = null;
    
    /**
     * Namespace/prefix for cache keys
     * @var string
     */    
    private $cache_ns;     
    
    /**
     * Registry of last rate limit arrays by full api function call
     * @var array
     */    
    private $last_rate = array();    
    
    /**
     * Last api function called, e.g. "direct_messages/sent"
     * @var string
     */    
    private $last_call;     

    
    /**
     * Get client instance authenticated with 'system' credentials
     * @param bool whether we're getting the system default client which is expected to be authed
     * @return SalesforceApiClient
     */    
    public static function create_instance( $default = true ){
        $Client = new SalesforceApiClient;
        extract( _salesforce_api_config() );
        if( $default ){
            if( ! $consumer_key || ! $consumer_secret || ! $access_key || ! $access_secret ){
                trigger_error( __('Salesforce application not fully configured','salesforce-api') );
            }
            $Client->set_oauth( $consumer_key, $consumer_secret, $access_key, $access_secret ); 
        }       
        else if( $consumer_key && $consumer_secret ){
            $Client->set_oauth( $consumer_key, $consumer_secret );
        }
        return $Client;
    }     
    
    
    /**
     * @internal
     */
    public function __sleep(){
       return array('Consumer','AccessToken');
    }
    
    /**
     * Enable caching of subsequent API calls
     * @return SalesforceApiClient
     */
    public function enable_cache( $ttl = 0, $namespace = 'wp_salesforce_api_' ){
       $this->cache_ttl = (int) $ttl;
       $this->cache_ns  = $namespace;
       return $this;
    }
    
    /**
     * Disable caching for susequent API calls
     * @return SalesforceApiClient
     */
    public function disable_cache(){
       $this->cache_ttl = null;
       $this->cache_ns  = null;
       return $this;
    }

    /**
     * Test whether the client has full authentication data.
     * Warning: does not validate credentials 
     * @return bool
     */
    public function has_auth(){
        return $this->AccessToken instanceof SalesforceOAuthToken && $this->AccessToken->secret;
    }    
    
    /**
     * Unset all logged in credentials - useful in error situations
     * @return SalesforceApiClient
     */
    public function deauthorize(){
        $this->AccessToken = null;
        return $this;
    }

    /**
     * Set currently logged in user's OAuth access token
     * @param string consumer api key
     * @param string consumer secret
     * @param string access token
     * @param string access token secret
     * @return SalesforceApiClient
     */
    public function set_oauth( $consumer_key, $consumer_secret, $access_key = '', $access_secret = '' ){
        $this->deauthorize();
        $this->Consumer = new SalesforceOAuthToken( $consumer_key, $consumer_secret );
        if( $access_key && $access_secret ){
            $this->AccessToken = new SalesforceOAuthToken( $access_key, $access_secret );
        }
        return $this;
    }
    
    
    /**
     * Call API method over HTTP and return raw data
     * @param string API method, e.g. "users/show"
     * @param array method arguments
     * @param string http request method
     * @return array unserialized data returned from salesforce
     * @throws SalesforceApiException
     */
    public function call( $path, array $_args, $http_method ){
        // all calls must be authenticated
        if( ! $this->has_auth() ){
            throw new SalesforceApiException( __('Salesforce client not authenticated','salesforce-api'), 0, 401 );
        }
        // transform some arguments and ensure strings
        // no further validation is performed
        $args = array();
        foreach( $_args as $key => $val ){
            if( is_string($val) ){
                $args[$key] = $val;
            }
            else if( true === $val ){
                $args[$key] = 'true';
            }
            else if( false === $val || null === $val ){
                 $args[$key] = 'false';
            }
            else if( ! is_scalar($val) ){
                throw new SalesforceApiException( __('Invalid Salesforce parameter','salesforce-api').' ('.gettype($val).') '.$key.' in '.$path, -1 );
            }
            else {
                $args[$key] = (string) $val;
            }
        }
        // Fetch response from cache if possible / allowed / enabled
        if( $http_method === 'GET' && isset($this->cache_ttl) ){
           $cachekey = $this->cache_ns.$path.'_'.md5( serialize($args) );
           if( preg_match('/^(\d+)-/', $this->AccessToken->key, $reg ) ){
              $cachekey .= '_'.$reg[1];
           }
           $data = _salesforce_api_cache_get( $cachekey );
           if( is_array($data) ){
               return $data;
           }
        }
        // @todo could validate args against endpoints here.
        
        // Using Wordpress WP_Http for requests, see class-http.php
        $conf = array (
            'method' => $http_method,
            'redirection' => 0,
        );
        // build signed URL and request parameters
        $endpoint = SALESFORCE_API_BASE.'/'.$path.'.json';
        $params = new SalesforceOAuthParams( $args );
        $params->set_consumer( $this->Consumer );
        $params->set_token( $this->AccessToken );
        $params->sign_hmac( $http_method, $endpoint );
        if( 'GET' === $http_method ){
            $endpoint .= '?'.$params->serialize();
        }
        else {
            //$conf['headers'] = $params->oauth_header();
            $conf['body'] = $params->serialize();
        }
        $http = self::http_request( $endpoint, $conf );
        $data = json_decode( $http['body'], true );
        $status = $http['response']['code'];
        // remember current rate limits for this endpoint
        $this->last_call = $path;
        if( isset($http['headers']['x-rate-limit-limit']) ) {
            $this->last_rate[$path] = array (
                'limit'     => (int) $http['headers']['x-rate-limit-limit'],
                'remaining' => (int) $http['headers']['x-rate-limit-remaining'],
                'reset'     => (int) $http['headers']['x-rate-limit-reset'],
            );
        }
        // unserializable array assumed to be serious error
        if( ! is_array($data) ){
            $err = array( 
                'message' => '', // <- blank so we use twitter-specific message
                'code' => -1 
            );
            SalesforceApiException::chuck( $err, $status );
        }
        // else could be well-formed error
        if( isset( $data['errors'] ) ) {
            while( $err = array_shift($data['errors']) ){
                $err['message'] = __( $err['message'], 'salesforce-api' );
                if( $data['errors'] ){
                    $message = sprintf( __('Salesforce error #%d','salesforce-api'), $err['code'] ).' "'.$err['message'].'"';
                    trigger_error( $message, E_USER_WARNING );
                }
                else {
                    SalesforceApiException::chuck( $err, $status );
                }
            }
        }
        // some errors appear to use a single key and have no code
        // e.g. not authorized to view specific content.
        if( isset($data['error']) ){
            $code = isset($data['code']) ? $data['code'] : $status;
            $message = sprintf( __('Twitter error #%d','twitter-api'), $code ).' "'.$data['error'].'"';
            SalesforceApiException::chuck( compact('message','code'), $status );
        }
        if( isset($cachekey) ){
           _salesforce_api_cache_set( $cachekey, $data, $this->cache_ttl );
        }
        return $data;
    }



    /**
     * Perform an OAuth request - these differ somewhat from regular API calls
     * @internal
     */
    public function oauth_exchange( $endpoint, array $args ){
        // build a post request and authenticate via OAuth header
        $params = new SalesforceOAuthParams( $args );
        $params->set_consumer( $this->Consumer );
        if( $this->AccessToken ){
            $params->set_token( $this->AccessToken );
        }
        $params->sign_hmac( 'POST', $endpoint );
        $conf = array (
            'method' => 'POST',
            'redirection' => 0,
            'headers' => array( 'Authorization' => $params->oauth_header() ),
        );
        $http = self::http_request( $endpoint, $conf );
        $body = trim( $http['body'] );
        $stat = $http['response']['code'];
        if( 200 !== $stat ){
            throw new SalesforceApiException( $body, -1, $stat );
        }
        parse_str( $body, $params );
        if( ! is_array($params) || ! isset($params['oauth_token']) || ! isset($params['oauth_token_secret']) ){
            throw new SalesforceApiException( __('Malformed response from Salesforce','salesforce-api'), -1, $stat );
        }
        return $params;   
    }



    /**
     * Abstract Wordpress HTTP call with error handling
     * @return array response from wordpress functions
     */
    public static function http_request( $endpoint, array $conf ){
        $http = wp_remote_request( $endpoint, $conf );
        if( $http instanceof WP_Error ){
            foreach( $http->get_error_messages() as $message ){
                throw new SalesforceApiException( $message, -1 );
            }
        }
        if( empty($http['response']) ){
            throw new SalesforceApiException( __('Wordpress HTTP request failure','salesforce-api'), -1 );
        }
        return $http;
    }



    /**
     * Get current rate limit, if known. does not look it up
     */
    public function last_rate_limit( $func = '' ){
        $func or $func = $this->last_call;
        return isset($this->last_rate[$func]) ? $this->last_rate[$func] : array();
    }


}







/**
 * Simple token class that holds key and secret
 * @internal
 */
class SalesforceOAuthToken {

    public $key;
    public $secret;

    public function __construct( $key, $secret = '' ){
        if( ! $key ){
           throw new Exception( __('Invalid OAuth token','salesforce-api').' - '.__('Key required even if secret is empty','salesforce-api') );
        }
        $this->key = $key;
        $this->secret = $secret;
    }
    
    public function get_authorization_url(){
        return SALESFORCE_OAUTH_AUTHORIZE_URL.'?oauth_token='.rawurlencode($this->key);
    }

}





/**
 * Class for compiling, signing and serializing OAuth parameters
 * @internal
 */
class SalesforceOAuthParams {
    
    private $args;
    private $consumer_secret;
    private $token_secret;
    
    private static function urlencode( $val ){
        return str_replace( '%7E', '~', rawurlencode($val) );
    }    
    
    private static function urlencode_params( array $args ){
        $pairs = array();
        foreach( $args as $key => $val ){
            $pairs[] = rawurlencode($key).'='.rawurlencode($val);
        }
        return str_replace( '%7E', '~', implode( '&', $pairs ) );
    }
    
    public function __construct( array $args = array() ){
        $this->args = $args + array ( 
            'oauth_version' => '1.0',
        );
    }
    
    public function set_consumer( SalesforceOAuthToken $Consumer ){
        $this->consumer_secret = $Consumer->secret;
        $this->args['oauth_consumer_key'] = $Consumer->key;
    }   
    
    public function set_token( SalesforceOAuthToken $Token ){
        $this->token_secret = $Token->secret;
        $this->args['oauth_token'] = $Token->key;
    }   
    
    private function normalize(){
        $flags = SORT_STRING | SORT_ASC;
        ksort( $this->args, $flags );
        foreach( $this->args as $k => $a ){
            if( is_array($a) ){
                sort( $this->args[$k], $flags );
            }
        }
        return $this->args;
    }
    
    public function serialize(){
        return self::urlencode_params( $this->args );
    }

    public function sign_hmac( $http_method, $http_rsc ){
        $this->args['oauth_signature_method'] = 'HMAC-SHA1';
        $this->args['oauth_timestamp'] = sprintf('%u', time() );
        $this->args['oauth_nonce'] = sprintf('%f', microtime(true) );
        unset( $this->args['oauth_signature'] );
        $this->normalize();
        $str = $this->serialize();
        $str = strtoupper($http_method).'&'.self::urlencode($http_rsc).'&'.self::urlencode($str);
        $key = self::urlencode($this->consumer_secret).'&'.self::urlencode($this->token_secret);
        $this->args['oauth_signature'] = base64_encode( hash_hmac( 'sha1', $str, $key, true ) );
        return $this->args;
    }

    public function oauth_header(){
        $lines = array();
        foreach( $this->args as $key => $val ){
            $lines[] = self::urlencode($key).'="'.self::urlencode($val).'"';
        }
        return 'OAuth '.implode( ",\n ", $lines );
    }

}






/**
 * Overridden HTTP status codes for common Salesforce-related problems.
 * Note these do not replace error text from Salesforce, they're for complete API failures.
 * @param int HTTP status code
 * @return string HTTP status text
 */
function _salesforce_api_http_status_text( $s ){
    // override status to be Salesforce specific
    $codes = array (
        429 => 'Salesforce API rate limit exceeded',
        500 => 'Salesforce server error',
        502 => 'Salesforce is not responding',
        503 => 'Salesforce is too busy to respond',
        // todo: find the salesforce versions of this
    );
    if( isset($codes[$s]) ){
        $text = $codes[$s];
    }
    // else fall back to Wordpress registry to save bloat
    else {
        $text = get_status_header_desc( $s );
    }
    if( $text ){
        twitter_api_load_textdomain( null, 'salesforce-errors' );
        return __( $text, 'salesforce-errors' );
    }
    // unknown status    
    return sprintf( __('Status %u from Salesforce','salesforce-api'), $s );
}





/**
 * Exception for throwing when Salesforce responds with something unpleasant
 */
class SalesforceApiException extends Exception {

    /**
     * HTTP Status of error
     * @var int
     */        
    protected $status = 0;        

        
    /**
     * Throw appropriate exception type according to HTTP status code
     * @param array Salesforce error data from their response 
     */
    public static function chuck( array $err, $status ){
        $code = isset($err['code']) ? (int) $err['code'] : -1;
        $mess = isset($err['message']) ? trim($err['message']) : '';
        static $classes = array (
            404 => 'SalesforceApiNotFoundException',
            429 => 'SalesforceApiRateLimitException',
        );
        $eclass = isset($classes[$status]) ? $classes[$status] : __CLASS__;
        throw new $eclass( $mess, $code, $status );
    }
        
        
    /**
     * Construct SalesforceApiException with addition of HTTP status code.
     * @overload
     */        
    public function __construct( $message, $code = 0 ){
        if( 2 < func_num_args() ){
            $this->status = (int) func_get_arg(2);
        }
        if( ! $message ){
            $message = _salesforce_api_http_status_text($this->status);
        }
        parent::__construct( $message, $code );
    }
    
    
    /**
     * Get HTTP status of error
     * @return int
     */
    public function getStatus(){
        return $this->status;
    }
    
}


/** 404 */
class SalesforceApiNotFoundException extends SalesforceApiException {
    
}


/** 429 */
class SalesforceApiRateLimitException extends SalesforceApiException {
    
}



