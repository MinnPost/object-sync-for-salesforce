# Push from WordPress to Salesforce

When a WordPress object type that is already mapped to a WordPress Salesforce type has an event that is an active trigger occur, a push occurs. An active trigger is an event (create, update, delete) that happens, in the case of push, in WordPress, and is selected in the specific fieldmap's settings. A mapped Salesforce object then needs to be created, updated, or deleted to the correct data.

What data gets pushed depends entirely on the settings defined as part of [setting up the fieldmap](./mapping.md), and the hooks available for modifying it.

When the data gets pushed depends on the [sync settings](./syncing-setup.md).

## How Salesforce data is saved

The `salesforce` class of this plugin brings in the Salesforce REST API, and uses the methods it needs to create, update, and delete data in Salesforce. When an item in WordPress needs to be sent to Salesforce, it uses the appropriate API method.

## For developers

The Salesforce REST API includes many other methods, and we don't currently use all of them. However, if you need to extend what can be done in Salesforce, the plugin always provides access to an instance of the API itself. We have [documented](./accessing-salesforce-object.md) how to access this.