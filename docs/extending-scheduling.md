# Extending scheduling

This plugin, by default, starts with an array of classes it expects to process with the included [Action Scheduler](https://github.com/Prospress/action-scheduler) library.

## Default:

```php
$this->schedulable_classes = array(
	'salesforce_push' => array(
		'label'    => 'Push to Salesforce',
		'class'    => 'Object_Sync_Sf_Salesforce_Push',
		'callback' => $this->option_prefix . 'push_record',
	),
	'salesforce_pull' => array(
		'label'       => 'Pull from Salesforce',
		'class'       => 'Object_Sync_Sf_Salesforce_Pull',
		'initializer' => $this->option_prefix . 'pull_check_records',
		'callback'    => $this->option_prefix . 'pull_process_records',
	),
);
```

This defines the `push` and `pull` classes as schedulable items, and sets the methods (`object_sync_for_salesforce_push_record` that queues data for pushing to Salesforce, and the two methods `object_sync_for_salesforce_pull_check_records` and `object_sync_for_salesforce_pull_process_records` that check for new data in Salesforce, and process it in WordPress, respectively. This is how the plugin sends data between the two systems in a scalable way, as documented in the [syncing setup](./syncing-setup.md) documentation.

When one of these classes has an `initializer` method, the plugin can run it at intervals. For example, it can run a task to check for new data in Salesforce every hour.

When the class has a `callback` method, it will use it to process any data that it contains. For example, if there are records that need to be sent to Salesforce or saved in WordPress, they'll be processed on this method.

## Hook

If you'd like to schedule other things to happen with this plugin, or remove defaults from the schedule, you can do that with the `object_sync_for_salesforce_modify_schedulable_classes` hook.

### Code example

```php
// example to modify the array of classes by adding one and removing one
add_filter( 'object_sync_for_salesforce_modify_schedulable_classes', 'modify_schedulable_classes', 10, 1 );
function modify_schedulable_classes( $schedulable_classes ) {
    $schedulable_classes = array(
		'salesforce_push' => array(
		    'label' => 'Push to Salesforce',
		    'class' => 'Object_Sync_Sf_Salesforce_Push',
		    'callback' => 'salesforce_push_sync_rest',
		),
		'wordpress' => array(
		    'label' => 'WordPress',
		    'class' => 'Object_Sync_Sf_WordPress',
		),
		'salesforce' => array(
		    'label' => 'Salesforce Authorization',
		    'class' => 'Object_Sync_Sf_Salesforce',
		),
	);
    return $schedulable_classes;
}
```
