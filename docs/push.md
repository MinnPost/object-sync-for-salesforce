# Push from WordPress to Salesforce

When a WordPress object type that is already mapped to a WordPress Salesforce type has an event that is an active trigger occur, a push occurs. An active trigger is an event (create, update, delete) that happens, in the case of push, in WordPress, and is selected in the specific fieldmap's settings. A mapped Salesforce object then needs to be created, updated, or deleted to the correct data.

What data gets pushed depends entirely on the settings defined as part of [setting up the fieldmap](./mapping.md), and the hooks available for modifying it.

When the data gets pushed depends on the [sync settings](./syncing-setup.md).

## How WordPress data is retrieved and configured for Salesforce

The `Object_Sync_Sf_WordPress` class of this plugin gets the `wpdb` object, and uses the methods it needs to read data in WordPress. When an item needs to be pulled into Salesforce, the class gets that data in a format the plugin can use. This plugin is then able to use the Salesforce API methods to work with the data in Salesforce.

The plugin prepares the relationship between individual items - an individual WordPress user to an individual Salesforce Contact, for example - before saving data. This is the object map, and it the relationship between the object types, as well as the data that is being brought into Salesforce. The plugin includes a hook to modify this object map, and it is [documented](./extending-mapping-object.md#salesforce-push).

When the plugin understands what operation it needs to do - create, update, or delete - with the data it has, it creates a set of parameters. This includes each mapped field necessary for the object pair, and what methods need to be called to work with that field. It discards data for fields that are not included in the fieldmap.

The plugin includes a hook to modify the array of parameters. This is [documented](extending-parameters.md#salesforce-push).

## How WordPress data is saved in Salesforce

The `Object_Sync_Sf_Salesforce` class of this plugin brings in the Salesforce REST API, and uses the methods it needs to create, update, and delete data in Salesforce. When an item in WordPress needs to be sent to Salesforce, it uses the appropriate API method.

The plugin contains a few hooks to perform actions right before, and right after, data is saved in Salesforce. These are [documented](./extending-before-and-after-saving.md#salesforce-push).

### Preventing a push

The plugin provides a hook that can prevent data from being sent to Salesforce based on information about the object in WordPress. This is [documented](./extending-sync-allowed.md#push).

## Using the API directly

The Salesforce REST API includes many other methods, and we don't currently use all of them. However, if you need to extend what can be done in Salesforce, the plugin always provides access to an instance of the API itself. We have [documented](./accessing-salesforce-object.md) how to access this.
