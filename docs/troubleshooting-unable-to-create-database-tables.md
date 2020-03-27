# Troubleshooting when the plugin is unable to create its required database tables

There appear to be some server configurations that have trouble creating the required database tables for this plugin to run. This plugin requires two tables: `wp_object_sync_sf_field_map` and `wp_object_sync_sf_object_map`. If `wp_` is not your database table prefix, replace that value with your prefix.

If the plugin fails to create either table but you have access to MySQL, you can use the SQL below to create the tables.

## wp_object_sync_sf_field_map

```sql
CREATE TABLE `wp_object_sync_sf_field_map` (
    `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    `label` varchar(64) NOT NULL DEFAULT '',
    `name` varchar(64) NOT NULL DEFAULT '',
    `wordpress_object` varchar(128) NOT NULL DEFAULT '',
    `salesforce_object` varchar(255) NOT NULL DEFAULT '',
    `salesforce_record_types_allowed` longblob,
    `salesforce_record_type_default` varchar(255) NOT NULL DEFAULT '',
    `fields` longtext NOT NULL,
    `pull_trigger_field` varchar(128) NOT NULL DEFAULT 'LastModifiedDate',
    `sync_triggers` text NOT NULL,
    `push_async` tinyint(1) NOT NULL DEFAULT '0',
    `push_drafts` tinyint(1) NOT NULL DEFAULT '0',
    `pull_to_drafts` tinyint(1) NOT NULL DEFAULT '0',
    `weight` tinyint(1) NOT NULL DEFAULT '0',
    `version` varchar(255) NOT NULL DEFAULT '',
    PRIMARY KEY  (`id`),
    UNIQUE KEY name (`name`),
    KEY `name_sf_type_wordpress_type` (`wordpress_object`,`salesforce_object`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

## wp_object_sync_sf_object_map

```sql
CREATE TABLE `wp_object_sync_sf_object_map` (
    `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    `wordpress_id` varchar(32) NOT NULL,
    `salesforce_id` varbinary(32) NOT NULL DEFAULT '',
    `wordpress_object` varchar(128) NOT NULL DEFAULT '',
    `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `object_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_sync` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_sync_action` varchar(128) DEFAULT NULL,
    `last_sync_status` tinyint(1) NOT NULL DEFAULT '0',
    `last_sync_message` varchar(255) DEFAULT NULL,
    PRIMARY KEY  (`id`),
    KEY wordpress_object (`wordpress_object`,`wordpress_id`),
    KEY salesforce_object (`salesforce_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```
