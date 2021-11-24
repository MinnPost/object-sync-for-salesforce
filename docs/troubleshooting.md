# Troubleshooting

With any troubleshooting, the first two things to try are:

1. Check the plugin's Log entries. If the normal operations of the plugin are not creating informative log entries, you can temporarily turn on Debug mode (this can create a lot of entries).
2. Check the plugin's Mapping Errors tab.
3. Check your PHP error logs. If you don't know how to access these, talk to your web host.

## Enabling Plugin logs

If you are new to the plugin, make sure you've enabled logs:
- Use the Log Settings screen to configure how to handle log entries. Once enabled, they are added to a custom post type called Logs in the WordPress menu.
- If the plugin tries to create or update data, or to make an API call to Salesforce, but WordPress or Salesforce encounter errors, the plugin will always try to create a log entry. If you see entries, review both the title and content of each.

## Connection and authorization issues

### Missing Authorize tab

If you load the plugin's Settings screen and you do not see an Authorize tab, this means there are required fields missing from your Settings tab. You must have accurate values for these fields:
- Consumer Key
- Consumer Secret
- Callback URL
- Login Base URL
- Authorize URL Path
- Token URL Path
- Salesforce API Version

### Error: invalid_client_id

It can take a few minutes for a new app to be fully set up in Salesforce. If you get a `error=invalid_client_id&error_description=client%20identifier%20invalid` URL when you try to authorize with WordPress during the installation, wait a few minutes and then try again.

This error can also happen if the Salesforce Consumer Key is entered incorrectly in the plugin settings.

### Error: redirect_uri_mismatch

This error usually means the Callback URL in the plugin settings does not match the Callback URL for the app in Salesforce. Typically, the URL is something like this: https://yoursite/wp-admin/options-general.php?page=object-sync-salesforce-admin&tab=authorize.

### Error(0)

This error comes from Salesforce but the plugin is not able to detect it before the page loads. Usually it comes from one of these things:

1. The connection is down
2. The SSL is incorrect
3. The login base URL is incorrect

### Error: 400

Sometimes Salesforce returns an unhelpful 400 error (perhaps with a `grant type not supported` message). 400 errors from Salesforce mean that the request couldn't be understood. This can happen if the Login base URL setting is using your instance name (ex https://clientname.lightning.force.com) rather than the more generic https://test.salesforce.com for sandboxes and https://login.salesforce.com for production instances. Salesforce will handle redirecting the plugin to the proper instance; you should always be able to use the generic URLs.

### Error: 401

Sometimes Salesforce returns a 401 error. This means the session ID or OAuth token has expired. This can mean that you've already tried to authorize, but it failed, or that too much time has passed. Try to disconnect and reconnect the plugin. Also, make sure your Salesforce app has the proper permissions: "Manage user data via APIs (api)" and "Perform requests on your behalf at any time (refresh_token, offline_access)".

### Plugin redirects after logging in, but does not finish activating

If the plugin allows you to authorize in Salesforce, but does not finish activating in WordPress, consider these possible issues:

1. Insufficient app permissions in Salesforce. Make sure the app's permissions are at least "Perform requests on your behalf at any time" for OAuth Scope as well as the appropriate other scopes for your application. Many setups will also need to select "Manage user data via APIs (api)" as one of these scopes. If you change permissions, give Salesforce a few minutes before trying to connect again.
2. The plugin may have been unable to create its required database tables. If you think this may be the case, refer to [this document](./troubleshooting-unable-to-create-database-tables.md) for the necessary SQL.
3. Mismatched settings between the plugin and the expected values in Salesforce.

## Object map issues

If you are successfully authenticated with Salesforce, but you are unable to create an object map, there are several ways to troubleshoot. Always check your PHP error logs first.

### There are no Salesforce objects in the dropdown

When there are no values in the list of Salesforce objects, this means the plugin can’t access any of the objects in your Salesforce. There are three likely causes for this:

1. You need to change the OAuth scope on the app you created in Salesforce. For most uses with this plugin, you’ll want to use "Perform requests on your behalf at any time" and "Manage user data via APIs (api)" If you do change these, you’ll need to wait several minutes before trying again, as Salesforce is rather slow on this.
2. Your Salesforce objects might not be accessible to the Salesforce user who has authenticated with WordPress via this plugin.
3. The Salesforce objects might have other restrictive permissions.

## Fieldmap issues

If you are successfully authenticated with Salesforce, but you have a fieldmap that is not passing data, there are several ways to troubleshoot. Always check your PHP error logs first.

### Fieldmaps cannot be created

There appear to be some server configurations that have trouble creating the required database tables for this plugin to run. If you are unable to create fieldmaps, check to see if the `wp_object_sync_sf_field_map` table exists.

If this table does not exist, and you have access to create database tables directly, refer to [this document](./troubleshooting-unable-to-create-database-tables.md) for the correct SQL to create them.

### A successfully created fieldmap does not pass data

#### Plugin configuration
- Remember to clear the plugin cache on the Fieldmaps screen.
- If you are not able to push data to Salesforce, try with asynchronous checked, and without. This will tell you if your issue is related to the plugin's cron jobs.
- To inspect your cron jobs, use the [WP Crontrol](https://wordpress.org/plugins/wp-crontrol/) plugin. Make sure the Salesforce push and/or pull jobs are running as you expect them to, and make sure to check the Schedule screen to make sure the jobs are scheduled as they should be.

#### Plugin mapping errors
- If the plugin fails in the middle of creating a map between two objects, a row may be created on the Mapping Errors screen. If it is a push error, it will tell you the WordPress object ID it was trying to map. If it is a pull error, it will tell you the Salesforce ID. **You should not leave these entries.**
