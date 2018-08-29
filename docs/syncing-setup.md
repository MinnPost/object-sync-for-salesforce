# Syncing setup

After you have completed the [setup process](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/initial-setup.md), you can configure how often both WordPress and Salesforce will sync data to the other system.

In this plugin, sending data from WordPress to Salesforce is referred to as a "push." Sending data from Salesforce to WordPress is referred to as a "pull." Both of these things act upon any matching data that is created after the plugin is installed (you can [read more](#syncing-pre-existing-data) about this below).

Use the Scheduling tab for the plugin to configure how often both events should happen.

## Batch Settings

The Action Scheduler library stores actions in WordPress that can be completed in the future, individually or in batches. This plugin uses the library to group actions in three ways:

1. Sending WordPress data that matches fieldmaps to Salesforce.
2. Checking Salesforce for new data that matches fieldmaps.
3. Saving Salesforce data that matches in WordPress.

A batch consists of a group of any number of these actions. That is, it can be a single record being saved in WordPress or Salesforce, or it can be a query to check Salesforce for new data.

Depending on your server's capabilities, you can adjust how many actions can be run in a batch, and how many batches can be run at one time. It's a good idea to start with lower numbers for these and go up, especially for lower powered servers.

## Push to Salesforce

When you create a fieldmap, you can configure that object to push data from WordPress asynchronously. This means if you save a mapped object in WordPress, it will push its data to Salesforce the next time the push `wp_cron` runs.

This Push to Salesforce section shows whether the Action Scheduler has been sent any records to push to Salesforce. It will run as a one time event whenever the scheduler settings have space for it. If you have data in there and need to cancel its push before it runs, click the Clear this queue button.

## Pull from Salesforce

Pulling data from Salesforce always happens asynchronously. It will not happen immediately when an object is saved in Salesforce. This means it will be pulled the next time Action Scheduler runs the method to get updated data.

This Pull from Salesforce section is how you configure the frequency with which the plugin looks for new data in Salesforce. This can run at any frequency, depending on your data needs and your server capabilities. Add a number, and choose the time unit (in minutes, hours, or days).

When new data from Salesforce is ready to be saved in WordPress, it will run as a one time event whenever the scheduler settings have space for it, just like the Push to Salesforce events.

There is also a display of what is currently in the pull queue, if anything. If you have data in there and need to cancel its pull before it runs, click the Clear this queue button. This could happen in the event that data is pulled down from Salesforce, but it has not yet been saved in WordPress.

## Scheduling other events

By default, the plugin only schedules the above things. It also has a hook to modify what classes can be scheduled. You can read more about this in the [extending scheduling](./extending-scheduling.md) documentation.

## Syncing pre-existing data

As mentioned above, this plugin by default does not act on data that exists in either WordPress or Salesforce before the plugin is installed. This is primarily for performance and scalability reasons. However this creates problems if existing data needs to be synced.

It's important to note a [GitHub issue](https://github.com/MinnPost/object-sync-for-salesforce/issues/98) about this problem.

There is also a built in method for manually creating an object map on WordPress user edit screens. You can use `https://<your site>/wp-admin/user-edit.php?user_id=[desired user id]` as a URL setup to see how this works.

![Image of WordPress user edit screen](./assets/img/screenshots/07-manually-map-user-to-salesforce.png)
