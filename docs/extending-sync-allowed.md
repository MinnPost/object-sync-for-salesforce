# Extending the sync allowed setting

By default, all objects that match a fieldmap's criteria after it is set up will be synced according to its rules. But there are times when developers may want to keep a specific object, type of object, or set of objects, from being saved in either WordPress or Salesforce if it matches their own criteria.

While this plugin doesn't affect individual records in this way through the interface, you can use a hook to prevent a push or pull from occuring in this way.

Rather than saving the value or otherwise preserving it permanently, the sync allowed setting tells the plugin whether to skip an item each time it runs. Using these hooks, you could check for a value that would change, or one that would stay the same, to determine whether the sync would be disallowed permanently, or change based on the criteria you've defined.

## Push

### Hook

The `object_sync_for_salesforce_push_object_allowed` filter allows you to stop any WordPress object from being sent to Salesforce based on data about the object. By default, it returns a `true` value, in which case the data will be sent to Salesforce. If you return `false`, it will skip that particular object.

This hook has access to the following variables:

- `$object_type`: what kind of Salesforce object it is
- `$object` - the object's data as it comes from Salesforce
- `$sf_sync_trigger` - what action has occurred (a Salesforce create, update, or delete)
- `$salesforce_mapping` - the fieldmap between the WordPress and Salesforce object types

### Code example

This example would keep the WordPress user from ever pushing to Salesforce, as WordPress user IDs don't change. But you could certainly use another field - a meta field, or the email/first_name/last_name field - instead, and check for the values you expect.

```php
// example to keep from pushing the WordPress user with id of 1
/**
* @param bool $push_allowed
*   Whether this object can be pushed
* @param string $object_type
*   WordPress object type.
* @param array $object
*   The WordPress data that needs to be sent to Salesforce.
* @param string $sf_sync_trigger
*   What type of event has happened
* @param array $mapping
*   The map between the WordPress and Salesforce object types
*/
add_filter( 'object_sync_for_salesforce_push_object_allowed', 'check_user', 10, 5 );
// can always reduce this number if all the arguments are not necessary
function check_user( $push_allowed, $object_type, $object, $sf_sync_trigger, $mapping ) {
	if ( $object_type === 'user' && $object['Id'] === 1 ) {
		$push_allowed = false;
	}
	return $push_allowed;
}
```

## Pull

### Hook

The `object_sync_for_salesforce_pull_object_allowed` filter allows you to stop any Salesforce object from being saved in WordPress based on data about the object. By default, it returns a `true` value, in which case the data will be saved in WordPress. If you return `false`, it will skip that particular object.

This hook has access to the following variables:

- `$object_type`: what kind of WordPress object it is
- `$object` - the object's data as it is in WordPress
- `$sf_sync_trigger` - what action has occurred (a WordPress create, update, or delete)
- `$salesforce_mapping` - the fieldmap between the WordPress and Salesforce object types

### Code example

This example would keep the Salesforce Contact from ever pulling in to WordPress, as Salesforce Ids don't change. But you could certainly use another field on the object instead, and check for the values you expect.

```php
// example to keep from pulling the Salesforce Contact with id of abcdef
/**
* @param bool $pull_allowed
*   Whether this object can be pulled
* @param string $object_type
*   Salesforce object type
* @param array $object
*   The Salesforce data that needs to be sent to WordPress.
* @param string $sf_sync_trigger
*   What type of event has happened
* @param array $salesforce_mapping
*   The map between the WordPress and Salesforce object types
*/
add_filter( 'object_sync_for_salesforce_pull_object_allowed', 'check_user', 10, 5 );
// can always reduce this number if all the arguments are not necessary
function check_user( $pull_allowed, $object_type, $object, $sf_sync_trigger, $salesforce_mapping ) {
	if ( $object_type === 'Contact' && $object['Id'] === 'abcdef' ) {
		$pull_allowed = false;
	}
	return $pull_allowed;
}
```
