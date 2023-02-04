# Extending API calls

Developers can modify the API calls that the plugin sends to Salesforce. For example, this could be used to route the plugin's requests through another system that handles its own logging.

## Intercept the HTTP request

Use the `object_sync_for_salesforce_http_request` hook to intercept the plugin right before it sends an HTTP request to Salesforce.

### Code example

This method's main parameter is the `$check`, which defaults to `null` and the plugin skipping it. If you use this filter, `$check` should returm data that the plugin can use as if it were a successful HTTP request. It could be advisable to log what the plugin does before you run your filter so you can mirror the things it expects.

#### Result to pass

You should ultimately create an array like this:

```php
// $data should be the result from the API, at this point. The response is expected to be like a curl response.
$result = array(
	'code' => $code, // the http response code.
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
$check = $result;
```

#### Hook

```php
/*
* @param null|array $check   Whether to short-circuit the HTTP request. Default null.
* @param string     $url     Path to make request from.
* @param array      $data    The request body.
* @param array      $headers Request headers to send as name => value.
* @param string     $method  Method to initiate the call, such as GET or POST. Defaults to GET.
* @param array      $options This is the options array from the api_http_request method.
*/
add_filter( 'object_sync_for_salesforce_http_request', 'http_reqest_intercept', 10, 1 );
function http_reqest_intercept( $check, $url, $data, $headers, $method, $options ) {
   return $check;
}
```
