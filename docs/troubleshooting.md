# Troubleshooting

If you are successfully authenticated with Salesforce, but you have a fieldmap that is not passing data, there are several ways to troubleshoot.

## Plugin configuration
- Remember to clear the plugin cache on the Fieldmaps screen.
- If you are not able to push data to Salesforce, try with asynchronous checked, and without. This will tell you if your issue is related to the plugin's cron jobs.
- To inspect your cron jobs, use the [WP Crontrol](https://wordpress.org/plugins/wp-crontrol/) plugin. Make sure the Salesforce push and/or pull jobs are running as you expect them to, and make sure to check the Schedule screen to make sure the jobs are scheduled as they should be.

## Plugin logs
- Make sure to use the Log Settings screen to configure logs. Once enabled, they are added to a custom post type called Logs in the WordPress menu.
- If the plugin tries to create or update data, but WordPress or Salesforce encounter errors, the plugin will always try to create a log entry. If you see entries, review the title and content of each.

## Plugin mapping errors
- If the plugin fails in the middle of creating a map between two objects, a row may be created on the Mapping Errors screen. If it is a push error, it will tell you the WordPress object ID it was trying to map. If it is a pull error, it will tell you the Salesforce ID. **You should not leave these entries.**

## Server logs
- If you don't see any error logs in WordPress, it is always a good idea to check your server's error logs and see if PHP is encountering errors.
