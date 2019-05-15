# Extending parameters

When this plugin is syncing data, it matches fields between the two systems in a `$params` array. The structure of the array depends on whether the action is a `push` or `pull`, but the array always has the field of the system that is receiving data on the left, and the system that triggered it on the right.

Both directions have a hook that can be called to adjust the array.

## Salesforce push

### Array example

```php
$params = array(
	'email' => 'test@test.com', // salesforce field => wordpress value
	'prematch' => array ( // the prematch field is used to identify pre-existing records that haven't yet been mapped
			'salesforce_field' => 'Email', // check this salesforce field
			'wordpress_field' => 'user_email', // for the value of this wordpress field
			'value' => 'test@test.com' // which is this
	),
	'FirstName' => 'test', // salesforce field => wordpress value
	'LastName' => 'name' // salesforce field => wordpress value
);
```

### Hook

The `push` method doesn't need to keep track of what methods are used to modify the data, since it is all being sent to the Salesforce API itself. The `object_sync_for_salesforce_push_params_modify` can modify the array as needed.

In addition, after the plugin checks to see whether it is updating an already existing object in Salesforce, there is another hook that allows the data to be modified again.

#### Code example

```php
// example to remove the prematch check
/**
* @param array $mapping
*   Mapping object.
* @param array $object
*   WordPress or Salesforce object data.
* @param array $trigger
*   What triggered this mapping?
* @param bool $use_soap
*   Flag to enforce use of the SOAP API.
* @param bool $is_new
*   Indicates whether a mapping object for this entity already exists.
*/
add_filter( 'object_sync_for_salesforce_push_params_modify', 'change_push_params', 10, 6 );
function change_push_params( $params, $mapping, $object, $sf_sync_trigger, $use_soap, $is_new ) {
	$params = array(
		'email' => 'test@test.com',
		'FirstName' => 'test',
		'LastName' => 'name'
	);
	return $params;
}
```

```php
/**
* Set contact name fields if this is a new Contact being added to Salesforce
* This runs before the user has been pushed to Salesforce, but we have data for it, which may have a Salesforce ID
* @param array $params
*   Params mapping the fields to their values
* @param string $salesforce_id
*   Salesforce ID if there is a matched object
* @param array $mapping
*   Mapping object.
* @param array $object
*   WordPress object data.
* @param string $object_type
*	WordPress object type.
*
*/
add_filter( 'object_sync_for_salesforce_push_update_params_modify', 'set_names_if_missing' ), 10, 5 );
public function set_names_if_missing( $params, $salesforce_id, $mapping, $object, $object_type ) {
	if ( null === $salesforce_id ) {
		$params['FirstName'] = $object['first_name'];
		$params['LastName']  = $object['last_name'];
	}
	return $params;

}
```

## Salesforce pull

### Array example

```php
$params = array(
	'user_email' => array ( // wordpress field name
		'value' => 'test@test.com', // salesforce value
		'method_modify' => 'wp_insert_user', // if we are adding a new wordpress record, it's part of this method
		'method_read' => 'get_user_by' // how to get the value in wordpress
	),
	'prematch' => array ( // the prematch field is used to identify pre-existing records that
		'salesforce_field' => 'Email', // for the value of this salesforce field
		'wordpress_field' => 'user_email', // check this wordpress field
		'value' => 'test@test.com', // which is this
		'method_read' => 'get_user_by', // how to get the value in wordpress
		'method_create' => 'wp_insert_user', // if we are creating a new wordpress record, it's part of this method
		'method_update' => 'wp_update_user' // if we are updating an existing wordpress record, it's part of this method
	),
	'first_name' => array ( // wordpress field name
		'value' => 'test', // salesforce value
		'method_modify' => 'update_user_meta', // if we are updating an existing wordpress record, it's part of this method
		'method_read' => 'get_user_meta' // how to get the value in wordpress
	),
	'last_name' => array ( // wordpress field name
		'value' => 'name', // salesforce value
		'method_modify' => 'update_user_meta', // if we are updating an existing wordpress record, it's part of this method
		'method_read' => 'get_user_meta' // how to get the value in wordpress
	),
	'member_level' => array ( // wordpress field name
		'value' => '',
		'method_modify' => 'update_user_meta', // if we are updating an existing wordpress record, it's part of this method
		'method_read' => 'get_user_meta' // how to get the value in wordpress
	)
);
```

### Hook

The `pull` direction needs a method to read and modify the data in WordPress, and will call those methods. If you change them, they need to be methods the plugin can call. The `object_sync_for_salesforce_pull_params_modify` can modify the array as needed.

#### Code example

```php
// example to remove fields and change methods
/**
* @param array $params
*   Params mapping the fields to their values
* @param array $mapping
*   Mapping object.
* @param array $object
*   WordPress or Salesforce object data.
* @param array $sf_sync_trigger
*   What triggered this mapping?
* @param bool $use_soap
*   Flag to enforce use of the SOAP API.
* @param bool $is_new
*   Indicates whether a mapping object for this entity already exists.
*/
add_filter( 'object_sync_for_salesforce_pull_params_modify', 'change_pull_params', 10, 6 );
function change_pull_params( $params, $mapping, $object, $sf_sync_trigger, $use_soap, $is_new ) {
	$params = array(
		'first_name' => array ( // wordpress field name
			'value' => 'test', // salesforce value
			'method_modify' => 'update_user_new_meta', // you could change the method here
			'method_read' => 'get_user_meta'
		),
		'last_name' => array ( // wordpress field name
			'value' => 'name', // salesforce value
			'method_modify' => 'update_user_new_meta', // you could change the method here
			'method_read' => 'get_user_meta'
		),
	);
	return $params;
}
```
