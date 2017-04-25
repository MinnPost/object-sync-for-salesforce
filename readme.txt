=== Object Sync for Salesforce ===
Contributors: jonathanstegall, minnpost
Tags: salesforce
Requires at least: 4.5.3
Tested up to: 4.6
Stable tag: 0.0.1
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

This is a WordPress plugin that implements mapping and syncing between Salesforce objects and WordPress objects. It is based on the [Drupal Salesforce Suite](https://github.com/thinkshout/salesforce) (version 7.x-3.x-dev), but strives to use WordPress conventions rather than Drupal's whenever possible.

== Description ==

This plugin creates a mapping functionality between Salesforce objects and WordPress content types. For any supported WordPress content types (e.g. post, page, user, or any custom content type in your installation), you can assign Salesforce objects that will be created / updated when the data in WordPress is saved. For each such assignment, you choose which WordPress and Salesforce fields should be mapped to one another.

This plugin also includes API hooks that allow for additional plugins to modify what data the plugin is working with, or what happens upon specific events.

== Installation ==

1. Upload the `object-sync-for-salesforce` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Create a Salesforce account if you don't already have one. Developers can register at [http://www.developerforce.com/events/regular/registration.php](http://www.developerforce.com/events/regular/registration.php)
4. In Salesforce, create a remote application/connected app for authorization. In Salesforce, go to Your Name > Setup > Create > Apps then create a new Connected App. Set the callback URL to: `https://<your site>/wp-admin/options-general.php?page=object-sync-salesforce-admin&tab=authorize` (must use SSL). Select at least Perform requests on your behalf at any time' for OAuth Scope as well as the appropriate other scopes for your application. Many setups will also need to select 'Access and manage your data (api)' as one of these scopes.
5. Fill out the settings on the Settings tab of the Salesforce subpage of the Settings menu
6. Click the Connect to Salesforce button on the Authorize tab of the Salesforce subpage of the Settings menu.


