# Object Sync for Salesforce

[![Build Status](https://travis-ci.org/MinnPost/object-sync-for-salesforce.svg?branch=master)](https://travis-ci.org/MinnPost/object-sync-for-salesforce) [![Code Climate](https://codeclimate.com/github/MinnPost/object-sync-for-salesforce/badges/gpa.svg)](https://codeclimate.com/github/MinnPost/object-sync-for-salesforce)

This is a WordPress plugin that implements mapping and syncing between Salesforce objects and WordPress objects. It is based on the [Drupal Salesforce Suite](https://github.com/thinkshout/salesforce) (version 7.x-3.x-dev), but strives to use WordPress conventions rather than Drupal's whenever possible.

Below is summary information, but you can also access [full documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/readme.md).

## About

This plugin creates a mapping functionality between Salesforce objects and WordPress content types. For any supported WordPress content types (e.g. post, page, user, or any custom content type in your installation), you can assign Salesforce objects that will be created / updated when the data in WordPress is saved, and the WordPress objects can be created / updated when the data in Salesforce is saved. Both of these directions act upon any matching data that is created after the plugin is installed. For each such assignment, you choose which WordPress and Salesforce fields should be mapped to one another.

This plugin also includes API hooks that allow for additional plugins to modify what data the plugin is working with, or what happens upon specific events.

For a more detailed description of each component class, see below.

## Why use this plugin

This plugin is useful in a different way than other options for connecting WordPress and Salesforce because it is capable of syncing the full structure of both systems, using the capabilities of both the **WordPress database object** and the **Salesforce REST API** to create, read, update, and delete data in either system and keep it in sync with the other.

But there are other sync options as well, depending on what features you need and what capabilities you have. Always use what fits your need.

Some other options:

- [WordPress-to-Lead for Salesforce CRM](https://appexchange.salesforce.com/listingDetail?listingId=a0N30000003GxgkEAC) can be installed through the Salesforce AppExchange. It allows you to run a contact form which users on your WordPress site can submit, and the results are added to Salesforce as a Lead object.
- [Brilliant Web-to-Lead for Salesforce](https://wordpress.org/plugins/salesforce-wordpress-to-lead/) can be installed through the WordPress plugin directory. This is rather similar to the first option, but is a bit more customizable. By customizable, you can select the fields in WordPress and theme it in your WordPress theme.
- [Gravity Forms Salesforce Add-on](https://wordpress.org/plugins/gravity-forms-salesforce/) can be installed through the WordPress plugin directory. It is quite powerful, as it can send form submissions from your WordPress site to Salesforce as whatever object you need. It's important to mention that this works for any form created with the [Gravity Forms](http://www.gravityforms.com/) plugin. It's also important to mention that this does not sync data back from Salesforce into Wordpress.
- **Third party integration apps** such as [Zapier](https://zapier.com/) are subscription-based, paid ways to integrate different systems, and they offer differing amounts of customizability. They will usually sync in both directions, so in this case from WordPress to Salesforce and vice versa. The only limitations of something like this are the cost over time, and the possible vulnerability of basing an integration on a third party that could, at some point, go away.
- [Visualforce](https://developer.salesforce.com/page/An_Introduction_to_Visualforce) If you are or have a Salesforce developer, you can build MVC based applications that integrate with Salesforce. It would be possible to build a system that uses, for example, the [WordPress REST API](https://developer.wordpress.org/rest-api/) to send and receive data to and from WordPress. This could be, in many ways, the flip side of what our plugin here does, but the complexity would be the same if the scope was the same.
- **Build other integrations in WordPress** this plugin focuses on the Salesforce REST API, as it covers the integration needs we have. Salesforce also has many other developer options: the SOAP API (we hope to incorporate this at some point), the Bulk API, and the Metadata API. You could possibly extend what we use in this plugin to integrate with one of these. Feel free to submit a pull request if you do!

## Requirements

1. A PHP installation of at least version 5.5.
2. SSL support.
3. A Salesforce account. Developers can register for a free Developer Edition account at [https://developer.salesforce.com/signup](https://developer.salesforce.com/signup)
4. A remote application/connected Salesforce app for authorization.

## Installation and setup

You can find a detailed [initial setup instruction](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/initial-setup.md) document for this plugin. Most users will want to install the plugin from the [WordPress plugin repository](https://wordpress.org/plugins/object-sync-for-salesforce/), and then follow the documentation for activating and configuring the plugin.

## Classes

### Object Sync for Salesforce

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

1. `wp_object_sync_sf_field_map`: Given WordPress and Salesforce objects, map their corresponding fields (in an array) to each other. This sets which fields the two systems sync, whether it happens asynchronously, what order to use if there are conflicts, and whether to sync WordPress drafts of the object.
2. `wp_object_sync_sf_object_map`: Map individual object items between WordPress and Salesforce, and save the dates and API messages when they are last imported and exported.

The `activate` class also creates a new capability called `configure_salesforce` and assigns it to the `administrator` role in WordPress, and other roles as well if the filter is used.

The `deactivate` class also stops recurring tasks created by the `schedule` class, and deletes the custom post type for logging if it exists. It also removes the `configure_salesforce` capability, and removes it from the roles used in the activate version of the filter.


### Logging (logging)

This class extends the [WP Logging Class](https://github.com/pippinsplugins/WP-Logging) to log plugin-specific events. The main class is stored in the /vendor/pippinsplugins/wp-logging folder, which we tie into this plugin with composer. Our extension to this class does a few things:

1. Force a type of 'salesforce' on all logs this plugin creates.
2. Get logging-related options configured by the `admin` class, including how often to get rid of entries.
3. Setup new log entries based on the plugin's settings, including user-defined.
4. Retrieve log entries related to this plugin.
5. Determine what capability is required to view log entries (by default this is `configure_salesforce` but it can be modified by hooks).


### Salesforce Mapping (salesforce_mapping)

Map WordPress content (including users) to Salesforce fields, including field level mapping.

1. Defines important values for each triggering event (create, edit, delete from both WordPress and Salesforce), how to identify which direction an object should use (WordPress, Salesforce, or sync), and data tables in WordPress. This class is available to the `wordpress`, `schedule`, `salesforce_push`, `salesforce_pull`, and `admin` classes.
2. Has a basic create/read/update/delete setup, including loading all results or a subset. Results can also be loaded by specific conditions, or by WordPress or Salesforce IDs.
3. Handles mapping values for the fields that should be sent to WordPress or Salesforce when a sync event happens so the data is correct.
4. Generates temporary IDs for the system that has yet to be synced (WordPress or Salesforce), and thus is used to track any sync rows that may fail to complete.

This class determines what to do when the `salesforce_push` and `salesforce_pull` classes fire events. An explanation:

#### Starting with a WordPress change

1. `salesforce_push` is used to create/update/delete objects in Salesforce, and in `salesforce_mapping`. It checks for `salesforce_pulling` transients to make sure the data did not originate in Salesforce, and it creates `salesforce_pushing` transients to indicate that data originated in WordPress.
2. If data originates in WordPress, it is sent to the `salesforce` class to be pushed to Salesforce.
3. `salesforce_pull` checks for the `salesforce_pushing` transients, and if they exist and are current, it does not send data to the `wordpress` class.

#### Starting with a Salesforce change

1. The `schedule` for `salesforce_pull` runs. If it finds new/updated/deleted records in Salesforce that relate to map objects in WordPress, it stores the data in a queue.
2. When the `schedule` runs again to process the queue, is used to create/update/delete objects in WordPress, and in `salesforce_mapping`. It checks for `salesforce_pushing` transients to make sure the data did not originate in WordPress, and it creates `salesforce_pulling` transients to indicate that data originated in Salesforce.
3. If data originates in Salesforce, it is sent to the `wordpress` class to be saved in WordPress.
4. `salesforce_push` checks for the `salesforce_pulling` transients, and if they exist and are current, it does not send data to the `salesforce` class.


### WordPress (wordpress)

This class handles getting and setting WordPress core data.

1. Get information, including content and metadata table structures, about all objects available in WordPress, including custom post types.
2. Get data about objects based on their table structures and make it available to the plugin.
3. Store and retrieve cache data.
4. Calls for CRUD operations on different types of WordPress objects using the core WordPress calls if they exist, and `wpdb` calls otherwise.


### Salesforce (salesforce)

OAUTH2 authorization and wrapper around the supported Salesforce APIs. Methods support:

1. Setup required parameters for all API calls
2. Retrieving data from the Salesforce organization: versions available, objects and resources available and their metadata, identity of the logged in Salesforce user.
3. The full OAUTH2 authorization flow, including refreshing the token when it expires.
3. API calls for SOQL queries, CRUD operations on objects using PHP curl.
4. Finding updated objects.
5. Pass data from all read calls to the `wordpress` class for caching if it is enabled, or storage as a transient in `wp_options`.


### Schedule (schedule)

This class extends the [WP Background Processing](https://github.com/A5hleyRich/wp-background-processing) class to schedule recurring tasks with more options than the `wp_cron` provided by WordPress Core. The main class is stored in the /vendor/a5hleyrich/wp-background-processing folder, which we tie into this plugin with composer.

This class is called by the individual classes that use it. Example: `salesforce_push` calls it when it pushes data to Salesforce.

Our extension does a few things:

1. Add the frequencies for each class as defined in the `admin` class to the WordPress core `schedules` array using the `cron_schedules` filter.
2. Create schedules using `wp_schedule_event` when the class is called.
3. Call other plugin classes and pass data to them for processing when a scheduled event occurs.

For this class, multiple queues can run. Each class in the `schedulable_classes` array (which can be modified by the `object_sync_for_salesforce_modify_schedulable_classes` filter) can have its own running queue with its own scheduled tasks.


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
	- Settings are required to connect to Salesforce, pick an API version, switch between production and sandbox instances, and also define the callback and token URLs as WordPress maintains them.
2. Authorize
	- If WordPress has not been authorized to connect to Salesforce, this tab will have a button to do so. It will use the settings from the Settings tab, and attempt to make a connection, after which it will return to this tab.
	- If it is authorized, there is a disconnect button, and also a couple of demo API calls. One shows the available versions (this does not require authorization), and the other shows a list of up to 100 Contacts from Salesforce.
	- This tab also shows what the Salesforce class is doing: that is, whether it loaded its data from the WordPress cache, and whether it had to refresh the Salesforce token or not. This helps understand how fast different things are happening, and what functionality works in your environment.
4. Fieldmaps
	- This tab lists all fieldmaps that have been created between WordPress and Salesforce objects, and allows for editing, cloning, or deleting them.
	- New fieldmaps can also be added. They require a label, a WordPress object, and a Salesforce object. Fields to map are displayed based on what fields each object has, after the object is chosen.
	- On the tab that lists all fieldmaps, users can clear the cache of this plugin's data, in case their data structure has changed and needs to be visible when adding or editing fieldmaps.
5. Scheduling
	- This tab defines schedule settings for each class in the `schedulable_classes` array. Each class can be run at any interval, as defined in minutes, hours, or days.
	- If you change the schedule for one of the classes, it will do its initial run immediately, and then the next time it runs will be at the updated interval.
	- This tab also shows how many items are currently in the queue for each class.
7. Mapping Errors
	- This tab only appears if there are object map rows that failed to be fully created to map objects between the two systems, and have a temporary ID for either WordPress or Salesforce. It gives a non SQL way to manage these errors.
	- Users are able to edit or delete each error row's WordPress and/or Salesforce ID, in case the data they need to map does actually exist, or if they just want to let the plugin run again.
6. Log Settings
	- This tab allows admin users to tell the plugin whether or not it should log any events. If it is enabled, it will use the `logging` class. If it is not, nothing will happen.
	- Users can set what statuses to log (error, success, and/or notice), if and how often entries should be deleted, and which events between WordPress and Salesforce should be logged.
7. Other tabs added by the `object_sync_for_salesforce_settings_tabs` filter will appear after the Log Settings tab.

### Classes Todo

#### Salesforce_Soap_Partner (salesforce_soap_partner)

Lightweight wrapper around the SOAP API, using the OAUTH access token, to fill in functional gaps missing in the REST API. Will require the Salesforce PHP Toolkit, which is available via composer. The 35-soap branch has code to facilitate this.

Currently there is a branch to pursue this functionality. [35-soap](https://github.com/MinnPost/object-sync-for-salesforce/tree/35-soap). It is partially present in master as well, but it does not currently do anything, including loading this class.

## Developer hooks

This plugin contains many hooks to allow other WordPress plugins to extend the functionality. It aims to reproduce all hooks provided by the Drupal suite. It also includes many additional hooks that give WordPress developers additional functionality.

There is a full list of all hooks, with links to each hook's documentation, in the [developer hooks documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/all-developer-hooks.md) page.

We also host [a document](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/example-extending-plugins.md) intended to list plugins that use these hooks.

## Development

If you'd like to contribute to this project, please see our [contributing guidelines](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/contributing.md). If you build other plugins that use the developer hooks, please contribute to the [list](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/example-extending-plugins.md).

## Changelog

We maintain a separate [changelog](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/changelog.md) document.

## Donate

If you'd like to support this project, MinnPost is a 501(c)(3) nonprofit news organization in Minnesota. You can make a tax-deductible donation, and we'll attach it to our open source development work, at [https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY](https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY).
