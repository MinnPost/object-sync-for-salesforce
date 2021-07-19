# Pull from Salesforce to WordPress

When a Salesforce object type that is already mapped to a WordPress object type has an event that is an active trigger occur, a pull occurs. An active trigger is an event (create, update, delete) that happens, in the case of pull, in Salesforce, and is selected in the specific fieldmap's settings. A mapped WordPress object then needs to be created, updated, or deleted to the correct data.

What data gets pulled depends entirely on the settings defined as part of [setting up the fieldmap](./mapping.md), and the hooks available for modifying it.

When the data gets pulled depends on the [sync settings](./syncing-setup.md).

## How Salesforce data is retrieved and configured for WordPress

The `Object_Sync_Sf_Salesforce` class of this plugin brings in the Salesforce REST API, and uses the methods it needs to read data in Salesforce. When an item needs to be pulled into WordPress, the API gets that data in a format the plugin can use. This plugin is then able to use WordPress methods to work with the data in WordPress.

The plugin prepares the relationship between individual items - an individual WordPress user to an individual Salesforce Contact, for example - before saving data. This is the object map, and it the relationship between the object types, as well as the data that is being brought into WordPress. The plugin includes a hook to modify this object map, and it is [documented](./extending-mapping-object.md#salesforce-pull).

When the plugin understands what operation it needs to do - create, update, or delete - with the data it has, it creates a set of parameters. This includes each mapped field necessary for the object pair, and what methods need to be called to work with that field. It discards data for fields that are not included in the fieldmap.

The plugin includes a hook to modify the array of parameters. This is [documented](extending-parameters.md#salesforce-pull).

## How Salesforce data is saved in WordPress

The plugin has methods for creating, updating, and deleting all of the supported WordPress object types in the `Object_Sync_Sf_WordPress` class. These methods determine what the object's structure is, what the field's structure is, and what methods need to be called to work with it.

This plugin also contains several hooks to do more with objects, including both default and custom objects, in WordPress. These are [documented](./extending-wordpress.md).

The plugin additionally has a hook to modify the pull query itself before it is sent to Salesforce. This is [documented](./extending-pull.md).

Finally, the plugin contains a few hooks to perform actions right before, and right after, data is saved in WordPress. These are [documented](./extending-before-and-after-saving.md#salesforce-pull).

### Preventing a pull

The plugin provides a hook that can prevent data from being saved in WordPress based on information about the object coming from Salesforce. This is [documented](./extending-sync-allowed.md#pull).

## Using the API directly

The Salesforce REST API includes many other methods, and we don't currently use all of them. However, if you need to extend what can be done in Salesforce, the plugin always provides access to an instance of the API itself. We have [documented](./accessing-salesforce-object.md) how to access this.

## Using the Analytics API

This plugin's `Object_Sync_Sf_Salesforce` class includes basic support for the distinct [Salesforce Analytics API](https://developer.salesforce.com/docs/atlas.en-us.api_analytics.meta/api_analytics/sforce_analytics_rest_api_intro.htm). This can be used to, for example, display the results of a Salesforce Report in a WordPress widget. Because this is dependent on what you have to analyze in your Salesforce install, and what you need to do with it in WordPress, this plugin does not include any syncing with this data by default.

However, there is an [example plugin](https://github.com/minnpost/minnpost-donation-progress-widget) that shows a (very specific) use case. Additionally, there is some [documentation](./using-salesforce-analytics-api.md) about how this integration works, and what kind of code is required to use it.
