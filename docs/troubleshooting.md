# Troubleshooting

If you are successfully authenticated with Salesforce, but you have a fieldmap that is not passing data, there are several ways to troubleshoot.

## Fieldmaps cannot be created

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
	`weight` tinyint(1) NOT NULL DEFAULT '0',
	`version` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT '',
	PRIMARY KEY (`id`),
	UNIQUE KEY `name` (`name`),
	KEY `name_sf_type_wordpress_type` (`wordpress_object`,`salesforce_object`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

## A successfully created fieldmap does not pass data

### Plugin configuration
- Remember to clear the plugin cache on the Fieldmaps screen.
- If you are not able to push data to Salesforce, try with asynchronous checked, and without. This will tell you if your issue is related to the plugin's cron jobs.
- To inspect your cron jobs, use the [WP Crontrol](https://wordpress.org/plugins/wp-crontrol/) plugin. Make sure the Salesforce push and/or pull jobs are running as you expect them to, and make sure to check the Schedule screen to make sure the jobs are scheduled as they should be.

### Plugin logs
- Make sure to use the Log Settings screen to configure logs. Once enabled, they are added to a custom post type called Logs in the WordPress menu.
- If the plugin tries to create or update data, but WordPress or Salesforce encounter errors, the plugin will always try to create a log entry. If you see entries, review the title and content of each.

### Plugin mapping errors
- If the plugin fails in the middle of creating a map between two objects, a row may be created on the Mapping Errors screen. If it is a push error, it will tell you the WordPress object ID it was trying to map. If it is a pull error, it will tell you the Salesforce ID. **You should not leave these entries.**

### Server logs
- If you don't see any error logs in WordPress, it is always a good idea to check your server's error logs and see if PHP is encountering errors.
