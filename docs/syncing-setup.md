# Syncing setup

After you have completed the [setup process](https://github.com/MinnPost/salesforce-rest-api/blob/master/docs/initial-setup.md), you can configure how often both WordPress and Salesforce will sync data to the other system.

In this plugin, sending data from WordPress to Salesforce is referred to as a "push." Sending data from Salesforce to WordPress is referred to as a "pull."

Use the Scheduling tab for the plugin to configure how often both events should happen.

## Push to Salesforce

When you create a fieldmap, you can configure that object to push data from WordPress asynchronously. This means if you save a mapped object in WordPress, it will push its data to Salesforce the next time the push `wp_cron` runs.

This Push to Salesforce section is how you configure the frequency of push `wp_cron` runs. They can run at any frequency, depending on your data needs and your server capabilities. Add a number, and choose the time unit (in minutes, hours, or days).

There is also a display of what is currently in the push queue, if anything. If you have data in there and need to cancel its push before it runs, click the Clear this queue button.

## Pull from Salesforce

Pulling data from Salesforce always happens asynchronously. It will not happen immediately when an object is saved in Salesforce. This means it will be pulled the next time the pull `wp_cron` runs.

This Pull from Salesforce section is how you configure the frequency of pull `wp_cron` runs. They can also run at any frequency, depending on your data needs and your server capabilities. Add a number, and choose the time unit (in minutes, hours, or days).

There is also a display of what is currently in the pull queue, if anything. If you have data in there and need to cancel its pull before it runs, click the Clear this queue button. This could happen in the event that data is pulled down from Salesforce, but it has not yet been saved in WordPress.

## Scheduling other events

By default, the plugin only schedules the above things. It also has a hook to modify what classes can be scheduled. You can read more about this in the [extending scheduling](./extending-scheduling.md) documentation.