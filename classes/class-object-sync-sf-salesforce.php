<?php
/**
 * Authorize and communicate with the Salesforce REST API. This class can make read and write calls to Salesforce, and also cache the responses in WordPress.
 *
 * @class   Object_Sync_Sf_Salesforce
 * @package Object_Sync_Salesforce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Object_Sync_Sf_Salesforce class.
 */
class Object_Sync_Sf_Salesforce {

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
	 * Object_Sync_Sf_Logging class
	 *
	 * @var object
	 */
	public $logging;

	/**
	 * Object_Sync_Sf_WordPress class
	 *
	 * @var object
	 */
	public $wordpress;

	/**
	 * Path for the Salesforce authorize URL
	 *
	 * @var string
	 */
	public $authorize_path;

	/**
	 * Path for the Salesforce token URL
	 *
	 * @var string
	 */
	public $token_path;

	/**
	 * Callback URL for the Salesforce API
	 *
	 * @var string
	 */
	public $callback_url;

	/**
	 * Login URL for the Salesforce API
	 *
	 * @var string
	 */
	public $login_url;

	/**
	 * REST API version for Salesforce
	 *
	 * @var string
	 */
	public $rest_api_version;

	/**
	 * Salesforce consumer key
	 *
	 * @var string
	 */
	public $consumer_key;

	/**
	 * Salesforce consumer secret
	 *
	 * @var string
	 */
	public $consumer_secret;

	/**
	 * API call options
	 *
	 * @var array
	 */
	public $options;

	/**
	 * API success return codes
	 *
	 * @var array
	 */
	public $success_codes;

	/**
	 * API refresh return code
	 *
	 * @var int
	 */
	public $refresh_code;

	/**
	 * API success or refresh return codes
	 *
	 * @var array
	 */
	public $success_or_refresh_codes;

	/**
	 * Whether the plugin is in debug mode
	 *
	 * @var string
	 */
	public $debug;

	/**
	 * API response from Salesforce
	 *
	 * @var array
	 */
	public $response;

	/**
	 * Constructor for Salesforce class
	 */
	public function __construct() {
		$this->version       = object_sync_for_salesforce()->version;
		$this->file          = object_sync_for_salesforce()->file;
		$this->slug          = object_sync_for_salesforce()->slug;
		$this->option_prefix = object_sync_for_salesforce()->option_prefix;

		$this->login_credentials   = object_sync_for_salesforce()->login_credentials;
		$this->wordpress           = object_sync_for_salesforce()->wordpress;
		$this->logging             = object_sync_for_salesforce()->logging;
		$this->schedulable_classes = object_sync_for_salesforce()->schedulable_classes;

		$this->consumer_key     = $this->login_credentials['consumer_key'];
		$this->consumer_secret  = $this->login_credentials['consumer_secret'];
		$this->login_url        = $this->login_credentials['login_url'];
		$this->callback_url     = $this->login_credentials['callback_url'];
		$this->authorize_path   = $this->login_credentials['authorize_path'];
		$this->token_path       = $this->login_credentials['token_path'];
		$this->rest_api_version = $this->login_credentials['rest_api_version'];

		$this->options = array(
			'cache'            => true,
			'cache_expiration' => $this->cache_expiration(),
			'type'             => 'read',
		);

		$this->success_codes              = array( 200, 201, 204 );
		$this->refresh_code               = 401;
		$this->success_or_refresh_codes   = $this->success_codes;
		$this->success_or_refresh_codes[] = $this->refresh_code;

		$this->debug = get_option( $this->option_prefix . 'debug_mode', false );
		$this->debug = filter_var( $this->debug, FILTER_VALIDATE_BOOLEAN );

	}

	/**
	 * Converts a 15-character case-sensitive Salesforce ID to 18-character
	 * case-insensitive ID. If input is not 15-characters, return input unaltered.
	 *
	 * @param string $sf_id_15 15-character case-sensitive Salesforce ID.
	 * @return string 18-character case-insensitive Salesforce ID
	 */
	public static function convert_id( $sf_id_15 ) {
		if ( strlen( $sf_id_15 ) !== 15 ) {
			return $sf_id_15;
		}
		$chunks = str_split( $sf_id_15, 5 );
		$extra  = '';
		foreach ( $chunks as $chunk ) {
			$chars = str_split( $chunk, 1 );
			$bits  = '';
			foreach ( $chars as $char ) {
				$bits .= ( ! is_numeric( $char ) && strtoupper( $char ) === $char ) ? '1' : '0';
			}
			$map    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
			$extra .= substr( $map, base_convert( strrev( $bits ), 2, 10 ), 1 );
		}
		return $sf_id_15 . $extra;
	}

	/**
	 * Given a Salesforce ID, return the corresponding SObject name. (Based on keyPrefix from object definition,
	 *
	 * @see https://developer.salesforce.com/forums/?id=906F0000000901ZIAQ )
	 *
	 * @param string $sf_id 15- or 18-character Salesforce ID.
	 * @return string sObject name, e.g. "Account", "Contact", "my__Custom_Object__c" or false if no match could be found.
	 */
	public function get_sobject_type( $sf_id ) {
		$objects = $this->objects(
			array(
				'keyPrefix' => substr( $sf_id, 0, 3 ),
			)
		);
		if ( 1 === count( $objects ) ) {
			// keyPrefix is unique across objects. If there is exactly one return value from objects(), then we have a match.
			$object = reset( $objects );
			return $object['name'];
		}
		// Otherwise, we did not find a match.
		return false;
	}

	/**
	 * Determine if this SF instance is fully configured.
	 */
	public function is_authorized() {
		return ! empty( $this->consumer_key ) && ! empty( $this->consumer_secret ) && $this->get_refresh_token();
	}

	/**
	 * Get REST API versions available on this Salesforce organization
	 * This is not an authenticated call, so it would not be a helpful test
	 */
	public function get_api_versions() {
		$options = array(
			'authenticated' => false,
			'full_url'      => true,
		);
		return $this->api_call( $this->get_instance_url() . '/services/data', array(), 'GET', $options );
	}

	/**
	 * Make a call to the Salesforce REST API.
	 *
	 * @param string $path Path to resource.
	 * @param array  $params Parameters to provide.
	 * @param string $method Method to initiate the call, such as GET or POST. Defaults to GET.
	 * @param array  $options Any method can supply options for the API call, and they'll be preserved as far as the curl request. They get merged with the class options.
	 * @param string $type Type of call. Defaults to 'rest' - currently we don't support other types. Other exammple in Drupal is 'apexrest'.
	 * @return mixed The requested response.
	 * @throws Object_Sync_Sf_Exception The plugin's exception class.
	 */
	public function api_call( $path, $params = array(), $method = 'GET', $options = array(), $type = 'rest' ) {
		if ( ! $this->get_access_token() ) {
			$this->refresh_token();
		}
		$this->response = $this->api_http_request( $path, $params, $method, $options, $type );

		// analytic calls that are expired return 404s for some absurd reason.
		if ( $this->response['code'] && 'run_analytics_report' === debug_backtrace()[1]['function'] ) {
			return $this->response;
		}

		switch ( $this->response['code'] ) {
			// The session ID or OAuth token used has expired or is invalid.
			case $this->response['code'] === $this->refresh_code:
				// Refresh token.
				$this->refresh_token();
				// Rebuild our request and repeat request.
				$options['is_redo'] = true;
				$this->response     = $this->api_http_request( $path, $params, $method, $options, $type );
				// Throw an error if we still have bad response.
				if ( ! in_array( $this->response['code'], $this->success_codes, true ) ) {
					throw new Object_Sync_Sf_Exception( $this->response['data'][0]['message'], $this->response['code'] );
				}
				break;
			case in_array( $this->response['code'], $this->success_codes, true ):
				// All clear.
				break;
			default:
				// We have problem and no specific Salesforce error provided.
				if ( empty( $this->response['data'] ) ) {
					throw new Object_Sync_Sf_Exception( $this->response['error'], $this->response['code'] );
				}
		}

		if ( ! empty( $this->response['data'][0] ) && 1 === count( $this->response['data'] ) ) {
			$this->response['data'] = $this->response['data'][0];
		}

		if ( isset( $this->response['data']['error'] ) ) {
			throw new Object_Sync_Sf_Exception( $this->response['data']['error_description'], $this->response['data']['error'] );
		}

		if ( ! empty( $this->response['data']['errorCode'] ) ) {
			return $this->response;
		}

		return $this->response;
	}

	/**
	 * Private helper to issue an SF API request.
	 * This method is the only place where we read to or write from the cache
	 *
	 * @param string $path Path to resource.
	 * @param array  $params Parameters to provide.
	 * @param string $method Method to initiate the call, such as GET or POST. Defaults to GET.
	 * @param array  $options This is the options array from the api_call method. This is where it gets merged with $this->options.
	 * @param string $type Type of call. Defaults to 'rest' - currently we don't support other types. Other exammple in Drupal is 'apexrest'.
	 * @return array The requested data.
	 */
	protected function api_http_request( $path, $params, $method, $options = array(), $type = 'rest' ) {
		// this merge will override a value in $this->options with the one in $options parameter if there is a matching key.
		$options = array_merge( $this->options, $options );
		$url     = $this->get_api_endpoint( $type ) . $path;
		if ( isset( $options['full_url'] ) && true === $options['full_url'] ) {
			$url = $path;
		}
		$headers = array(
			'Authorization'   => 'Authorization: OAuth ' . $this->get_access_token(),
			'Accept-Encoding' => 'Accept-Encoding: gzip, deflate',
		);
		if ( 'POST' === $method || 'PATCH' === $method ) {
			$headers['Content-Type'] = 'Content-Type: application/json';
		}

		// if headers are being passed in the $options, use them.
		if ( isset( $options['headers'] ) ) {
			$headers = array_merge( $headers, $options['headers'] );
		}

		if ( isset( $options['authenticated'] ) && true === $options['authenticated'] ) {
			$headers = false;
		}
		// if this request should be cached, see if it already exists
		// if it is already cached, load it. if not, load it and then cache it if it should be cached
		// add parameters to the array so we can tell if it was cached or not.
		if ( true === $options['cache'] && 'write' !== $options['type'] ) {
			$cached = $this->wordpress->cache_get( $url, $params );
			// some api calls can send a reset option, in which case we should redo the request anyway.
			if ( is_array( $cached ) && ( ! isset( $options['reset'] ) || true !== $options['reset'] ) ) {
				$result               = $cached;
				$result['from_cache'] = true;
				$result['cached']     = true;
			} else {
				$data   = wp_json_encode( $params );
				$result = $this->http_request( $url, $data, $headers, $method, $options );
				if ( in_array( $result['code'], $this->success_codes, true ) ) {
					$result['cached'] = $this->wordpress->cache_set( $url, $params, $result, $options['cache_expiration'] );
				} else {
					$result['cached'] = false;
				}
				$result['from_cache'] = false;
			}
		} else {
			$data                 = wp_json_encode( $params );
			$result               = $this->http_request( $url, $data, $headers, $method, $options );
			$result['from_cache'] = false;
			$result['cached']     = false;
		}

		if ( isset( $options['is_redo'] ) && true === $options['is_redo'] ) {
			$result['is_redo'] = true;
		} else {
			$result['is_redo'] = false;
		}

		// it would be very unfortunate to ever have to do this in a production site.
		if ( true === $this->debug ) {
			// create log entry for the api call if debug is true.
			$status = 'debug';
			if ( isset( $this->logging ) ) {
				$logging = $this->logging;
			} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
				global $wpdb;
				$logging = new Object_Sync_Sf_Logging( $wpdb, $this->version );
			}

			// try to get the SOQL query if there was one.
			parse_str( $url, $salesforce_url_parts );

			if ( function_exists( 'array_key_first' ) ) {
				$query_key = array_key_first( $salesforce_url_parts );
			} else {
				$query_key = array_keys( $salesforce_url_parts )[0];
			}

			$is_soql_query = false;
			$query_end     = 'query?q';

			// does this API call include a SOQL query?
			// in PHP 8, there's a new str_ends_with function.
			if ( function_exists( 'str_ends_with' ) ) {
				if ( true === str_ends_with( $query_key, $query_end ) ) {
					$is_soql_query = true;
				}
			} else {
				$query_end_length = strlen( $query_end );
				$is_soql_query    = $query_end_length > 0 ? substr( $query_key, -$query_end_length ) === $query_end : true;
			}

			$title = sprintf(
				// translators: placeholders are: 1) the log status, 2) a sentence about whether there is an SOQL query included.
				esc_html__( '%1$s Salesforce API call: read the full log entry for request and response details. %2$s', 'object-sync-for-salesforce' ),
				ucfirst( esc_attr( $status ) ),
				( false === $is_soql_query ) ? esc_html__( 'There is not an SOQL query included in this request.', 'object-sync-for-salesforce' ) : esc_html__( 'There is an SOQL query included in this request.', 'object-sync-for-salesforce' )
			);

			$body = '';

			$body .= sprintf(
				// translators: placeholder is: 1) the API call's HTTP method.
				'<p><strong>' . esc_html__( 'HTTP method:', 'object-sync-for-salesforce' ) . '</strong> %1$s</p>',
				esc_attr( $method )
			);

			$body .= sprintf(
				// translators: placeholder is: 1) the API call's URL.
				'<p><strong>' . esc_html__( 'URL of API call to Salesforce:', 'object-sync-for-salesforce' ) . '</strong> %1$s</p>',
				esc_url( $url )
			);

			if ( true === $is_soql_query ) {
				$query = $salesforce_url_parts[ $query_key ];
				$soql  = urldecode( $query );
				$body .= sprintf(
					// translators: placeholder is: 1) the SOQL query that was run.
					'<h3>' . esc_html__( 'SOQL query that was sent to Salesforce', 'object-sync-for-salesforce' ) . '</h3> <p>%1$s</p>',
					'<code>' . esc_html( $soql ) . '</code>'
				);
			}

			$body .= sprintf(
				// translators: placeholder is: 1) the API call's result.
				'<h3>' . esc_html__( 'API result from Salesforce', 'object-sync-for-salesforce' ) . '</h3> <div>%1$s</div>',
				print_r( $result, true ) // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
			);

			$logging->setup(
				$title,
				$body,
				0,
				0,
				$status
			);
		}

		return $result;
	}

	/**
	 * Make the HTTP request. Wrapper around curl().
	 *
	 * @param string $url Path to make request from.
	 * @param array  $data The request body.
	 * @param array  $headers Request headers to send as name => value.
	 * @param string $method Method to initiate the call, such as GET or POST. Defaults to GET.
	 * @param array  $options This is the options array from the api_http_request method.
	 * @return array Salesforce response object.
	 */
	protected function http_request( $url, $data, $headers = array(), $method = 'GET', $options = array() ) {
		// Build the request, including path and headers. Internal use.

		/*
		 * Note: curl is used because wp_remote_get, wp_remote_post, wp_remote_request don't work. Salesforce returns various errors.
		 * todo: There is a GitHub branch attempting with the goal of addressing this: https://github.com/MinnPost/object-sync-for-salesforce/issues/94
		*/

		$curl = curl_init();
		curl_setopt( $curl, CURLOPT_URL, $url );
		curl_setopt( $curl, CURLOPT_RETURNTRANSFER, true );
		curl_setopt( $curl, CURLOPT_FOLLOWLOCATION, true );
		if ( false !== $headers ) {
			curl_setopt( $curl, CURLOPT_HTTPHEADER, $headers );
		} else {
			curl_setopt( $curl, CURLOPT_HEADER, false );
		}

		if ( 'POST' === $method ) {
			curl_setopt( $curl, CURLOPT_POST, true );
			curl_setopt( $curl, CURLOPT_POSTFIELDS, $data );
		} elseif ( 'PATCH' === $method || 'DELETE' === $method ) {
			curl_setopt( $curl, CURLOPT_CUSTOMREQUEST, $method );
			curl_setopt( $curl, CURLOPT_POSTFIELDS, $data );
		}
		$json_response = curl_exec( $curl ); // this is possibly gzipped json data.
		$code          = curl_getinfo( $curl, CURLINFO_HTTP_CODE );

		if ( ( 'PATCH' === $method || 'DELETE' === $method ) && '' === $json_response && 204 === $code ) {
			// delete and patch requests return a 204 with an empty body upon success for whatever reason.
			$data = array(
				'success' => true,
				'body'    => '',
			);
			curl_close( $curl );

			$result = array(
				'code' => $code,
			);

			$return_format = isset( $options['return_format'] ) ? $options['return_format'] : 'array';

			switch ( $return_format ) {
				case 'array':
					$result['data'] = $data;
					break;
				case 'json':
					$result['json'] = wp_json_encode( $data );
					break;
				case 'both':
					$result['json'] = wp_json_encode( $data );
					$result['data'] = $data;
					break;
			}

			return $result;
		}

		if ( ( ord( $json_response[0] ) == 0x1f ) && ( ord( $json_response[1] ) == 0x8b ) ) {
			// skip header and ungzip the data.
			$json_response = gzinflate( substr( $json_response, 10 ) );
		}
		$data = json_decode( $json_response, true ); // decode it into an array.

		// don't use the exception if the status is a success one, or if it just needs a refresh token (salesforce uses 401 for this).
		if ( ! in_array( $code, $this->success_or_refresh_codes, true ) ) {
			$curl_error = curl_error( $curl );
			if ( '' !== $curl_error ) {
				// create log entry for failed curl.
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
					global $wpdb;
					$logging = new Object_Sync_Sf_Logging( $wpdb, $this->version );
				}

				$title = sprintf(
					// translators: placeholders are: 1) the log status, 2) the HTTP status code returned by the Salesforce API request.
					esc_html__( '%1$s: %2$s: on Salesforce HTTP request', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					absint( $code )
				);

				$logging->setup(
					$title,
					$curl_error,
					0,
					0,
					$status
				);
			} elseif ( isset( $data[0]['errorCode'] ) && '' !== $data[0]['errorCode'] ) { // salesforce uses this structure to return errors
				// create log entry for failed curl.
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
					global $wpdb;
					$logging = new Object_Sync_Sf_Logging( $wpdb, $this->version );
				}

				$title = sprintf(
					// translators: placeholders are: 1) the log status, 2) the HTTP status code returned by the Salesforce API request.
					esc_html__( '%1$s: %2$s: on Salesforce HTTP request', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					absint( $code )
				);

				$body = sprintf(
					// translators: placeholders are: 1) the URL requested, 2) the message returned by the error, 3) the server code returned.
					'<p>' . esc_html__( 'URL: %1$s', 'object-sync-for-salesforce' ) . '</p><p>' . esc_html__( 'Message: %2$s', 'object-sync-for-salesforce' ) . '</p><p>' . esc_html__( 'Code: %3$s', 'object-sync-for-salesforce' ),
					esc_attr( $url ),
					esc_html( $data[0]['message'] ),
					absint( $code )
				);

				$logging->setup(
					$title,
					$body,
					0,
					0,
					$status
				);
			} else {
				// create log entry for failed curl.
				$status = 'error';
				if ( isset( $this->logging ) ) {
					$logging = $this->logging;
				} elseif ( class_exists( 'Object_Sync_Sf_Logging' ) ) {
					global $wpdb;
					$logging = new Object_Sync_Sf_Logging( $wpdb, $this->version );
				}

				$title = sprintf(
					// translators: placeholders are: 1) the log status, 2) the HTTP status code returned by the Salesforce API request.
					esc_html__( '%1$s: %2$s: on Salesforce HTTP request', 'object-sync-for-salesforce' ),
					ucfirst( esc_attr( $status ) ),
					absint( $code )
				);

				$logging->setup(
					$title,
					print_r( $data, true ), // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_print_r
					0,
					0,
					$status
				);
			} // End if() statement.
		} // End if() statement.

		curl_close( $curl );

		$result = array(
			'code' => $code,
		);

		$return_format = isset( $options['return_format'] ) ? $options['return_format'] : 'array';

		switch ( $return_format ) {
			case 'array':
				$result['data'] = $data;
				break;
			case 'json':
				$result['json'] = $json_response;
				break;
			case 'both':
				$result['json'] = $json_response;
				$result['data'] = $data;
				break;
		}

		return $result;

	}

	/**
	 * Get the API end point for a given type of the API.
	 *
	 * @param string $api_type E.g., rest, partner, enterprise.
	 * @return string Complete URL endpoint for API access.
	 */
	public function get_api_endpoint( $api_type = 'rest' ) {
		// Special handling for apexrest, since it's not in the identity object.
		if ( 'apexrest' === $api_type ) {
			$url = $this->get_instance_url() . '/services/apexrest/';
		} else {
			$identity = $this->get_identity();
			$url      = str_replace( '{version}', $this->rest_api_version, $identity['urls'][ $api_type ] );
			if ( '' === $identity ) {
				$url = $this->get_instance_url() . '/services/data/v' . $this->rest_api_version . '/';
			}
		}
		return $url;
	}

	/**
	 * Get the SF instance URL. Useful for linking to objects.
	 */
	public function get_instance_url() {
		return get_option( $this->option_prefix . 'instance_url', '' );
	}

	/**
	 * Set the SF instance URL.
	 *
	 * @param string $url URL to set.
	 */
	protected function set_instance_url( $url ) {
		update_option( $this->option_prefix . 'instance_url', $url );
	}

	/**
	 * Get the access token.
	 */
	public function get_access_token() {
		return get_option( $this->option_prefix . 'access_token', '' );
	}

	/**
	 * Set the access token.
	 * It is stored in session.
	 *
	 * @param string $token Access token from Salesforce.
	 */
	protected function set_access_token( $token ) {
		update_option( $this->option_prefix . 'access_token', $token );
	}

	/**
	 * Get refresh token.
	 */
	protected function get_refresh_token() {
		return get_option( $this->option_prefix . 'refresh_token', '' );
	}

	/**
	 * Set refresh token.
	 *
	 * @param string $token Refresh token from Salesforce.
	 */
	protected function set_refresh_token( $token ) {
		update_option( $this->option_prefix . 'refresh_token', $token );
	}

	/**
	 * Refresh access token based on the refresh token. Updates session variable.
	 *
	 * Todo: figure out how to do this as part of the schedule class
	 * This is a scheduleable class and so we could add a method from this class to run every 24 hours, but it's unclear to me that we need it. salesforce seems to refresh itself as it needs to.
	 * but it could be a performance boost to do it at scheduleable intervals instead.
	 *
	 * @throws Object_Sync_Sf_Exception The plugin's exception class.
	 */
	protected function refresh_token() {
		$refresh_token = $this->get_refresh_token();
		if ( empty( $refresh_token ) ) {
			throw new Object_Sync_Sf_Exception( esc_html__( 'There is no refresh token.', 'object-sync-for-salesforce' ) );
		}

		$data = array(
			'grant_type'    => 'refresh_token',
			'refresh_token' => $refresh_token,
			'client_id'     => $this->consumer_key,
			'client_secret' => $this->consumer_secret,
		);

		$url      = $this->login_url . $this->token_path;
		$headers  = array(
			// This is an undocumented requirement on Salesforce's end.
			'Content-Type'    => 'Content-Type: application/x-www-form-urlencoded',
			'Accept-Encoding' => 'Accept-Encoding: gzip, deflate',
			'Authorization'   => 'Authorization: OAuth ' . $this->get_access_token(),
		);
		$headers  = false;
		$response = $this->http_request( $url, $data, $headers, 'POST' );

		if ( 200 !== $response['code'] ) {
			throw new Object_Sync_Sf_Exception(
				esc_html(
					sprintf(
						__( 'Unable to get a Salesforce access token. Salesforce returned the following errorCode: ', 'object-sync-for-salesforce' ) . $response['code']
					)
				),
				$response['code']
			);
		}

		$data = $response['data'];

		if ( is_array( $data ) && isset( $data['error'] ) ) {
			throw new Object_Sync_Sf_Exception( $data['error_description'], $data['error'] );
		}

		$this->set_access_token( $data['access_token'] );
		$this->set_identity( $data['id'] );
		$this->set_instance_url( $data['instance_url'] );
	}

	/**
	 * Retrieve and store the Salesforce identity given an ID url.
	 *
	 * @param string $id Identity URL.
	 *
	 * @throws Object_Sync_Sf_Exception The plugin's exception class.
	 */
	protected function set_identity( $id ) {
		$headers  = array(
			'Authorization'   => 'Authorization: OAuth ' . $this->get_access_token(),
			// 'Content-type'  => 'application/json', todo: remove this if it's not necessary
			'Accept-Encoding' => 'Accept-Encoding: gzip, deflate',
		);
		$response = $this->http_request( $id, null, $headers );
		if ( 200 !== $response['code'] ) {
			throw new Object_Sync_Sf_Exception( esc_html__( 'Unable to access identity service.', 'object-sync-for-salesforce' ), $response['code'] );
		}
		$data = $response['data'];
		update_option( $this->option_prefix . 'identity', $data );
	}

	/**
	 * Return the Salesforce identity, which is stored in a variable.
	 *
	 * @return array Returns false if no identity has been stored.
	 */
	public function get_identity() {
		return get_option( $this->option_prefix . 'identity', false );
	}

	/**
	 * OAuth step 1: Redirect to Salesforce and request and authorization code.
	 */
	public function get_authorization_code() {
		$url = add_query_arg(
			array(
				'response_type' => 'code',
				'client_id'     => $this->consumer_key,
				'redirect_uri'  => $this->callback_url,
			),
			$this->login_url . $this->authorize_path
		);
		return $url;
	}

	/**
	 * OAuth step 2: Exchange an authorization code for an access token.
	 *
	 * @param string $code Code from Salesforce.
	 * @throws Object_Sync_Sf_Exception The plugin's exception class.
	 */
	public function request_token( $code ) {
		$data = array(
			'code'          => $code,
			'grant_type'    => 'authorization_code',
			'client_id'     => $this->consumer_key,
			'client_secret' => $this->consumer_secret,
			'redirect_uri'  => $this->callback_url,
		);

		$url      = $this->login_url . $this->token_path;
		$headers  = array(
			// This is an undocumented requirement on SF's end.
			// 'Content-Type'  => 'application/x-www-form-urlencoded', todo: remove this if it's not needed.
			'Accept-Encoding' => 'Accept-Encoding: gzip, deflate',
		);
		$response = $this->http_request( $url, $data, $headers, 'POST' );

		$data = $response['data'];

		if ( 200 !== $response['code'] ) {
			$error = isset( $data['error_description'] ) ? $data['error_description'] : $response['error'];
			throw new Object_Sync_Sf_Exception( $error, $response['code'] );
		}

		// Ensure all required attributes are returned. They can be omitted if the
		// OAUTH scope is inadequate.
		$required = array( 'refresh_token', 'access_token', 'id', 'instance_url' );
		foreach ( $required as $key ) {
			if ( ! isset( $data[ $key ] ) ) {
				return false;
			}
		}

		$this->set_refresh_token( $data['refresh_token'] );
		$this->set_access_token( $data['access_token'] );
		$this->set_identity( $data['id'] );
		$this->set_instance_url( $data['instance_url'] );

		return true;
	}

	/* Core API calls */

	/**
	 * Available objects and their metadata for your organization's data.
	 * part of core API calls. this call does require authentication, and the basic url it becomes is like this:
	 * https://instance.salesforce.com/services/data/v#.0/sobjects
	 * note: updateable is really how the api spells it
	 *
	 * @param array $conditions Associative array of filters to apply to the returned objects. Filters are applied after the list is returned from Salesforce.
	 * @param bool  $reset Whether to reset the cache and retrieve a fresh version from Salesforce.
	 * @return array Available objects and metadata.
	 */
	public function objects(
		$conditions = array(
			'updateable'  => true,
			'triggerable' => true,
		),
		$reset = false
	) {

		$options = array(
			'reset' => $reset,
		);
		$result  = $this->api_call( 'sobjects', array(), 'GET', $options );

		if ( ! empty( $conditions ) ) {
			foreach ( $result['data']['sobjects'] as $key => $object ) {
				foreach ( $conditions as $condition => $value ) {
					if ( $object[ $condition ] !== $value ) {
						unset( $result['data']['sobjects'][ $key ] );
					}
				}
			}
		}

		ksort( $result['data']['sobjects'] );

		return $result['data']['sobjects'];
	}

	/**
	 * Use SOQL to get objects based on query string. Part of core API calls.
	 *
	 * @param string $query The SOQL query.
	 * @param array  $options Allow for the query to have options based on what the user needs from it, ie caching, read/write, etc.
	 * @param bool   $all Whether this should get all results for the query.
	 * @param bool   $explain If set, Salesforce will return feedback on the query performance.
	 * @return array Array of Salesforce objects that match the query.
	 */
	public function query( $query, $options = array(), $all = false, $explain = false ) {
		$search_data = array(
			'q' => (string) $query,
		);
		if ( true === $explain ) {
			$search_data['explain'] = $search_data['q'];
			unset( $search_data['q'] );
		}
		// all is a search through deleted and merged data as well.
		if ( true === $all ) {
			$path = 'queryAll';
		} else {
			$path = 'query';
		}
		$result = $this->api_call( $path . '?' . http_build_query( $search_data ), array(), 'GET', $options );
		return $result;
	}

	/**
	 * Retrieve all the metadata for an object. Part of core API calls.
	 *
	 * @param string $name Object type name, E.g., Contact, Account, etc.
	 * @param bool   $reset Whether to reset the cache and retrieve a fresh version from Salesforce.
	 * @return array All the metadata for an object, including information about each field, URLs, and child relationships.
	 */
	public function object_describe( $name, $reset = false ) {
		if ( empty( $name ) ) {
			return array();
		}
		$options = array(
			'reset' => $reset,
		);
		$object  = $this->api_call( "sobjects/{$name}/describe", array(), 'GET', $options );
		// Sort field properties, because salesforce API always provides them in a
		// random order. We sort them so that stored and exported data are
		// standardized and predictable.
		$fields = array();
		foreach ( $object['data']['fields'] as &$field ) {
			ksort( $field );
			if ( ! empty( $field['picklistValues'] ) ) {
				foreach ( $field['picklistValues'] as &$picklist_value ) {
					ksort( $picklist_value );
				}
			}
			$fields[ $field['name'] ] = $field;
		}
		ksort( $fields );
		$object['fields'] = $fields;
		return $object;
	}

	/**
	 * Create a new object of the given type. Part of core API calls.
	 *
	 * @param string $name Object type name, E.g., Contact, Account, etc.
	 * @param array  $params Values of the fields to set for the object.
	 * @return array
	 *   json: {"id":"00190000001pPvHAAU","success":true,"errors":[]}
	 *   code: 201
	 *   data:
	 *     "id" : "00190000001pPvHAAU",
	 *     "success" : true
	 *     "errors" : [ ],
	 *   from_cache:
	 *   cached:
	 *   is_redo:
	 */
	public function object_create( $name, $params ) {
		$options = array(
			'type' => 'write',
		);
		$result  = $this->api_call( "sobjects/{$name}", $params, 'POST', $options );
		return $result;
	}

	/**
	 * Create new records or update existing records.
	 * The new records or updated records are based on the value of the specified
	 * field. If the value is not unique, REST API returns a 300 response with
	 * the list of matching records. Part of core API calls.
	 *
	 * @param string $name Object type name, E.g., Contact, Account.
	 * @param string $key The field to check if this record should be created or updated.
	 * @param string $value The value for this record of the field specified for $key.
	 * @param array  $params Values of the fields to set for the object.
	 * @return array
	 *   json: {"id":"00190000001pPvHAAU","success":true,"errors":[]}
	 *   code: 201
	 *   data:
	 *     "id" : "00190000001pPvHAAU",
	 *     "success" : true
	 *     "errors" : [ ],
	 *   from_cache:
	 *   cached:
	 *   is_redo:
	 */
	public function object_upsert( $name, $key, $value, $params ) {
		$options = array(
			'type' => 'write',
		);
		// If key is set, remove from $params to avoid UPSERT errors.
		if ( isset( $params[ $key ] ) ) {
			unset( $params[ $key ] );
		}

		// allow developers to change both the key and value by which objects should be matched.
		$key   = apply_filters( $this->option_prefix . 'modify_upsert_key', $key );
		$value = apply_filters( $this->option_prefix . 'modify_upsert_value', $value );

		$data = $this->api_call( "sobjects/{$name}/{$key}/{$value}", $params, 'PATCH', $options );
		if ( 300 === $this->response['code'] ) {
			$data['message'] = esc_html( 'The value provided is not unique.' );
		}
		return $data;
	}

	/**
	 * Update an existing object. Part of core API calls.
	 *
	 * @param string $name Object type name, E.g., Contact, Account.
	 * @param string $id Salesforce id of the object.
	 * @param array  $params Values of the fields to set for the object.
	 * @return array
	 * json: {"success":true,"body":""}
	 * code: 204
	 * data:
	 * success: 1
	 * body:
	 *   from_cache:
	 *   cached:
	 *   is_redo:
	 */
	public function object_update( $name, $id, $params ) {
		$options = array(
			'type' => 'write',
		);
		$result  = $this->api_call( "sobjects/{$name}/{$id}", $params, 'PATCH', $options );
		return $result;
	}

	/**
	 * Return a full loaded Salesforce object. Part of core API calls.
	 *
	 * @param string $name Object type name, E.g., Contact, Account.
	 * @param string $id Salesforce id of the object.
	 * @param array  $options Optional options to pass to the API call.
	 * @return object Object of the requested Salesforce object.
	 */
	public function object_read( $name, $id, $options = array() ) {
		return $this->api_call( "sobjects/{$name}/{$id}", array(), 'GET', $options );
	}

	/**
	 * Make a call to the Analytics API. Part of core API calls.
	 *
	 * @param string $name Object type name, E.g., Report.
	 * @param string $id Salesforce id of the object.
	 * @param string $route What comes after the ID? E.g. instances, ?includeDetails=True.
	 * @param array  $params Params to put with the request.
	 * @param string $method GET or POST.
	 * @return object Object of the requested Salesforce object.
	 * */
	public function analytics_api( $name, $id, $route = '', $params = array(), $method = 'GET' ) {
		return $this->api_call( "analytics/{$name}/{$id}/{$route}", $params, $method );
	}

	/**
	 * Run a specific Analytics report. Part of core API calls.
	 *
	 * @param string $id Salesforce id of the object.
	 * @param bool   $async Whether the report is asynchronous.
	 * @param bool   $clear_cache Whether the cache is being cleared.
	 * @param array  $params Params to put with the request.
	 * @param string $method GET or POST.
	 * @param string $report_cache_expiration How long to keep the report's cache result around for.
	 * @param bool   $cache_instance Whether to cache the instance results.
	 * @param string $instance_cache_expiration How long to keep the instance's cache result around for.
	 * @return object Object of the requested Salesforce object.
	 */
	public function run_analytics_report( $id, $async = true, $clear_cache = false, $params = array(), $method = 'GET', $report_cache_expiration = '', $cache_instance = true, $instance_cache_expiration = '' ) {

		$id         = $this->convert_id( $id );
		$report_url = 'analytics/reports/' . $id . '/instances';

		if ( true === $clear_cache ) {
			delete_transient( $report_url );
		}

		$instance_id = $this->wordpress->cache_get( $report_url, '' );

		// there is no stored instance id or this is synchronous; retrieve the results for that instance.
		if ( false === $async || false === $instance_id ) {

			$result = $this->analytics_api(
				'reports',
				$id,
				'?includeDetails=true',
				array(),
				'GET'
			);
			// if we get a reportmetadata array out of this, continue.
			if ( is_array( $result['data']['reportMetadata'] ) ) {
				$params = array(
					'reportMetadata' => $result['data']['reportMetadata'],
				);
				$report = $this->analytics_api(
					'reports',
					$id,
					'instances',
					$params,
					'POST'
				);
				// if we get an id from the post, that is the instance id.
				if ( isset( $report['data']['id'] ) ) {
					$instance_id = $report['data']['id'];
				} else {
					// run the call again if we don't have an instance id.
					$this->run_analytics_report( $id, true );
				}

				// cache the instance id so we can get the report results if they are applicable.
				if ( '' === $report_cache_expiration ) {
					$report_cache_expiration = $this->cache_expiration();
				}
				$this->wordpress->cache_set( $report_url, '', $instance_id, $report_cache_expiration );
			} else {
				// run the call again if we don't have a reportMetadata array.
				$this->run_analytics_report( $id, true );
			}
		} // End if() statement.

		$result = $this->api_call( $report_url . "/{$instance_id}", array(), $method );

		// the report instance is expired. rerun it.
		if ( 404 === $result['code'] ) {
			$this->run_analytics_report( $id, true, true );
		}

		// cache the instance results as a long fallback if the setting says so
		// do this because salesforce will have errors if the instance has expired or is currently running
		// remember: the result of the above api_call is already cached (or not) according to the plugin's generic settings
		// this is fine I think, although it is a bit of redundancy in this case.
		if ( true === $cache_instance ) {
			$cached = $this->wordpress->cache_get( $report_url . '_instance_cached', '' );
			if ( is_array( $cached ) ) {
				$result = $cached;
			} else {
				if ( 'Success' === $result['data']['attributes']['status'] ) {
					if ( '' === $instance_cache_expiration ) {
						$instance_cache_expiration = $this->cache_expiration();
					}
					$this->wordpress->cache_set( $report_url . '_instance_cached', '', $result, $instance_cache_expiration );
				}
			}
		}
		return $result;
	}

	/**
	 * Return a full loaded Salesforce object from External ID. Part of core API calls.
	 *
	 * @param string $name Object type name, E.g., Contact, Account.
	 * @param string $field Salesforce external id field name.
	 * @param string $value Value of external id.
	 * @param array  $options Optional options to pass to the API call.
	 * @return object Object of the requested Salesforce object.
	 */
	public function object_readby_external_id( $name, $field, $value, $options = array() ) {
		return $this->api_call( "sobjects/{$name}/{$field}/{$value}", array(), 'GET', $options );
	}

	/**
	 * Delete a Salesforce object. Part of core API calls
	 *
	 * @param string $name Object type name, E.g., Contact, Account.
	 * @param string $id Salesforce id of the object.
	 * @return array
	 */
	public function object_delete( $name, $id ) {
		$options = array(
			'type' => 'write',
		);
		$result  = $this->api_call( "sobjects/{$name}/{$id}", array(), 'DELETE', $options );
		return $result;
	}

	/**
	 * Retrieves the list of individual objects that have been deleted within the
	 * given timespan for a specified object type.
	 *
	 * @param string $type Object type name, E.g., Contact, Account.
	 * @param string $start_date Start date to check for deleted objects (in ISO 8601 format).
	 * @param string $end_date End date to check for deleted objects (in ISO 8601 format).
	 * @return mixed $result
	 */
	public function get_deleted( $type, $start_date, $end_date ) {
		$options = array(
			'cache' => false,
		); // this is timestamp level specific; we don't cache it.
		return $this->api_call( "sobjects/{$type}/deleted/?start={$start_date}&end={$end_date}", array(), 'GET', $options );
	}


	/**
	 * Return a list of available resources for the configured API version. Part of core API calls.
	 *
	 * @return array Associative array keyed by name with a URI value.
	 */
	public function list_resources() {
		$resources = $this->api_call( '' );
		foreach ( $resources as $key => $path ) {
			$items[ $key ] = $path;
		}
		return $items;
	}

	/**
	 * Return a list of SFIDs for the given object, which have been created or
	 * updated in the given timeframe. Part of core API calls.
	 *
	 * @param string $type Object type name, E.g., Contact, Account.
	 * @param int    $start unix timestamp for older timeframe for updates. Defaults to "-29 days" if empty.
	 * @param int    $end unix timestamp for end of timeframe for updates. Defaults to now if empty.
	 * @return array
	 *   return array has 2 indexes:
	 *     "ids": a list of SFIDs of those records which have been created or
	 *       updated in the given timeframe.
	 *     "latestDateCovered": ISO 8601 format timestamp (UTC) of the last date
	 *       covered in the request.
	 *
	 * @see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_getupdated.htm
	 */
	public function get_updated( $type, $start = null, $end = null ) {
		if ( empty( $start ) ) {
			$start = strtotime( '-29 days' );
		}
		$start = rawurlencode( gmdate( DATE_ATOM, $start ) );

		if ( empty( $end ) ) {
			$end = time();
		}
		$end = rawurlencode( gmdate( DATE_ATOM, $end ) );

		$options = array(
			'cache' => false,
		); // this is timestamp level specific; we don't cache it.
		return $this->api_call( "sobjects/{$type}/updated/?start=$start&end=$end", array(), 'GET', $options );
	}

	/**
	 * Given a DeveloperName and SObject Name, return the SFID of the
	 * corresponding RecordType. DeveloperName doesn't change between Salesforce
	 * environments, so it's safer to rely on compared to SFID.
	 *
	 * @param string $name Object type name, E.g., Contact, Account.
	 * @param string $devname RecordType DeveloperName, e.g. Donation, Membership, etc.
	 * @param bool   $reset whether this is resetting the cache.
	 * @return string SFID The Salesforce ID of the given Record Type, or null.
	 */
	public function get_record_type_id_by_developer_name( $name, $devname, $reset = false ) {

		// example of how this runs: $this->get_record_type_id_by_developer_name( 'Account', 'HH_Account' );.

		$cached = $this->wordpress->cache_get( 'salesforce_record_types', '' );
		if ( is_array( $cached ) && ( ! isset( $reset ) || true !== $reset ) ) {
			return ! empty( $cached[ $name ][ $devname ] ) ? $cached[ $name ][ $devname ]['Id'] : null;
		}

		$query         = new Object_Sync_Sf_Salesforce_Select_Query( 'RecordType' );
		$query->fields = array( 'Id', 'Name', 'DeveloperName', 'SobjectType' );

		$result       = $this->query( $query );
		$record_types = array();

		foreach ( $result['data']['records'] as $record_type ) {
			$record_types[ $record_type['SobjectType'] ][ $record_type['DeveloperName'] ] = $record_type;
		}

		$cached = $this->wordpress->cache_set( 'salesforce_record_types', '', $record_types, $this->options['cache_expiration'] );

		return ! empty( $record_types[ $name ][ $devname ] ) ? $record_types[ $name ][ $devname ]['Id'] : null;
	}

	/**
	 * If there is a WordPress setting for how long to keep the cache, return it and set the object property
	 * Otherwise, return seconds in 24 hours.
	 */
	private function cache_expiration() {
		$cache_expiration = $this->wordpress->cache_expiration( $this->option_prefix . 'cache_expiration', 86400 );
		return $cache_expiration;
	}

}
