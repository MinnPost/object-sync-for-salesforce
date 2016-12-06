# Salesforce REST API

Implements a mapping functionality between Salesforce objects and WordPress objects. This is based on the [Drupal Salesforce Suite](https://github.com/thinkshout/salesforce) (version 7.x-3.x-dev), but strives to use WordPress conventions rather than Drupal's whenever possible.

## About

This plugin creates a mapping functionality between Salesforce objects and WordPress content types. For any supported WordPress content types (e.g. post, page, user, or any custom content type in your installation), you can assign Salesforce objects that will be created / updated when the data in WordPress is saved. For each such assignment, you choose which WordPress and Salesforce fields should be mapped to one another.

This plugin also includes API hooks that allow for additional plugins to modify what data the plugin is working with, or what happens upon specific events.
  
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

### Salesforce REST API

This is the plugin's main class. It does a few things:

1. Load the `wpdb` object and make it available to the other classes.
2. Load all the other classes and pass them around to each other in the correct order.
3. Create a Settings link on the plugin list screen.
4. Load CSS and JavaScript for the admin screens.
5. Get Salesforce login credentials.
6. Provide an instance of itself that other plugins can use, especially to access the Salesforce API instance for making calls to it.
7. Define which classes can maintain their own schedule queues, and pass that array to the other classes.

Additional classes are listed in the order that they are loaded by the plugin.

### Activate & Deactivate (activate, deactivate)

These classes create or delete the plugin's custom database tables. Tables are:

1. `wp_salesforce_field_map`: Given WordPress and Salesforce objects, map their corresponding fields (in an array) to each other. This sets which fields the two systems sync, whether it happens asynchronously, what order to use if there are conflicts, and whether to sync WordPress drafts of the object.
2. `wp_salesforce_object_map`: Map individual object items between WordPress and Salesforce, and save the dates and API messages when they are last imported and exported.

The `deactivate` class also stops recurring tasks created by the `schedule` class, and deletes the custom post type for logging if it exists.


### Logging (logging)

This class extends the [WP Logging Class](https://github.com/pippinsplugins/WP-Logging) to log plugin-specific events. The main class is stored in the /vendor/wp-logging folder, which we need to somehow tie into this plugin. Our extension does a few things:

1. Force a type of 'salesforce' on all logs this plugin creates.
2. Get logging-related options configured by the `admin` class.
3. Setup new log entries based on the plugin's settings, including user-defined.
4. Retrieve log entries related to this plugin.


### Salesforce Mapping (salesforce_mapping)

Map WordPress content (including users) to Salesforce fields, including field level mapping.

1. This class defines important values for each triggering event (create, edit, delete from both WordPress and Salesforce), how to identify which direction an object should use (WordPress, Salesforce, or sync), and data tables in WordPress. This class is available to the `wordpress`, `salesforce`, `schedule`, `salesforce_push`, `salesforce_pull`, and `admin` classes.
2. There is a basic create/read/update/delete setup, including loading all results or a subset. Results can also be loaded by specific conditions, or by WordPress or Salesforce IDs.
3. Each row includes an attribute for `wordpress_data_version` and `salesforce_data_version` that keep track of which system has been changed in order to keep the data synced.

This class determines what to do when the `salesforce_push` and `salesforce_pull` classes fire events. An explanation:

#### Starting with a WordPress change

1. `salesforce_push` creates/updates/deletes an object in Salesforce and a `salesforce_mapping` row. It also increments the `wordpress_data_version` attribute on the `salesforce_mapping` row.
2. The Salesforce data change fires the `get_updated_records` method on `salesforce_pull` because the item has a new modified date according to the API call. It then sends this data to the `salesforce_pull_process_records` method, which increments the `salesforce_data_version` and compares version numbers. Since they now match, it does not send data to the `wordpress` class.

#### Starting with a Salesforce change

1. The `schedule` for `salesforce_pull` runs. It finds that a mapped object has new/updated/deleted records in Salesforce, and stores the mapped data in the queue.
2. When the `schedule` runs again, the `salesforce_pull_process_records` method increments the `salesforce_data_version` number and compares to the `wordpress_data_version`. Since it is greater, it passes its data to the `wordpress` class for processing.
3. If WordPress does process it, it increments the `wordpress_data_version` after saving data.
4. When the WordPress item changes, it fires the actions that check for created/updated/deleted data. Because the versions match, it does not send data to the `salesforce` class.


### Wordpress (wordpress)

This class handles getting and setting WordPress core data.

1. Get information, including content and metadata table structures, about all objects available in WordPress, including custom post types.
2. Get data about objects based on their table structures and make it available to the plugin.
3. Store and retrieve cache data.
4. Calls for CRUD operations on different types of WordPress objects using the core WordPress calls if they exist, and `wpdb` calls otherwise.


### Salesforce (salesforce)

OAUTH2 authorization and wrapper around the Salesforce REST API. Methods support:

1. Setup required parameters for all API calls
2. Retrieving data from the Salesforce organization: versions available, objects and resources available and their metadata, identity of the logged in Salesforce user.
3. The full OAUTH2 authorization flow, including refreshing the token when it expires.
3. API calls for SOQL queries, CRUD operations on objects using PHP curl.
4. Finding updated objects.
5. Pass data from all read calls to the `wordpress` class for caching if it is enabled, or storage as a transient in `wp_options`.


### Schedule (schedule)

This class extends the [WP Background Processing](https://github.com/A5hleyRich/wp-background-processing) class to schedule recurring tasks with more options than the `wp_cron` provided by WordPress Core. The main class is stored in the /vendor/wp-background-processing folder, which we need to somehow tie into this plugin. 

This class is called by the individual classes that use it. Example: `salesforce_push` calls it when it pushes data to Salesforce.

Our extension does a few things:

1. Add the frequencies for each class as defined in the `admin` class to the WordPress core `schedules` array using the `cron_schedules` filter.
2. Create schedules using `wp_schedule_event` when the class is called.
3. Call other plugin classes and pass data to them for processing when a scheduled event occurs.

For this class, multiple queues can run. Each class in the `schedulable_classes` array (which can be modified by the `salesforce_rest_api_modify_schedulable_classes` filter) can have its own running queue with its own scheduled tasks.


### Salesforce Push (salesforce_push)

Push WordPress data into Salesforce according to the mapping settings, including whether it should be asynchronous or not.

1. Add hooks for create, update, delete of WordPress objects based on the WordPress -> Salesforce fieldmaps stored in the `salesforce_mapping` class.
2. For each object type, get its data in an array to pass to Salesforce.
3. Find out what kind of operation Salesforce needs - delete, upsert, create, or update - and format the WordPress data accordingly.
4. Send the data - mapped according to the fieldmap - to the `salesforce` class for sending to the Salesforce REST API.
5. Call the `schedule` class, and send the data to it, if the fieldmap is asynchronous.


### Salesforce Pull (salesforce_pull)

Pull Salesforce data into WordPress according to the mapping settings. This is always asynchronous, and depends on the schedule settings.

1. When scheduled event runs, check for updated and deleted Salesforce records that are part of mapped objects in the `salesforce_mapping` class.
2. Get any data that matches the criteria and send it to the `schedule` class.
3. When the scheduled event runs again, process the data based on what kind of operation WordPress needs - delete, upsert, create, or update - and format the Salesforce data accordingly.
4. Send the data - mapped according to the fieldmap - to the `wordpress` class for working with the core WordPress CRUD methods.
5. Create an Ajax endpoint that can be called to initialize a `salesforce_pull` and handle the queue if it has data in it.


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
5. Scheduling
    - This tab defines schedule settings for each class in the `schedulable_classes` array. Each class can be run at any interval, as defined in minutes, hours, or days.
    - If you change the schedule for one of the classes, it will do its initial run immediately, and then the next time it runs will be at the updated interval.
6. Log Settings
    - This tab allows admin users to tell the plugin whether or not it should log any events. If it is enabled, it will use the `logging` class. If it is not, nothing will happen.
    - Users can set what statuses to log (error, success, and/or notice), if and how often entries should be deleted, and which events between WordPress and Salesforce should be logged.
7. Other tabs added by the `salesforce_rest_api_settings_tabs` filter will appear after the Log Settings tab.

### Classes Todo

#### Salesforce Soap (salesforce_soap)

Lightweight wrapper around the SOAP API, using the OAUTH access token, to fill in functional gaps missing in the REST API. Will require the Salesforce PHP Toolkit, if/when we choose to do it.

The Drupal module apparently requires SOAP to batch records on a push. On creating a fieldmap, it says this:

    Requires the "Salesforce SOAP (salesforce_soap)" module to be enabled, and the "Process asynchronously" option to be checked. Push items will be processed in a single batch to the Salesforce API rather than one at a time. This may be preferable if API limits are of concern, although changes are not reflected immediately in Salesforce.
    

## API

This plugin will aim to reproduce at least the hooks provided by the Drupal suite, so that other WordPress plugins can build on top of them.

Current hooks include:

### Filters

- `salesforce_rest_api_push_object_allowed`: prevent a push per-mapping.
- `salesforce_rest_api_pull_object_allowed`: prevent a pull per-mapping.
- `salesforce_rest_api_pull_params_modify`: change what parameters are being sent to WordPress before syncing occurs
- `salesforce_rest_api_push_params_modify`: change what parameters are being sent to Salesforce before syncing occurs
- `salesforce_rest_api_find_sf_object_match`: modify the $salesforce_id string here
- `salesforce_rest_api_settings_tabs`: add tabs to the Salesforce Settings screen so they can have their own Salesforce-specific sections that fit within this overall plugin.
- `salesforce_rest_api_modify_schedulable_classes`: modify the array of schedulable classes. This is the list of classes that can use the `schedule` class to run a queue of scheduled tasks.
- `salesforce_rest_api_add_more_wordpress_types`: add additional WordPress content types to the list of what can be mapped to Salesforce objects.
- `salesforce_rest_api_remove_wordpress_types`: remove WordPress content types from the list of what can be mapped to Salesforce objects. By default, we use this for the `wp_log` type that is included with this plugin.
- `salesforce_rest_api_create_custom_wordpress_item`: allow plugins to run their own create methods for adding new WordPress objects, if they cannot use built in methods.
- `salesforce_rest_api_upsert_custom_wordpress_item`: allow plugins to run their own upsert methods for checking for existence of, and then adding or updating, new WordPress objects, if they cannot use built in methods.
- `salesforce_rest_api_update_custom_wordpress_item`: allow plugins to run their own update methods for updating existing, mapped WordPress objects, if they cannot use built in methods.
- `salesforce_rest_api_delete_custom_wordpress_item`: allow plugins to run their own delete methods for deleting existing, mapped WordPress objects, if they cannot use built in methods.
- `salesforce_rest_api_set_more_user_data`: allow plugins to set more data on user objects when users are created or updated. This could be used for permissions, for example.
- `salesforce_rest_api_set_more_post_data`: allow plugins to set more data on post objects when posts are created or updated.
- `salesforce_rest_api_set_more_attachment_data`: allow plugins to set more data on attachment objects when attachments are created or updated.
- `salesforce_rest_api_set_more_term_data`: allow plugins to set more data on term objects when terms are created or updated.
- `salesforce_rest_api_set_more_comment_data`: allow plugins to set more data on comment objects when comments are created or updated.
- `salesforce_rest_api_set_initial_attachment_data`: allow plugins to add filename or parent data when creating attachment objects.
- `salesforce_rest_api_wordpress_object_fields`: when getting the fields for a WordPress object, allow plugins to add more (and also cache the array).
- `salesforce_rest_api_wordpress_object_data`: when getting the data for a WordPress object, allow plugins to add more, change the formatting, etc.

### Actions

- `salesforce_rest_api_pre_pull`: run an action immediately before WordPress data is saved
- `salesforce_rest_api_pull_fail`: what to do if a pull from Salesforce fails
- `salesforce_rest_api_pull_success`: what to do if a pull from Salesforce is successful
- `salesforce_rest_api_pre_push`: run an action immediately before Salesforce data is saved
- `salesforce_rest_api_push_fail`: what to do if a push to Salesforce fails
- `salesforce_rest_api_push_success`: what to do if a push to Salesforce is successful


## Notes

## Changelog