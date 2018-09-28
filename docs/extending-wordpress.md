# Extending WordPress data modification

Developers can modify how data is modified in WordPress with several hooks.

## Doing more with default objects

While this plugin updates all of the supported objects in their default ways (and some of these can be extended with the [extended parameters hooks](./extending-parameters.md)), it also allows developers to write their own handlers to save data to these objects in any other necessary ways.

### Hooks

The plugin has hooks that allow you to do more with these objects:

- user
- post (including custom post types)
- attachment
- term (for categories and tags)
- comment

Each hook runs right after the supported data operations have run. So an object has already been created or updated, and you can do further things if necessary. After the hook runs, the `$result` array is sent back to the class that called it.

Each object's hook takes the object's ID, the `$params`, and what action was just taken (create or update).

#### Code examples

```php
add_action( 'object_sync_for_salesforce_set_more_user_data', 'save_more_my_user', 10, 3 );
function save_more_my_user( $user_id, $params, $action ) {
    // run code to save any param data for this $user_id
}
// after this runs, wordpress will also run `wp_new_user_notification`, which respects your settings
```

```php
add_action( 'object_sync_for_salesforce_set_more_post_data', 'save_more_my_post', 10, 3 );
function save_more_my_post( $post_id, $params, $action ) {
    // run code to save any param data for this $post_id
}
```

```php
add_action( 'object_sync_for_salesforce_set_more_attachment_data', 'save_more_my_attachment', 10, 3 );
function save_more_my_post( $attachment_id, $params, $action ) {
    // run code to save any param data for this $attachment_id
}
```

```php
add_action( 'object_sync_for_salesforce_set_more_term_data', 'save_more_my_term', 10, 3 );
function save_more_my_post( $term_id, $params, $action ) {
    // run code to save any param data for this $term_id
}
```

```php
add_action( 'object_sync_for_salesforce_set_more_comment_data', 'save_more_my_comment', 10, 3 );
function save_more_my_post( $comment_id, $params, $action ) {
    // run code to save any param data for this $comment_id
}
```

## Working with custom objects

By default, the plugin supports create, read, update, delete methods for these objects:

- user
- post (including custom post types)
- attachment [with caveats](#for-attachments)
- category
- tag
- comment

If you need to work with objects that aren't any of these, you can use these hooks:

### Create

Developers can use the `object_sync_for_salesforce_create_custom_wordpress_item` hook to create objects with their own methods.

#### Code example

```php
add_filter( 'object_sync_for_salesforce_create_custom_wordpress_item', 'add_object', 10, 1 );
function add_object( $create_data ) {
    // $create_data is array( 'name' => objecttype, 'params' => array_of_params, 'id_field' => idfield )
    // run methods here to add the record to the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```php
$result = array(
    'data'   => array(
        $id_field => $post_id, // example here is 'ID' => 867. $id_field is the key in the database; $post_id is the value
        'success' => $success // $success is a boolean value you should have already set
    ),
    'errors' => $errors
);
```

### Upsert

Developers can use the `object_sync_for_salesforce_upsert_custom_wordpress_item` hook to upsert objects with their own methods.

#### Code example

```php
add_filter( 'object_sync_for_salesforce_upsert_custom_wordpress_item', 'upsert_object', 10, 1 );
function upsert_object( $create_data ) {
    /* $upsert_data is like this:
    array(
        'key'            => $key,
        'value'          => $value,
        'methods'        => $methods,
        'params'         => $params,
        'id_field'       => $id_field,
        'pull_to_drafts' => $pull_to_drafts,
        'name'           => $name,
        'check_only'     => $check_only,
    );
    */
    // run methods here to upsert record in the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```php
$result = array(
    'data' => array(
        $id_field => $post_id, // example here is 'ID' => 867. $id_field is the key in the database; $post_id is the value
        'success' => $success // $success is a boolean value you should have already set
    ),
    'errors' => $errors
);
```

### Update

Developers can use the `object_sync_for_salesforce_update_custom_wordpress_item` hook to update objects with their own methods.

#### Code example

```php
add_filter( 'object_sync_for_salesforce_update_custom_wordpress_item', 'update_object', 10, 1 );
function update_object( $update_data ) {
    // $update_data is array( 'name' => objecttype, 'params' => array_of_params, 'id_field' => idfield )
    // run methods here to update the record in the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```php
$result = array(
    'data' => array(
        $id_field => $post_id, // example here is 'ID' => 867. $id_field is the key in the database; $post_id is the value
        'success' => $success // $success is a boolean value you should have already set
    ),
    'errors' => $errors
);
```

### Delete

Developers can use the `object_sync_for_salesforce_delete_custom_wordpress_item` hook to update objects with their own methods.

#### Code example

```php
add_filter( 'object_sync_for_salesforce_delete_custom_wordpress_item', 'delete_object', 10, 1 );
function delete_object( $delete_data ) {
    // $delete_data is array( 'name' => objecttype, 'id_field' => idfield )
    // run methods here to delete the record from the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```php
$result = array(
    'data' => array(
        'success' => $success // the returned $success is an object of the correct type, or a false
    ),
    'errors' => $errors
);
```

### For attachments

If you are adding attachments to WordPress that come from Salesforce, you may need to do more than the default behavior, depending on exactly what data you have stored in Salesforce already.

To facilitate this, there is the `object_sync_for_salesforce_set_initial_attachment_data` hook.

#### Code example:

```php
add_filter( 'object_sync_for_salesforce_set_initial_attachment_data', 'set_attachment', 10, 1 );
function set_attachment( $params ) {
    // set up the parameters available for an attachment
    // the parameters will be stored based on the methods they use
    // ex:
    $params[ $key ] = array(
        'value'         => $value,
        'method_modify' => $method_modify,
        'method_create' => $method_create,
        'method_read'   => $methods['method_read']
    );
    return $params;
}
```
