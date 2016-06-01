# Salesforce REST API WordPress Library
 WordPress utility providing authenticated access to the Salesforce REST API for use in other plugins.

 This library is derived from [Tim Whitlock](https://github.com/timwhitlock)'s [Twitter API WordPress Library](https://github.com/timwhitlock/wp-twitter-api).

## Features

- Uses the Salesforce REST API
- Connects to Salesforce in the WordPress admin
- Provides a common Salesforce API client that any plugin can use
- Optional caching of API responses
- Uses WordPress utilities where possible

## Example plugin

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

## Salesforce Client