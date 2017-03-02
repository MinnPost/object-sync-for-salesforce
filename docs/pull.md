# Pull from Salesforce to WordPress

When a Salesforce object type that is already mapped to a WordPress object type has an event that is an active trigger occur, a pull occurs. An active trigger is an event (create, update, delete) that happens, in the case of pull, in Salesforce, and is selected in the specific fieldmap's settings. A mapped WordPress object then needs to be created, updated, or deleted to the correct data.

What data gets pulled depends entirely on the settings defined as part of [setting up the fieldmap](./mapping.md), and the hooks available for modifying it.

When the data gets pulled depends on the [sync settings](./syncing-setup.md).

## How Salesforce data is retrieved

The `salesforce` class of this plugin brings in the Salesforce REST API, and uses the methods it needs to read data in Salesforce. When an item needs to be pulled into WordPress, the API gets that data in a format the plugin can use.

## For developers

The Salesforce REST API includes many other methods, and we don't currently use all of them. However, if you need to extend what can be done in Salesforce, the plugin always provides access to an instance of the API itself. We have [documented](./accessing-salesforce-object.md) how to access this.