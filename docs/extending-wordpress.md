# Extending WordPress data modification

Developers can modify how data is modified in WordPress with several hooks.

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

Developers can use the `salesforce_rest_api_create_custom_wordpress_item` hook to create objects with their own methods.

#### Code example

```
add_filter( 'salesforce_rest_api_create_custom_wordpress_item', add_object, 10, 1 );
function add_object( $create_data ) {
    // $create_data is array( 'name' => objecttype, 'params' => array_of_params, 'id_field' => idfield )
    // run methods here to add the record to the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```
$result = array(
    'data' => array(
        $id_field => $post_id, // example here is 'ID' => 867. $id_field is the key in the database; $post_id is the value
        'success' => $success // $success is a boolean value you should have already set
    ),
    'errors' => $errors
);
```

### Upsert

Developers can use the `salesforce_rest_api_upsert_custom_wordpress_item` hook to upsert objects with their own methods.

#### Code example

```
add_filter( 'salesforce_rest_api_upsert_custom_wordpress_item', add_object, 10, 1 );
function upsert_object( $create_data ) {
    /* $upsert_data is like this:
    array(
        'key' => $key,
        'value' => $value,
        'methods' => $methods,
        'params' => $params,
        'id_field' => $id_field,
        'push_drafts' => $push_drafts,
        'name' => $name 
    );
    */
    // run methods here to upsert record in the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```
$result = array(
    'data' => array(
        $id_field => $post_id, // example here is 'ID' => 867. $id_field is the key in the database; $post_id is the value
        'success' => $success // $success is a boolean value you should have already set
    ),
    'errors' => $errors
);
```

### Update

Developers can use the `salesforce_rest_api_update_custom_wordpress_item` hook to update objects with their own methods.

#### Code example

```
add_filter( 'salesforce_rest_api_update_custom_wordpress_item', update_object, 10, 1 );
function update_object( $update_data ) {
    // $update_data is array( 'name' => objecttype, 'params' => array_of_params, 'id_field' => idfield )
    // run methods here to update the record in the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```
$result = array(
    'data' => array(
        $id_field => $post_id, // example here is 'ID' => 867. $id_field is the key in the database; $post_id is the value
        'success' => $success // $success is a boolean value you should have already set
    ),
    'errors' => $errors
);
```

### Delete

Developers can use the `salesforce_rest_api_delete_custom_wordpress_item` hook to update objects with their own methods.

#### Code example

```
add_filter( 'salesforce_rest_api_delete_custom_wordpress_item', delete_object, 10, 1 );
function delete_object( $delete_data ) {
    // $delete_data is array( 'name' => objecttype, 'id_field' => idfield )
    // run methods here to delete the record from the database
    // save the result as $result
    return $result;
}
```

In the example above, the returned `$result` needs to be an array.

```
$result = array(
    'data' => array(
        'success' => $success // the returned $success is an object of the correct type, or a FALSE
    ),
    'errors' => $errors
);
```

### For attachments

If you are adding attachments to WordPress that come from Salesforce, you may need to do more than the default behavior, depending on exactly what data you have stored in Salesforce already.

To facilitate this, there is the `salesforce_rest_api_set_initial_attachment_data` hook.

#### Code example:

```
add_filter( 'salesforce_rest_api_set_initial_attachment_data', set_attachment, 10, 1 );
function set_attachment( $params ) {
    // set up the parameters available for an attachment
    // the parameters will be stored based on the methods they use
    // ex:
    $params[$key] = array(
        'value' => $value,
        'method_modify' => $method_modify,
        'method_create' => $method_create,
        'method_read' => $methods['method_read']
    );
    return $params;
}
```
