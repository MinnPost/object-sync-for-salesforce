# Extending the mapping object

From a database perspective, the mapping object, or object map, is a row from the `wp_salesforce_object_map` table. It holds the names of the objects, the fields and what methods modify the fields, what events are supported triggers, and the other settings configured in the [mapping documentation](./mapping.md).

Both directions, `push` and `pull`, allow for this mapping object to be extended, or even replaced, with hooks. Both directions also use the array in the same ways.

**Note**: If you modify or extend the array, the main thing to know is that the plugin checks for an `id` key. If there is one, it assumes there is also a `wordpress_id` and a `salesforce_id` corresponding to two individual items, and will assume that it is doing an update (or delete) operation. If there is not one, it will assume it is doing an insert (or upsert, if applicable) operation.

**Note**: The plugin does update several pieces of this array as it moves through its operations. If the row is new and it is a `push` operation, it will update the `salesforce_id` after it gets a response from the API. It will also update the `created`, `updated`, `last_sync`, `last_sync_action`, `last_sync_status`, and `last_sync_message` after it finishes working with the data. Hooks will not keep this from happening.

## Salesforce Pull

### Array example

```php
$mapping_object = array(
    'id' => 244
    'wordpress_id' => a user id
    'salesforce_id' => 'a contact id'
    'wordpress_object' => 'user'
    'created' => '2017-03-06 12:29:19'
    'object_updated' => '2017-03-07 07:34:50'
    'last_sync' => '2017-03-07 07:34:50'
    'last_sync_action' => 'pull'
    'last_sync_status' => 1
    'last_sync_message' => 'Mapping object updated via function: salesforce_pull_process_records'
);
```

### Hook

`object_sync_for_salesforce_push_mapping_object` allows you to change any of the items in the `$mapping_object` array. Make sure to pay attention to the note above, as the items may be overwritten as the plugin progresses.

## Salesforce Push

### Array example

```php
$mapping_object = array(
    'id' => 242,
    'wordpress_id' => a user id,
    'salesforce_id' => 'a contact id',
    'wordpress_object' => 'user',
    'created' => '2017-03-06 11:58:31',
    'object_updated' => '0000-00-00 00:00:00',
    'last_sync' => '2017-03-06 11:58:31',
    'last_sync_action' => 'push',
    'last_sync_status' => 1,
    'last_sync_message' => 'Mapping object created via function: salesforce_push_sync'
);
```

### Hook

`object_sync_for_salesforce_pull_mapping_object` allows you to change any of the items in the `$mapping_object` array. Make sure to pay attention to the note above, as the items may be overwritten as the plugin progresses.
