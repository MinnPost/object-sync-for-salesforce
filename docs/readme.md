# Object Sync for Salesforce Documentation

This is the full documentation for this plugin, extending the information in [the readme](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/README.md).

## Table of Contents

1. [Initial setup](./initial-setup.md)

    How to initially set up the plugin in both WordPress and Salesforce, including authenticating the plugin with Salesforce.

    For developers:

    - [Adding settings](./adding-settings.md)

2. [Permissions](./permissions.md)

    This plugin sets default permissions for its configuration in WordPress.

    For developers:

    - [Extending roles](./extending-roles.md)

3. [Syncing setup](./syncing-setup.md)

    Options for how often WordPress and Salesforce will attempt to sync data.

    For developers:

    - [Extending scheduling](./extending-scheduling.md)

4. [Mapping objects](./mapping.md)

    Mapping WordPress and Salesforce objects to each other.

    For developers:

    - [Extending mapping options](./extending-mapping-options.md)

5. [Pushing from WordPress to Salesforce](./push.md)

    When mapped objects in WordPress are changed in ways that apply to the plugin's triggers (as defined in the mapping documentation), that data is "pushed" from WordPress to Salesforce where it acts on relevant Salesforce data.

    For developers:

    - [Accessing the Salesforce API object](./accessing-salesforce-object.md)
    - [Extending push parameters](./extending-parameters.md#salesforce-push)
    - [Extending mapping object](./extending-mapping-object.md#salesforce-push)
    - [Extending before and after saving](./extending-before-and-after-saving.md#salesforce-push)
    - [Extending sync allowed](./extending-sync-allowed.md#push)

6. [Pulling from Salesforce to WordPress](./pull.md)

    When mapped objects in Salesforce are changed in ways that apply to the plugin's triggers (as defined in the mapping documentation), that data is "pulled" from Salesforce into WordPress where it can act on relevant WordPress data.

    For developers:

    - [Extending WordPress data modification](./extending-wordpress.md)
    - [Using the Salesforce Analytics API](./using-salesforce-analytics-api.md)
    - [Extending pull parameters](./extending-parameters.md#salesforce-pull)
    - [Extending mapping object](./extending-mapping-object.md#salesforce-pull)
    - [Extending before and after saving](./extending-before-and-after-saving.md#salesforce-pull)
    - [Extending sync allowed](./extending-sync-allowed.md#pull)

7. [Import & Export](./import-export.md)
	Some of the data used by this plugin can be imported and exported.

8. [Logging](./logging.md)

    When enabled, the plugin will create log entries for various events it completes, both from the Salesforce API and from WordPress object modification.

    For developers:

    - [Extending logging](./extending-logging.md)

9. [Mapping errors](./mapping-errors.md)

	When the plugin encounters errors, it creates a Mapping Errors tab in the admin settings and populates it with some information. You can review this to see what records need to be addressed.

10. [REST API](./rest-api.md)

	This plugin contains some REST API functionality, allowing other applications to run calls on it. We have included some documentation of each endpoint.

11. [Troubleshooting](./troubleshooting.md)

	There are several ways to troubleshoot when the plugin has errors, including but not limited to the above log entries and the mapping errors.

12. [All developer hooks](./all-developer-hooks.md)

    This is a full list of all the developer hooks in the plugin. Each hook indicates what file contains it, and where the documentation for it resides.

    We've also created a document where we'd like to list plugins that use these hooks. [Take a look](./example-extending-plugins.md), and/or submit others that you know about.

13. [Code documentation](./code/index.html)

    This is an auto generated system that documents all of the PHP classes in the plugin. This is a good way for PHP developers to look through what the code is doing.

    If you've installed the plugin, you can browse this code documentation at `https://<your site>/wp-content/plugins/object-sync-for-salesforce/docs/code`.
