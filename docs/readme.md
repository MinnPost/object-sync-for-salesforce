# Salesforce REST API Documentation

This is the full documentation for this plugin, extending the information in [the readme](https://github.com/MinnPost/salesforce-rest-api/blob/master/README.md).

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

6. [Pulling from Salesforce to WordPress](./pull.md)

    When mapped objects in Salesforce are changed in ways that apply to the plugin's triggers (as defined in the mapping documentation), that data is "pulled" from Salesforce into WordPress where it can act on relevant WordPress data.

    For developers:

    - [Extending WordPress data modification](./extending-wordpress.md)
    - [Using the Salesforce Analytics API](./using-salesforce-analytics-api.md)
    - [Extending pull parameters](./extending-parameters.md#salesforce-pull)
    - [Extending mapping object](./extending-mapping-object.md#salesforce-pull)
    - [Extending before and after saving](./extending-before-and-after-saving.md#salesforce-pull)

7. [All developer hooks](./all-developer-hooks.md)

    This is a full list of all the developer hooks in the plugin. Each hook indicates what file contains it, and where the documentation for it resides.

8. [Code documentation](./code/index.html)

    This is an auto generated system that documents all of the PHP classes in the plugin. This is a good way for PHP developers to look through what the code is doing.

    If you've downloaded the plugin, you can browse this code documentation at `https://<your site>/wp-content/plugins/salesforce-rest-api/docs/code`.
