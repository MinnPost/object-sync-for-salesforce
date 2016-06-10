# Salesforce REST API WordPress Library
 WordPress utility providing authenticated access to the Salesforce REST API for use in other plugins.

 This library is somewhat based on [Tim Whitlock](https://github.com/timwhitlock)'s [Twitter API WordPress Library](https://github.com/timwhitlock/wp-twitter-api). Some Salesforce wrapping is derived from [Michael Corrigan](https://github.com/mcorrigan/)'s [Salesforce REST API PHP Wrapper](https://github.com/mcorrigan/salesforce-rest-api-php-wrapper/). The structure here strives to use classes whenever possible, so the methods are quite different.

 ** This library is not yet ready for use. Still needs to bring in actual Salesforce methods, other than just authenticating. **

## Features

- Uses the Salesforce REST API
- Connects to Salesforce in the WordPress admin
- Provides a common Salesforce API client that any plugin can use
- Uses WordPress utilities where possible
- todo: put back some caching

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
    require_once SALESFORCE_API_PATH . 'salesforce-rest-api-wrapper.php';
} else if( ! function_exists('salesforce_api_get') ){
    require_once dirname(__FILE__) . '/api/salesforce-rest-api-wrapper.php';
}
```

Then call the library like this:

```php
$salesforce_api = new Salesforce_REST_API();
```

### In the plugin folder

Store this repository's contents in each plugin that needs to access the Salesforce API. Keeping it up to date may be easier by using a submodule. Ex:

    git submodule add https://github.com/minnpost/wp-salesforce-api.git \
      wp-content/plugins/plugin-name/api

## Authentication

Once the plugin is installed and loaded, you can link it with a Salesforce account as follows:

1. Create an App in Salesforce. Salesforce provides [some instructions](https://developer.salesforce.com/page/Getting_Started_with_the_Force.com_REST_API?language=en#Setup) for this (ignore the Java).
2. Salesforce also has [a tutorial](http://developer.force.com/cookbook/recipe/interact-with-the-forcecom-rest-api-from-php) about basic API interactions with PHP that may be helpful alongside the first.
3. Get the Consumer key and consumer secret (the article in step 1 shows where these can be found).
4. Log into the WordPress admin and go to Settings > Salesforce API.
5. On the Settings tab, fill out the fields and click 'Save settings'.
6. On the Authorize tab, click the 'Connect to Salesforce' button and follow the prompts.

## Salesforce Client

To check whether the user has authenticated the plugin and configured the oAuth tokens you can use the following function.

todo: document the methods