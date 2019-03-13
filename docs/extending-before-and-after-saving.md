# Extending before and after saving

When the plugin saves data, either on a `push` or `pull` event, it has a few actions that can be run that don't change any of the data the plugin is dealing with, but do allow developers to do additional things.

Each event has an action that runs right before data is saved, and then right after there is one for a successful save and one for a failed save.

## Salesforce Pull

The action hooks that run on around the save on a `pull` event are:

- `object_sync_for_salesforce_pre_pull`
- `object_sync_for_salesforce_pull_fail`
- `object_sync_for_salesforce_pull_success`

### Code examples

#### Before pull

```php
add_action( 'object_sync_for_salesforce_pre_pull', 'before_pull', 10, 5 );
function before_pull( $wordpress_id, $mapping, $object, $object_id, $params ) {
    // do things before the plugin saves any data in wordpress
    // $wordpress_id is the object id
    // $mapping is the field map between the object types
    // $object is the object data
    // $object_id is the wordpress id field's name
    // $params is the data mapping between the two systems
}
```

#### After fail

```php
add_action( 'object_sync_for_salesforce_pull_fail', 'pull_fail', 10, 5 );
function pull_fail( $op, $result, $synced_object ) {
    // do things if the save failed
    // $op is what the plugin tried to do - Create, Update, Upsert, Delete
    // $result is what was returned by the $wordpress class
    // $synced_object is an array like this:
    /*
    $synced_object = array(
        'salesforce_object' => $object,
        'mapping_object' => $mapping_object,
        'mapping' => $mapping,
    );
    */
}
```

#### After success

```php
add_action( 'object_sync_for_salesforce_pull_success', 'pull_success', 10, 3 );
function pull_success( $op, $result, $synced_object ) {
    // do things if the save succeeded
    // $op is what the plugin did - Create, Update, Upsert, Delete
    // $result is what was returned by the $wordpress class
    // $synced_object is an array like this:
    /*
    $synced_object = array(
        'salesforce_object' => $object,
        'mapping_object' => $mapping_object,
        'mapping' => $mapping,
    );
    */
}
```

## Salesforce Push

The action hooks that run on around the save on a `push` event are:

- `object_sync_for_salesforce_pre_push`
- `object_sync_for_salesforce_push_fail`
- `object_sync_for_salesforce_push_success`

### Code examples

#### Before push

```php
add_action( 'object_sync_for_salesforce_pre_push', 'before_push', 10, 5 );
function before_push( $salesforce_id, $mapping, $object, $object_id, $params ) {
    // do things before the plugin saves any data in salesforce
    // $salesforce_id is the object id
    // $mapping is the field map between the object types
    // $object is the object data
    // $object_id is the wordpress id field's name
    // $params is the data mapping between the two systems
}
```

#### After fail

```php
add_action( 'object_sync_for_salesforce_push_fail', 'push_fail', 10, 5 );
function push_fail( $op, $response, $synced_object ) {
    // do things if the save failed
    // $op is what the plugin tried to do - Create, Update, Upsert, Delete
    // $response is what was returned by the $salesforce class. sfapi->response
    // $synced_object is an array like this:
    /*
    $synced_object = array(
        'wordpress_object' => $object,
        'mapping_object' => $mapping_object,
        'queue_item' => false,
        'mapping' => $mapping,
    );
    */
}
```

#### After success

```php
add_action( 'object_sync_for_salesforce_push_success', 'push_success', 10, 3 );
function push_success( $op, $response, $synced_object, $object_id ) {
    // do things if the save succeeded
    // $op is what the plugin did - Create, Update, Upsert, Delete
    // $response is what was returned by the $salesforce class. sfapi->response
    // $synced_object is an array like this:
    /*
    $synced_object = array(
        'wordpress_object' => $object,
        'mapping_object' => $mapping_object,
        'queue_item' => false,
        'mapping' => $mapping,
    );
    */
    // $object_id is the salesforce object id
}
```
