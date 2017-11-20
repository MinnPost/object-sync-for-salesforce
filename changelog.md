Changelog
=========

* 1.1.2 (2017-11-20)
	* Clarify the documentation, and the code, for the following developer hooks:
		* `object_sync_for_salesforce_add_more_wordpress_types`
		* `object_sync_for_salesforce_remove_wordpress_types`
		* `object_sync_for_salesforce_wordpress_object_data`
	* Thanks to WordPress user @justanothercoder for asking about this, leading to the fix.

* 1.1.1 (2017-11-17)
	* This release removes the `screen_icon()` method from admin.php. It has been deprecated apparently since 3.8, but in 4.9 it officially throws PHP Notice messages in `WP_DEBUG` mode.

* 1.1.0 (2017-11-10)
	* This release gives users a way to clear the cached data for this plugin only, even if they are using an object cache method. Most importantly this resolves the problem of new fields being available in Salesforce or WordPress and not being visible in the list of mappable fields when creating or updating a fieldmap.

* 1.0.11 (2017-11-06)
	* Fixed a bug in which a blank `post` object was created in the event that `pull` calls were blocked, then unblocked. Thanks to GitHub user @charmoney for the report and much of the fix.
	* Fixed a bug in which `post` meta fields were not pushed to Salesforce. Also as part of this, added basic support for WooCommerce `order` post types. Thanks to WordPress user @ratputin for the report.

* 1.0.10 (2017-10-10)

	* This avoids repeatedly queueing Salesforce objects by initializing rather than aggregating the queue before saving. This reduces memory use and database size significantly.
	* Plugin now updates the pull sync timestamp for the data type after every successful record queue. This provides a correct starting point for the next pull to begin in case of a fatal error.
	* Thanks to GitHub user @charmoney for the report and the pull request.

* 1.0.9 (2017-10-03)

	* This fixes a bug in which upserting a custom post type would incorrectly create a standard post, rather than the desired custom post object.

* 1.0.8 (2017-08-14)

	* This checks a mapping's configured allowed sync triggers before queueing a record for pull processing, rather than as a part of the WordPress record's create or update. This resolves an issue. Thanks to GitHub user @charmoney for the report and the pull request.
	* This release also fixes a bug related to 1.0.7, which after the fix was still incorrectly checking the `post_content` and `post_title` values.

* 1.0.7 (2017-08-01)

	* This sets up admin notices that always show above the plugin's admin tabs if: 1) the plugin is not authorized, 2) there are no fieldmaps, or 3) there is no schedule set up for the plugin. This is so users understand they have to do these things before the plugin can properly work.
	* Fixed a bug where `wp_insert_post` failed if the `post_content` or `post_title` values were not passed, but the map row was still created. This passes empty values for both fields if they aren't present. It also throws a `WP_Errror` object if either `wp_insert_post` or `wp_update_post` fail.
	* Also fixed some code formatting issues

* 1.0.6 (2017-07-05)

	* This builds a basic interface for object map rows that failed to be fully created to map objects between the two systems, and have a temporary ID for either WordPress or Salesforce.
	* If any of these rows are present in the database, it creates a Mapping Errors tab at `/wp-admin/options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors`.
	* For each row, it shows the WordPress ID, WordPress object type, Salesforce ID, and when it was created. Users are able to edit each row's WordPress and/or Salesforce ID, in case the data they need to map does actually exist, and are also able to delete each row individually in case they just want to let the plugin run again.
	* This gives users a non SQL way to manage those error rows if they ever occur, on top of the previous PR on this branch that kept them from preventing further syncing.
	* **Noteworthy change:** in `salesforce_mapping` we now filter the `$posted` array so it only contains the columns in the database table for object maps, plus the `action` parameter that we filter out later. I've verified that the various `create_object_map` methods do not contain other parameters that we need to preserve for similar use to the `action`.

* 1.0.5 (2017-06-29)

	* Fixes an inconsistent scenario in which the plugin created object map rows with a WordPress or Salesforce ID of 0 and then failed to sync new objects because of the database key. Here's how:
		- Change the wordpress_id field on the map table to be a varchar instead of an integer (updating the plugin from the wordpress repo will automatically update this, but users who update manually will need to do it manually)
		- when creating an object map between two items, plugin creates a temporary id value for whichever system does not have the item (ie a temporary wordpress id if we're on a salesforce pull action). This replaces the value of 0 that the plugin previously used before updating the database with the correct id value.
		- This way if the api fails, server goes down, whatever, that tmp id is unique down to the milisecond. The database key can stay, making sure duplicate ids do not get mapped and such, but in a worst case scenario there are rows that keep the temp id because the operation failed. They can be tracked down to when they happened and whether it was a push or pull that failed, by looking up that ID in the database.
	* Also updates documentation to be more clear about how the plugin works with data that exists prior to installation (mostly it doesn't, with some tiny manual exceptions).

* 1.0.4 (2017-06-12)

	* Fix the tested version again, as it was reverted

* 1.0.3 (2017-06-09)

	* Update the deploy file so it keeps .git, .gitignore, etc. items out of the deployed plugin

* 1.0.2 (2017-06-09)

	* Update tested WordPress version to reflect 4.8
	* Some basic preparation work for supporting the Salesforce SOAP API
	* Update dependencies

* 1.0.1 (2017-06-05)

	* made table summaries on API status page into translatable strings

* 1.0.0 (2017-05-30)

	* first stable release
