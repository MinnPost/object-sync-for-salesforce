<?php
/**
 * @file
 * Objects, properties, and methods to communicate with the Salesforce REST API
 */

/**
 * Ability to authorize and communicate with the Salesforce REST API.
 */
class Salesforce {

	public $response;

	/**
	* Constructor which initializes the consumer.
	*
	* @param string $consumer_key
	*   Salesforce key to connect to your Salesforce instance.
	* @param string $consumer_secret
	*   Salesforce secret to connect to your Salesforce instance.
	* @param string $login_url
	*   Login URL for Salesforce auth requests - differs for production and sandbox
	* @param string $callback_url
	*   WordPress URL where Salesforce should send you after authentication
	* @param string $authorize_path
	*   Oauth path that Salesforce wants
	* @param string $token_path
	*   Path Salesforce uses to give you a token
	* @param string $rest_api_version
	*   What version of the Salesforce REST API to use
	* @param string $text_domain
	*   Text domain for this plugin. Would be used in any future translations.
	*/
	public function __construct( $consumer_key, $consumer_secret, $login_url, $callback_url, $authorize_path, $token_path, $rest_api_version, $text_domain ) {
		$this->consumer_key = $consumer_key;
		$this->consumer_secret = $consumer_secret;
		$this->login_url = $login_url;
		$this->callback_url = $callback_url;
		$this->authorize_path = $authorize_path;
		$this->token_path = $token_path;
		$this->rest_api_version = $rest_api_version;
		$this->text_domain = $text_domain;
		$this->options = array(
			'cache' => true,
			'cache_expiration' => $this->cache_expiration(),
			'type' => 'read'
		);
	}

	/**
	* Converts a 15-character case-sensitive Salesforce ID to 18-character
	* case-insensitive ID. If input is not 15-characters, return input unaltered.
	*
	* @param string $sf_id_15
	*   15-character case-sensitive Salesforce ID
	* @return string
	*   18-character case-insensitive Salesforce ID
	*/
	public static function convert_id( $sf_id_15 ) {
		if ( strlen( $sf_id_15) != 15 ) {
		  return $sf_id_15;
		}
		$chunks = str_split( $sf_id_15, 5 );
		$extra = '';
		foreach ( $chunks as $chunk ) {
		  $chars = str_split( $chunk, 1 );
		  $bits = '';
		  foreach ( $chars as $char ) {
		    $bits .= ( !is_numeric( $char ) && $char == strtoupper( $char ) ) ? '1' : '0';
		  }
		  $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
		  $extra .= substr( $map, base_convert( strrev( $bits ), 2, 10 ), 1 );
		}
		return $sf_id_15 . $extra;
	}

	/**
	* Given a Salesforce ID, return the corresponding SObject name. (Based on
	*  keyPrefix from object definition, @see
	*  https://developer.salesforce.com/forums/?id=906F0000000901ZIAQ )
	*
	* @param string $sf_id
	*   15- or 18-character Salesforce ID
	* @return string
	*   sObject name, e.g. "Account", "Contact", "my__Custom_Object__c" or FALSE
	*   if no match could be found.
	* @throws SalesforceException
	*/
	public function get_sobject_type( $sf_id ) {
		$objects = $this->objects( array( 'keyPrefix' => substr( $sf_id, 0, 3 ) ) );
		if ( count( $objects ) == 1 ) {
		  // keyPrefix is unique across objects. If there is exactly one return value from objects(), then we have a match.
		  $object = reset( $objects );
		  return $object['name'];
		}
		// Otherwise, we did not find a match.
		return FALSE;
	}

	/**
	* Determine if this SF instance is fully configured.
	*
	* @TODO: Consider making a test API call.
	*/
	public function is_authorized() {
		return !empty( $this->consumer_key ) && !empty( $this->consumer_secret ) && $this->get_refresh_token();
	}

	/**
	* Get REST API versions available on this Salesforce organization
	* This is not an authenticated call, so it would not be a helpful test
	*/
	public function get_api_versions() {
		$options = array( 'authenticated' => false, 'full_url' => true );
		return $this->api_call( $this->get_instance_url() . '/services/data', [], 'GET', $options );
	}

	/**
	* Make a call to the Salesforce REST API.
	*
	* @param string $path
	*   Path to resource.
	* @param array $params
	*   Parameters to provide.
	* @param string $method
	*   Method to initiate the call, such as GET or POST. Defaults to GET.
	* @param array $options
	*   Any method can supply options for the API call, and they'll be preserved as far as the curl request
	*	They get merged with the class options
	* @param string $type
	*   Type of call. Defaults to 'rest' - currently we don't support other types
	*
	* @return mixed
	*   The requested response.
	*
	* @throws SalesforceException
	*/
	public function api_call( $path, $params = array(), $method = 'GET', $options = array(), $type = 'rest' ) {
		if ( !$this->get_access_token() ) {
			$this->refresh_token();
		}
		$this->response = $this->api_http_request( $path, $params, $method, $options, $type );
		switch ( $this->response['code'] ) {
		  // The session ID or OAuth token used has expired or is invalid.
		  case 401:
		    // Refresh token.
		    $this->refresh_token();
		    // Rebuild our request and repeat request.
		    $options['is_redo'] = true;
		    $this->response = $this->api_http_request( $path, $params, $method, $options, $type );
		    // Throw an error if we still have bad response.
		    if (!in_array( $this->response['code'], array( 200, 201, 204 ) ) ) {
		      throw new SalesforceException( $this->response['data'][0]['message'], $this->response['code'] );
		    }

		    break;

		  case 200:
		  case 201:
		  case 204:
		    // All clear.
		    break;

		  default:
		    // We have problem and no specific Salesforce error provided.
		    if ( empty( $this->response['data'] ) ) {
		      throw new SalesforceException( $this->response['error'], $this->response['code'] );
		    }
		}

		if ( !empty( $this->response['data'][0] ) && count( $this->response['data'] ) == 1 ) {
		  $this->response['data'] = $this->response['data'][0];
		}

		if ( isset( $this->response['data']['error'] ) ) {
		  throw new SalesforceException( $this->response['data']['error_description'], $this->response['data']['error'] );
		}

		if ( !empty($this->response['data']['errorCode'] ) ) {
		  throw new SalesforceException( $this->response['data']['message'], $this->response['code'] );
		}
		
		return $this->response;
	}

	/**
	* Private helper to issue an SF API request.
	* This method is the only place where we read to or write from the cache
	*
	* @param string $path
	*   Path to resource.
	* @param array $params
	*   Parameters to provide.
	* @param string $method
	*   Method to initiate the call, such as GET or POST.  Defaults to GET.
	* @param array $options
	*   This is the options array from the api_call method
	*	This is where it gets merged with $this->options
	* @param string $type
	*   Type of call. Defaults to 'rest' - currently we don't support other types
	*
	* @return array
	*   The requested data.
	*/
	protected function api_http_request( $path, $params, $method, $options = array(), $type = 'rest' ) {
		$options = array_merge( $this->options, $options ); // this will override a value in $this->options with the one in $options if there is a matching key
		$url = $this->get_api_endpoint( $type ) . $path;
		if ( isset( $options['full_url'] ) && $options['full_url'] === true ) {
			$url = $path;
		}
		$headers = array(
		  'Authorization' => 'Authorization: OAuth ' . $this->get_access_token(),
		  //'Content-type' => 'application/json',
		  'Accept-Encoding' => 'Accept-Encoding: gzip, deflate'
		);
		if ( isset( $options['authenticated'] ) && $options['authenticated'] === true ) {
			$headers = false;
		}
		// if this request should be cached, see if it already exists
		// if it is already cached, load it. if not, load it and then cache it if it should be cached
		// add parameters to the array so we can tell if it was cached or not
		if ( $options['cache'] === true && $options['cache'] !== 'write' ) { 
			$cached = $this->cache_get( $url, $params );
			if ( is_array( $cached ) ) {
				$result = $cached;
				$result['from_cache'] = true;
				$result['cached'] = true;
    		} else {
    			$data = json_encode( $params );
				$result = $this->http_request( $url, $data, $headers, $method, $options );
				$result['from_cache'] = false;
				if ( in_array( $result['code'], array( 200, 201, 204 ) ) ) {
					$result['cached'] = $this->cache_set( $url, $params, $result, $options['cache_expiration'] );
				} else {
					$result['cached'] = false;
				}
    		}
		} else {
			$data = json_encode( $params );
			$result = $this->http_request( $url, $data, $headers, $method, $options );
			$result['from_cache'] = false;
			$result['cached'] = false;
		}

		if ( isset( $options['is_redo'] ) && $options['is_redo'] === true ) {
			$result['is_redo'] = true;
		} else {
			$result['is_redo'] = false;
		}

		return $result;
	}

	/**
	* Make the HTTP request. Wrapper around curl().
	*
	* @param string $url
	*   Path to make request from.
	* @param array $data
	*   The request body.
	* @param array $headers
	*   Request headers to send as name => value.
	* @param string $method
	*   Method to initiate the call, such as GET or POST. Defaults to GET.
	* @param array $options
	*   This is the options array from the api_http_request method
	*
	* @return array
	*   Salesforce response object.
	*/
	protected function http_request( $url, $data, $headers = array(), $method = 'GET', $options = array() ) {
		// Build the request, including path and headers. Internal use.
		$curl = curl_init();
		curl_setopt( $curl, CURLOPT_URL, $url );
		curl_setopt( $curl, CURLOPT_RETURNTRANSFER, TRUE );
		curl_setopt( $curl, CURLOPT_FOLLOWLOCATION, TRUE );
		if ( $headers !== false ) {
			curl_setopt( $curl, CURLOPT_HTTPHEADER, $headers );
		} else {
			curl_setopt( $curl, CURLOPT_HEADER, false );
		}

		if ( $method === 'POST' ) {
			curl_setopt( $curl, CURLOPT_POST, TRUE );
			curl_setopt( $curl, CURLOPT_POSTFIELDS, $data );
		}
		$json_response = curl_exec( $curl ); // this is possibly gzipped json data
        if ( ( ord( $json_response[0] ) == 0x1f ) && ( ord( $json_response[1] ) == 0x8b ) ) {
            // skip header and ungzip the data
            $json_response = gzinflate( substr( $json_response, 10 ) );
        }
		$code = curl_getinfo( $curl, CURLINFO_HTTP_CODE );
		$data = json_decode( $json_response, true ); // decode it into an array

		// don't use the exception if the status is 200 or if it just needs a refresh token (salesforce uses 401 for this)
		if ( $code !== 200 && $code !== 401 ) {
			$curl_error = curl_error( $curl );
			if ( $curl_error !== '' ) {
				throw new SalesforceException( $curl_error );
			} else if ( $data[0]['errorCode'] !== '' ) { // salesforce uses this structure to return errors
				//throw new SalesforceException( $data[0]['message'], -1, $code );
				throw new SalesforceException( esc_html__( 'URL: ' . $url . ' Message: ' . $data[0]['message'] . '  Code: ' . $code, $this->text_domain ) );
			}
		}

		curl_close( $curl );

		return array( 'json' => $json_response, 'code' => $code, 'data' => $data );
	}

	/**
	* Get the API end point for a given type of the API.
	*
	* @param string $api_type
	*   E.g., rest, partner, enterprise.
	*
	* @return string
	*   Complete URL endpoint for API access.
	*/
	public function get_api_endpoint( $api_type = 'rest' ) {
		// Special handling for apexrest, since it's not in the identity object.
		if ( $api_type == 'apexrest' ) {
			$url = $this->get_instance_url() . '/services/apexrest/';
		} else {
			$identity = $this->get_identity();
			$url = str_replace( '{version}', $this->rest_api_version, $identity['urls'][$api_type] );
			if ( $identity == '' ) {
				$url = $this->get_instance_url() . '/services/data/v' . $this->rest_api_version . '/';
			}
		}
		return $url;
	}

	/**
	* Get the SF instance URL. Useful for linking to objects.
	*/
	public function get_instance_url() {
		return get_option( 'salesforce_api_instance_url', '' );
	}

	/**
	* Set the SF instanc URL.
	*
	* @param string $url
	*   URL to set.
	*/
	protected function set_instance_url( $url ) {
		update_option( 'salesforce_api_instance_url', $url );
	}

	/**
	* Get the access token.
	*/
	public function get_access_token() {
		return get_option( 'salesforce_api_access_token', '' );
	}

	/**
	* Set the access token.
	*
	* It is stored in session.
	*
	* @param string $token
	*   Access token from Salesforce.
	*/
	protected function set_access_token( $token ) {
		update_option( 'salesforce_api_access_token', $token );
	}

	/**
	* Get refresh token.
	*/
	protected function get_refresh_token() {
		return get_option( 'salesforce_api_refresh_token', '' );
	}

	/**
	* Set refresh token.
	*
	* @param string $token
	*   Refresh token from Salesforce.
	*/
	protected function set_refresh_token( $token ) {
		update_option( 'salesforce_api_refresh_token', $token );
	}

	/**
	* Refresh access token based on the refresh token. Updates session variable.
	*
	* @throws SalesforceException
	*/
	protected function refresh_token() {
		$refresh_token = $this->get_refresh_token();
		if ( empty( $refresh_token ) ) {
		  throw new SalesforceException( esc_html__( 'There is no refresh token.', $this->text_domain ) );
		}

		$data = array(
		  'grant_type' => 'refresh_token',
		  'refresh_token' => $refresh_token,
		  'client_id' => $this->consumer_key,
		  'client_secret' => $this->consumer_secret,
		);

		$url = $this->login_url . $this->token_path;
		$headers = array(
		  // This is an undocumented requirement on Salesforce's end.
		  'Content-Type' => 'Content-Type: application/x-www-form-urlencoded',
		  'Accept-Encoding' => 'Accept-Encoding: gzip, deflate',
		  'Authorization' => 'Authorization: OAuth ' . $this->get_access_token(),
		);
		$headers = false;
		$response = $this->http_request( $url, $data, $headers, 'POST' );

		if ( $response['code'] != 200 ) {
		  // @TODO: Deal with error better.
		  throw new SalesforceException( esc_html__( 'Unable to get a Salesforce access token.', $this->text_domain ), $response['code'] );
		}

		$data = $response['data'];

		if ( isset($data['error'] ) ) {
		  throw new SalesforceException( $data['error_description'], $data['error'] );
		}

		$this->set_access_token( $data['access_token'] );
		$this->set_identity( $data['id'] );
		$this->set_instance_url( $data['instance_url'] );
	}

	/**
	* Retrieve and store the Salesforce identity given an ID url.
	*
	* @param string $id
	*   Identity URL.
	*
	* @throws SalesforceException
	*/
	protected function set_identity( $id ) {
		$headers = array(
		  'Authorization' => 'Authorization: OAuth ' . $this->get_access_token(),
		  //'Content-type' => 'application/json',
		  'Accept-Encoding' => 'Accept-Encoding: gzip, deflate'
		);
		$response = $this->http_request( $id, NULL, $headers );
		if ( $response['code'] != 200 ) {
		  throw new SalesforceException( esc_html__( 'Unable to access identity service.', $this->text_domain ), $response['code'] );
		}
		$data = $response['data'];
		update_option( 'salesforce_api_identity', $data );
	}

	/**
	* Return the Salesforce identity, which is stored in a variable.
	*
	* @return array
	*   Returns FALSE if no identity has been stored.
	*/
	public function get_identity() {
		return get_option( 'salesforce_api_identity', FALSE );
	}

	/**
	* OAuth step 1: Redirect to Salesforce and request and authorization code.
	* todo: probably need to make this just print the url
	*/
	public function get_authorization_code() {
		$url = add_query_arg( 
		    array( 
		        'response_type' => 'code',
		        'client_id' => $this->consumer_key,
		        'redirect_uri' => $this->redirect_url(),
		    ), 
		    $this->login_url . $this->authorize_path
		);
		return $url;
	}

	/**
	* OAuth step 2: Exchange an authorization code for an access token.
	*
	* @param string $code
	*   Code from Salesforce.
	*/
	public function request_token( $code ) {
		$data = array(
		  'code' => $code,
		  'grant_type' => 'authorization_code',
		  'client_id' => $this->consumer_key,
		  'client_secret' => $this->consumer_secret,
		  'redirect_uri' => $this->redirect_url(),
		);

		$url = $this->login_url . $this->token_path;
		$headers = array(
		  // This is an undocumented requirement on SF's end.
		  //'Content-Type' => 'application/x-www-form-urlencoded',
		  'Accept-Encoding' => 'Accept-Encoding: gzip, deflate'
		);
		$response = $this->http_request( $url, $data, $headers, 'POST' );

		$data = $response['data'];

		if ( $response['code'] != 200 ) {
		  $error = isset( $data['error_description'] ) ? $data['error_description'] : $response['error'];
		  throw new SalesforceException( $error, $response['code'] );
		}

		// Ensure all required attributes are returned. They can be omitted if the
		// OAUTH scope is inadequate.
		$required = array( 'refresh_token', 'access_token', 'id', 'instance_url' );
		foreach ( $required as $key ) {
		  if ( !isset($data[$key] ) ) {
		    return FALSE;
		  }
		}

		$this->set_refresh_token( $data['refresh_token'] );
		$this->set_access_token( $data['access_token'] );
		$this->set_identity( $data['id'] );
		$this->set_instance_url( $data['instance_url'] );

		return TRUE;
	}

	/**
	* Helper to build the redirect URL for OAUTH workflow.
	*
	* @return string
	*   Redirect URL.
	*/
	protected function redirect_url() {
		return get_option( 'salesforce_api_callback_url', FALSE );
	}

	/**
	* @defgroup salesforce_api_calls Wrapper calls around core api_call()
	*/

	/**
	* Available objects and their metadata for your organization's data.
	*
	* @param array $conditions
	*   Associative array of filters to apply to the returned objects. Filters
	*   are applied after the list is returned from Salesforce.
	* @param bool $reset
	*   Whether to reset the cache and retrieve a fresh version from Salesforce.
	*
	* @return array
	*   Available objects and metadata.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function objects( $conditions = array( 'updateable' => TRUE ), $reset = FALSE ) {

	  	$result = $this->api_call( 'sobjects' );

		if (!empty( $conditions ) ) {
		  foreach ( $result['data']['sobjects'] as $key => $object ) {
		    foreach ( $conditions as $condition => $value ) {
		      if ( $object[$condition] != $value ) {
		        unset( $result['data']['sobjects'][$key] );
		      }
		    }
		  }
		}

		return $result['data']['sobjects'];
	}

	/**
	* Use SOQL to get objects based on query string.
	*
	* @param string $query
	*   The SOQL query.
	* @param boolean $all
	*   Whether this should get all results for the query
	* @param boolean $explain
	*   If set, Salesforce will return feedback on the query performance
	*
	* @return array
	*   Array of Salesforce objects that match the query.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function query( $query, $all = false, $explain = false ) {
		$search_data = [
            'q' => $query,
        ];
        if ($explain) {
            $search_data['explain'] = $search_data['q'];
            unset($search_data['q']);
        }
        // all is a search through deleted and merged data as well
        if ($all) {
            $path = 'queryAll';
        } else {
            $path = 'query';
        }
		$result = $this->api_call( $path . '?' . http_build_query( $search_data ) );
		return $result;
	}

	/**
	* Retrieve all the metadata for an object.
	*
	* @param string $name
	*   Object type name, E.g., Contact, Account, etc.
	* @param bool $reset
	*   Whether to reset the cache and retrieve a fresh version from Salesforce.
	*
	* @return array
	*   All the metadata for an object, including information about each field,
	*   URLs, and child relationships.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function object_describe( $name, $reset = FALSE ) {
		if (empty($name)) {
		  return array();
		}
  		$object = $this->api_call( "sobjects/{$name}/describe" );
		// Sort field properties, because salesforce API always provides them in a
		// random order. We sort them so that stored and exported data are
		// standardized and predictable.
		foreach( $object['fields'] as &$field ) {
			ksort( $field );
			if (!empty( $field['picklistValues'] ) ) {
				foreach( $field['picklistValues'] as &$picklist_value ) {
					ksort( $picklist_value );
				}
			}
		}

	}

	/**
	* Create a new object of the given type.
	*
	* @param string $name
	*   Object type name, E.g., Contact, Account, etc.
	* @param array $params
	*   Values of the fields to set for the object.
	*
	* @return array
	*   "id" : "001D000000IqhSLIAZ",
	*   "errors" : [ ],
	*   "success" : true
	*
	* @addtogroup salesforce_apicalls
	*/
	public function object_create( $name, $params ) {
		$options = array( 'type' => 'write' );
		return $this->api_call( "sobjects/{$name}", $params, 'POST', $options );
	}

	/**
	* Create new records or update existing records.
	*
	* The new records or updated records are based on the value of the specified
	* field.  If the value is not unique, REST API returns a 300 response with
	* the list of matching records.
	*
	* @param string $name
	*   Object type name, E.g., Contact, Account.
	* @param string $key
	*   The field to check if this record should be created or updated.
	* @param string $value
	*   The value for this record of the field specified for $key.
	* @param array $params
	*   Values of the fields to set for the object.
	*
	* @return array
	*   success:
	*     "id" : "00190000001pPvHAAU",
	*     "errors" : [ ],
	*     "success" : true
	*   error:
	*     "message" : "The requested resource does not exist"
	*     "errorCode" : "NOT_FOUND"
	*
	* @addtogroup salesforce_apicalls
	*/
	public function object_upsert( $name, $key, $value, $params ) {
		$options = array( 'type' => 'write' );
		// If key is set, remove from $params to avoid UPSERT errors.
		if (isset( $params[$key] ) ) {
		  unset( $params[$key] );
		}

		$data = $this->api_call( "sobjects/{$name}/{$key}/{$value}", $params, 'PATCH', $options );
		if ( $this->response['code'] == 300 ) {
		  $data['message'] = esc_html__( 'The value provided is not unique.', $this->text_domain );
		}
		return $data;
	}

	/**
	* Update an existing object.
	*
	* @param string $name
	*   Object type name, E.g., Contact, Account.
	* @param string $id
	*   Salesforce id of the object.
	* @param array $params
	*   Values of the fields to set for the object.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function object_update( $name, $id, $params ) {
		$options = array( 'type' => 'write' );
		$this->api_call( "sobjects/{$name}/{$id}", $params, 'PATCH', $options );
	}

	/**
	* Return a full loaded Salesforce object.
	*
	* @param string $name
	*   Object type name, E.g., Contact, Account.
	* @param string $id
	*   Salesforce id of the object.
	*
	* @return object
	*   Object of the requested Salesforce object.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function object_read( $name, $id ) {
		return $this->api_call( "sobjects/{$name}/{$id}", array(), 'GET' );
	}

	/**
	* Return a full loaded Salesforce object from External ID.
	*
	* @param string $name
	*   Object type name, E.g., Contact, Account.
	* @param string $field
	*   Salesforce external id field name.
	* @param string $value
	*   Value of external id.
	*
	* @return object
	*   Object of the requested Salesforce object.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function object_readby_external_id( $name, $field, $value ) {
		return $this->api_call( "sobjects/{$name}/{$field}/{$value}" );
	}

	/**
	* Delete a Salesforce object.
	*
	* @param string $name
	*   Object type name, E.g., Contact, Account.
	* @param string $id
	*   Salesforce id of the object.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function object_delete( $name, $id ) {
		$options = array( 'type' => 'write' );
		$this->api_call( "sobjects/{$name}/{$id}", array(), 'DELETE', $options );
	}

	/**
	* Return a list of available resources for the configured API version.
	*
	* @return array
	*   Associative array keyed by name with a URI value.
	*
	* @addtogroup salesforce_apicalls
	*/
	public function list_resources() {
		$resources = $this->api_call('');
		foreach ( $resources as $key => $path ) {
		  $items[$key] = $path;
		}
		return $items;
	}

	/**
	* Return a list of SFIDs for the given object, which have been created or
	* updated in the given timeframe. 
	*
	* @param int $start
	*   unix timestamp for older timeframe for updates. 
	*   Defaults to "-29 days" if empty.
	*
	* @param int $end
	*   unix timestamp for end of timeframe for updates. 
	*   Defaults to now if empty
	*
	* @return array
	*   return array has 2 indexes:
	*     "ids": a list of SFIDs of those records which have been created or
	*       updated in the given timeframe.
	*     "latestDateCovered": ISO 8601 format timestamp (UTC) of the last date
	*       covered in the request.
	*
	* @see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_getupdated.htm
	*
	* @addtogroup salesforce_apicalls
	*/
	public function get_updated( $name, $start = null, $end = null ) {
		if ( empty( $start ) ) {
		  $start = strtotime( '-29 days' );
		}
		$start = urlencode( gmdate( DATE_ATOM, $start ) );

		if (empty( $end ) ) {
		  $end = time();
		}
		$end = urlencode( gmdate( DATE_ATOM, $end ) );

		return $this->api_call( "sobjects/{$name}/updated/?start=$start&end=$end" );
	}


	/**
     * Check to see if this API call exists in the cache
     * if it does, return the transient for that key
     *
     * @param string $url
     * @param array $args
     * @return get_transient $cachekey
     */
	protected function cache_get( $url, $args ) {
        if ( is_array( $args ) ) {
            $args[] = $url;
            array_multisort( $args );
        } else {
            $args .= $url;
        }
    	$cachekey = md5( json_encode( $args ) );
    	return get_transient( $cachekey );
	}

	/**
     * Create a cache entry for the current result, with the url and args as the key
     *
     * @param string $url
     * @param array $args
     * @param array $data
     */
	protected function cache_set( $url, $args, $data, $cache_expiration = '' ) {
		if ( is_array( $args ) ) {
            $args[] = $url;
            array_multisort( $args );
        } else {
            $args .= $url;
        }
    	$cachekey = md5( json_encode( $args ) );
    	// cache_expiration is how long it should be stored in the cache
        // if we didn't give a custom one, use the default
    	if ( $cache_expiration === '' ) {
    		$cache_expiration = $this->options['cache_expiration'];
    	}
    	return set_transient( $cachekey, $data, $cache_expiration );
	}

	/**
     * If there is a WordPress setting for how long to keep the cache, return it and set the object property
     * Otherwise, return seconds in 24 hours
     *
     */
	private function cache_expiration() {
		$cache_expiration = get_option( 'salesforce_api_cache_expiration', 86400 );
		return $cache_expiration;
	}

}

class SalesforceException extends Exception {
}