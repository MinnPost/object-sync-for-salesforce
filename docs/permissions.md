# Permissions

When this plugin is first activated in WordPress, it creates a new capability: `configure_salesforce`, and adds it to all `administrator` users. By default, these users are the only users who can configure the plugin.

The plugin does have a hook to modify what users get this role. You can read more about this in the [extending roles documentation](./extending-roles.md).