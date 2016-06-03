# Salesforce REST API WordPress Library
 WordPress utility providing authenticated access to the Salesforce REST API for use in other plugins.

 This library is derived from [Tim Whitlock](https://github.com/timwhitlock)'s [Twitter API WordPress Library](https://github.com/timwhitlock/wp-twitter-api).

 ** This library is not yet ready for use. Still needs to bring in actual Salesforce methods, other than just authenticating. **

## Features

- Uses the Salesforce REST API
- Connects to Salesforce in the WordPress admin
- Provides a common Salesforce API client that any plugin can use
- Optional caching of API responses
- Uses WordPress utilities where possible

## Example plugin

Pending

## Installation

Depending on the WordPress architecture, this library can be used in one of two ways:

1. Tell WordPress where the library is stored, either in the database or with a constant in `wp-config.php`. Example: in a `wp-content/plugins/wp-salesforce-api` folder. With this method, the library can be included by any installed plugins, as long as they have access to the folder.
2. Include it in the plugin (or plugins) that need to use it. Example: `wp-content/plugins/plugin-name/api`. This is best if there is only one plugin that needs to use the library, as there could otherwise be many copies of the same code.

### Single location

In `wp-config.php`, use this code:

```php
if ( !defined('ABSPATH') )
    define('ABSPATH', dirname(__FILE__) . '/');

define('SALESFORCE_API_PATH', ABSPATH . '/wp-content/plugins/wp-salesforce-api/');
```

In your plugin file, use this code:

```php
if ( defined( 'SALESFORCE_API_PATH' ) ) {
    require_once SALESFORCE_API_PATH . 'salesforce-api.php';
} else if( ! function_exists('salesforce_api_get') ){
    require_once dirname(__FILE__) . '/api/salesforce-api.php';
}
```

### In the plugin folder

Store this repository's contents in each plugin that needs to access the Salesforce API. Keeping it up to date may be easier by using a submodule. Ex:

    git submodule add https://github.com/minnpost/wp-salesforce-api.git \
      wp-content/plugins/plugin-name/api

## Authentication

Once the plugin is installed and loaded, you can link it with a Salesforce account as follows:

- Create an App in Salesforce (find instructions for this)
- Get the Consumer key and consumer secret
- Log into WordPress admin and go to Settings > Salesforce API
- Enter the consumer key and secret and click 'Save settings'
- Click the 'Connect to Salesforce' button and follow the prompts.

## Salesforce Client

To check whether the user has authenticated the plugin and configured the oAuth tokens you can use the following function.

#### salesforce_api_configured

`bool salesforce_api_configured()` Returns True if the user has authenticated the plugin and configured the necessary settings.

The following functions are available from anywhere as soon as the plugin is authenticated. They all operate as the Salesforce account you connected in your admin area.

#### salesforce_api_get
`array salesforce_api_get ( string $path [, array $args ]  )`  
GETs data from the Salesforce API, returning the raw unserialized data.

`$path` is any Salesforce API method, e.g. `'users/show'` or `'statuses/user_timeline'`  
`$args` is an associative array of parameters, e.g. `array('screen_name'=>'timwhitlock')`

Note that neither the path nor the arguments are validated.

#### salesforce_api_post
`array salesforce_api_post ( string $path [, array $args ]  )`  
As above, but POSTs data to the Salesforce API.

#### salesforce_api_enable_cache
`SalesforceApiClient salesforce_api_enable_cache( int $ttl )`  
Enable caching of Salesforce response data for `$ttl` seconds.

#### salesforce_api_disable_cache
`SalesforceApiClient salesforce_api_disable_cache( )`  
Disables caching of responses. Caching is disabled by default.