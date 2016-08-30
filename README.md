# Salesforce REST API

Defines an API that enables WordPress to interact with the Salesforce REST API. This is based on the [Drupal Salesforce Suite](https://github.com/thinkshout/salesforce) (version 7.x-3.x-dev), but strives to use WordPress conventions rather than Drupal's whenever possible.

## About

This plugin creates a mapping functionality between Salesforce objects and WordPress content types. For any supported WordPress content types (e.g. post, page, user, or any custom content type in your installation), you can assign Salesforce objects that will be created / updated when the data in WordPress is saved. For each such assignment, you choose which WordPress and Salesforce fields should be mapped to one another.

This suite also includes an API architecture which allows for additional plugins to be easily plugged in (e.g. for webforms, contact form submits, etc).
  
For a more detailed description of each component class, see below.

## Requirements

1. You need a Salesforce account. Developers can register at [http://www.developerforce.com/events/regular/registration.php](http://www.developerforce.com/events/regular/registration.php)
2. You will need to create a remote application/connected app for authorization. In Salesforce go to Your Name > Setup > Create > Apps then create a new Connected App. Set the callback URL to: `https://<your site>/salesforce/oauth_callback` (must use SSL)

    Select at least 'Perform requests on your behalf at any time' for OAuth Scope as well as the appropriate other scopes for your application.

    Additional information: 
    + [https://help.salesforce.com/help/doc/en/remoteaccess_about.htm](https://help.salesforce.com/help/doc/en/remoteaccess_about.htm)
    + [https://developer.salesforce.com/page/Getting_Started_with_the_Force.com_REST_API?language=en#Setup](https://developer.salesforce.com/page/Getting_Started_with_the_Force.com_REST_API?language=en#Setup)
    + [http://developer.force.com/cookbook/recipe/interact-with-the-forcecom-rest-api-from-php](http://developer.force.com/cookbook/recipe/interact-with-the-forcecom-rest-api-from-php)
    + [https://petewarden.com/2010/10/29/how-to-use-the-new-salesforce-rest-api-from-php/](https://petewarden.com/2010/10/29/how-to-use-the-new-salesforce-rest-api-from-php/)

3. Your site needs to be SSL enabled to authorize the remote application using OAUTH.
4. If using the SOAP API, PHP needs to be compiled with SOAP web services and
  OpenSSL support, as per:

  - http://php.net/soap
  - http://php.net/openssl

## Classes

Classes are listed in the order that they are loaded by the plugin.

### Activate & Deactivate (activate, deactivate)

These classes create or delete the plugin's custom database tables. Tables are:

1. `wp_salesforce_field_map`: Given WordPress and Salesforce objects, map their corresponding fields (in an array) to each other. This sets which fields the two systems sync, whether it happens asynchronously, what order to use if there are conflicts, and whether to sync WordPress drafts of the object.
2. `wp_salesforce_object_map`: Map individual object items between WordPress and Salesforce, and save the dates and API messages when they are last imported and exported.

The Deactivate class also stops recurring tasks created by the `schedule` class, and deletes the custom post type for logging if it exists.


### Logging (logging)

This class extends the [WP Logging Class](https://github.com/pippinsplugins/WP-Logging) to log plugin-specific events. The main class is stored in the /vendor/wp-logging folder, which we need to somehow tie into this plugin. Our extension does a few things:

1. Force a type of 'salesforce' on all logs this plugin creates.
2. Get logging-related options configured by the `admin` class.
3. Setup new log entries based on the plugin's settings, including user-defined.
4. Retrieve log entries related to this plugin.


#### Salesforce Mapping (salesforce_mapping)

Map WordPress content (including users) to Salesforce fields, including field level mapping.

1. This class defines important values for each triggering event (create, edit, delete from both WordPress and Salesforce), how to identify which direction an object should use (WordPress, Salesforce, or sync), and data tables in WordPress. This class is available to the `wordpress`, `salesforce`, `schedule`, `salesforce_push`, `salesforce_pull`, and `admin` classes.
2. There is a basic create/read/update/delete setup, including loading all results or a subset. Results can also be loaded by specific conditions, or by WordPress or Salesforce IDs.


### Wordpress (wordpress)

This class handles getting and setting WordPress core data.

1. Load `wpdb` object that other plugin classes can use
2. Get information, including content and metadata table structures, about all objects available in WordPress, including custom post types.
3. Get data about objects based on their table structures and make it available to the plugin.
4. Store and retrieve cache data.


### Salesforce (salesforce)

OAUTH2 authorization and wrapper around the Salesforce REST API. Methods support:

1. Setup required parameters for all API calls
2. Retrieving data from the Salesforce organization: versions available, objects and resources available and their metadata, identity of the logged in Salesforce user.
3. The full OAUTH2 authorization flow, including refreshing the token when it expires.
3. API calls for SOQL queries, CRUD operations on objects using PHP curl.
4. Finding updated objects.
5. Pass data from all read calls to the `wordpress` class for caching if it is enabled, or storage as a transient in `wp_options`.


### Schedule (schedule)

This class extends the [WP Background Processing](https://github.com/A5hleyRich/wp-background-processing) to schedule recurring tasks with more options than the `wp_cron` provided by WordPress Core. The main class is stored in the /vendor/wp-background-processing folder, which we need to somehow tie into this plugin. Our extension does a few things:

1. Add a series of intervals at which tasks can run (5 minutes, 10 minutes, 15 minutes, 30 minutes, 45 minutes, 3 hours).
2. Get a scheduled task and its contents.
3. Create a scheduled task.
4. Perform actions on the data contained in the task. We use this to send the data back to the `salesforce_push` or `salesforce_pull` classes, depending on which one called it.
5. Allow for things to happen upon completion of a task.

This class still needs some work to make it configurable, and hopefully to have multiple queues running at the same time so different parts of the plugin can use it. It's unclear how possible this is.


### Salesforce Push (salesforce_push)

Push WordPress data into Salesforce according to the mapping settings, including whether it should be asynchronous or not.

1. Add hooks for create, update, delete of WordPress objects based on the WordPress -> Salesforce fieldmaps stored in the `salesforce_mapping` class.
2. For each object type, get its data in an array to pass to Salesforce.
3. Find out what kind of operation Salesforce needs - delete, upsert, create, or update - and format the WordPress data accordingly.
4. Send the data - mapped according to the fieldmap - to the `salesforce` class for sending to the Salesforce REST API.


### Admin (admin)

This class controls and renders the admin functionality of the plugin. Its methods should, when possible, read and write data from and to other classes rather than directly.

The admin section is divided into tabs:

1. Settings
    - The settings can be defined in `wp-config.php` as constants, or added to the database on this tab).
    - Settings are required to connect to Salesforce, pick an API version, switch between production and sandbox instances, and also define the callback URL as WordPress maintains it.
2. Authorize
    - If WordPress has not been authorized to connect to Salesforce, this tab will have a button to do so. It will use the settings from the Settings tab, and attempt to make a connection, after which it will return to this tab.
    - If it is authorized, there is a disconnect button, and also a couple of demo API calls. One shows the available versions (this does not require authorization), and the other shows a list of up to 100 Contacts from Salesforce.
    - This tab also shows what the Salesforce class is doing: that is, whether it loaded its data from the WordPress cache, and whether it had to refresh the Salesforce token or not. This helps understand how fast different things are happening, and what functionality works in your environment.
4. Fieldmaps
    - This tab lists all fieldmaps that have been created between WordPress and Salesforce objects, and allows for editing, cloning, or deleting them. Export doesn't currently do anything.
    - New fieldmaps can also be added. They require a label, a WordPress object, and a Salesforce object. Fields to map are displayed based on what fields each object has, after the object is chosen.

### Classes Todo

#### Salesforce Pull (salesforce_pull)
  Pull Salesforce object updates into WordPress.

#### Salesforce Soap (salesforce_soap)

Lightweight wrapper around the SOAP API, using the OAUTH access token, to fill in functional gaps missing in the REST API. Will require the Salesforce PHP Toolkit, if/when we choose to do it.

## API

This plugin will aim to reproduce at least the hooks provided by the Drupal suite, so that other WordPress plugins can build on top of them.

Current hooks include:

### Filters

- `salesforce_rest_api_push_object_allowed`: allow other plugins to prevent a push per-mapping.
- `salesforce_rest_api_find_object_match`: allow other plugins to modify the $salesforce_id string here

### Actions

- `salesforce_rest_api_push_fail`: what to do if a push to Salesforce fails
- `salesforce_rest_api_push_success`: what to do if a push to Salesforce is successful

TODO hooks include:

- `hook_salesforce_push_params_alter`: change what parameters are being sent to Salesforce before syncing occurs
- `hook_salesforce_mapping_entity_uris_alter`: provide URLs manually for object types. Drupal does this within the salesforce_mapping module
- `hook_salesforce_pull_entity_value_alter`: change the value being put into the CMS after getting it from Salesforce
- `hook_salesforce_query_alter`: change a SOQL query before it gets sent to Salesforce

## Notes

## Changelog