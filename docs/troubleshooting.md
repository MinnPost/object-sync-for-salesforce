# Troubleshooting

## Connection and authorization issues

If you are having trouble connecting the plugin to Salesforce, there are several ways to troubleshoot. Always check your PHP error logs first.

## Missing Authorize tab

If you load the plugin's Settings screen and you do not see an Authorize tab, this means there are required fields missing from your Settings tab. You must have (at least) accurate values for Consumer Key, Consumer Secret, Callback URL, Login Base URL, Authorize URL Path, Token URL Path, and Salesforce API Version.

## Error: invalid_client_id

It can take a few minutes for a new app to be fully set up in Salesforce. If you get a `error=invalid_client_id&error_description=client%20identifier%20invalid` URL when you try to authorize with WordPress during the installation, wait a few minutes and then try again.

This error can also happen if the Salesforce Consumer Key is entered incorrectly in the plugin settings.

## Error: redirect_uri_mismatch

This error usually means the Callback URL in the plugin settings does not match the Callback URL for the app in Salesforce. Typically, the URL is something like this: https://yoursite/wp-admin/options-general.php?page=object-sync-salesforce-admin&tab=authorize.

## Error(0)

This error comes from Salesforce but the plugin is not able to detect it before the page loads. Usually it comes from one of these things:

1. The connection is down
2. The SSL is incorrect
3. The login base URL is incorrect

## Error: 400

Sometimes Salesforce returns an unhelpful 400 error (perhaps with a `grant type not supported` message). 400 errors from Salesforce mean that the request couldn't be understood. This can happen if the Login base URL setting is using your instance name (ex https://clientname.lightning.force.com) rather than the more generic https://test.salesforce.com for sandboxes and https://login.salesforce.com for production instances. Salesforce will handle redirecting the plugin to the proper instance; you should always be able to use the generic URLs.

## Error: 401

Sometimes Salesforce returns a 401 error. This means the session ID or OAuth token has expired. This can mean that you've already tried to authorize, but it failed, or that too much time has passed. Try to disconnect and reconnect the plugin. Also, make sure your Salesforce app has the proper permissions: "Access and manage your data (api)" and "Perform requests on your behalf at any time (refresh_token, offline_access)".

## Plugin redirects after logging in, but does not finish activating

If the plugin allows you to authorize in Salesforce, but does not finish activating in WordPress, consider these possible issues:

1. Insufficient app permissions in Salesforce. Make sure the app's permissions are at least "Perform requests on your behalf at any time" for OAuth Scope as well as the appropriate other scopes for your application. Many setups will also need to select "Access and manage your data (api)" as one of these scopes. If you change permissions, give Salesforce a few minutes before trying to connect again.
2. The plugin may have been unable to create its required database tables.
3. Mismatched settings between the plugin and the expected values in Salesforce.

## Fieldmap issues

If you are successfully authenticated with Salesforce, but you have a fieldmap that is not passing data, there are several ways to troubleshoot. Always check your PHP error logs first.

### Fieldmaps cannot be created

There appear to be some server configurations that have trouble creating the required database tables for this plugin to run. If you are unable to create fieldmaps, check to see if the `wp_object_sync_sf_field_map` table exists.

If this table does not exist, and you have access to create database tables directly, run the following SQL query:

```sql
CREATE TABLE `wp_object_sync_sf_field_map` (
	`id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
	`label` varchar(64) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT '',
	`name` varchar(64) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT '',
	`wordpress_object` varchar(128) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT '',
	`salesforce_object` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT '',
	`salesforce_record_types_allowed` longblob,
	`salesforce_record_type_default` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT '',
	`fields` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
	`pull_trigger_field` varchar(128) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'LastModifiedDate',
	`sync_triggers` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
	`push_async` tinyint(1) NOT NULL DEFAULT '0',
	`push_drafts` tinyint(1) NOT NULL DEFAULT '0',
	`pull_to_drafts` tinyint(1) NOT NULL DEFAULT '0',
	`weight` tinyint(1) NOT NULL DEFAULT '0',
	`version` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT '',
	PRIMARY KEY (`id`),
	UNIQUE KEY `name` (`name`),
	KEY `name_sf_type_wordpress_type` (`wordpress_object`,`salesforce_object`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

### A successfully created fieldmap does not pass data

#### Plugin configuration
- Remember to clear the plugin cache on the Fieldmaps screen.
- If you are not able to push data to Salesforce, try with asynchronous checked, and without. This will tell you if your issue is related to the plugin's cron jobs.
- To inspect your cron jobs, use the [WP Crontrol](https://wordpress.org/plugins/wp-crontrol/) plugin. Make sure the Salesforce push and/or pull jobs are running as you expect them to, and make sure to check the Schedule screen to make sure the jobs are scheduled as they should be.

#### Plugin logs
- Make sure to use the Log Settings screen to configure logs. Once enabled, they are added to a custom post type called Logs in the WordPress menu.
- If the plugin tries to create or update data, but WordPress or Salesforce encounter errors, the plugin will always try to create a log entry. If you see entries, review the title and content of each.

#### Plugin mapping errors
- If the plugin fails in the middle of creating a map between two objects, a row may be created on the Mapping Errors screen. If it is a push error, it will tell you the WordPress object ID it was trying to map. If it is a pull error, it will tell you the Salesforce ID. **You should not leave these entries.**
