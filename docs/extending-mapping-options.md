# Extending mapping

Developers can modify how mapping between objects works with several hooks.

## Available WordPress objects

There are many ways of adding custom WordPress objects, and there are also sometimes objects that will never be mapped to Salesforce. Use these hooks to modify what objects are available in the WordPress Object dropdown when adding/editing fieldmaps.

### Add more objects

The `salesforce_rest_api_add_more_wordpress_types` hook populates an array which is then added to the list in the dropdown.

```
add_filter( 'salesforce_rest_api_add_more_wordpress_types', 'add_more_types', 10, 1 );
function add_more_types( $more_types ) {
    $more_types = array( 'foo' );
    // or $more_types[] = 'foo';
    return $more_types;
}
```

The `salesforce_rest_api_remove_wordpress_types` hook populates an array which is used to remove objects from the list in the dropdown.

```
add_filter( 'salesforce_rest_api_remove_wordpress_types', 'remove_types', 10, 1 );
function remove_types( $types_to_remove ) {
    $types_to_remove = array( 'acme_product' );
    // or $types_to_remove[] = 'acme_product';
    return $types_to_remove;
}
```

In the above examples, an object called `foo` would be added to the dropdown, and an existing object called `acme_product` would be removed.

## Available WordPress fields

The `salesforce_rest_api_wordpress_object_fields` hook populates an array of fields for a given object, which is then added to the list in the dropdown. This array is also used in several other parts of the plugin, so its structure is more complex.

Example of `$object_fields` array:

```
$object_fields = array(
    'data' => array ( // this array determines what methods each field uses to deal with its data
        array (
            'key' => 'ID',
            'table' => 'wp_users',
            'methods' => array (
                'create' => 'wp_insert_user',
                'read' => 'get_user_by',
                'update' => 'wp_update_user',
                'delete' => 'wp_delete_user'
            )
        ),
        array (
            'key' => 'user_login',
            'table' => 'wp_users',
            'methods' => array (
                'create' => 'wp_insert_user',
                'read' => 'get_user_by',
                'update' => 'wp_update_user',
                'delete' => 'wp_delete_user'
            )
        ),
        array (
            'key' => 'user_email',
            'table' => 'wp_users',
            'methods' => array (
                'create' => 'wp_insert_user',
                'read' => 'get_user_by',
                'update' => 'wp_update_user',
                'delete' => 'wp_delete_user'
            )
        ),
        array (
            'key' => 'wp_capabilities',
            'table' => 'wp_usermeta',
            'methods' => array (
                'create' => 'update_user_meta',
                'read' => 'get_user_meta',
                'update' => 'update_user_meta',
                'delete' => 'delete_user_meta'
            )
        ),
        array (
            'key' => 'wp_user_level',
            'table' => 'wp_usermeta',
            'methods' => array (
                'create' => 'update_user_meta',
                'read' => 'get_user_meta',
                'update' => 'update_user_meta',
                'delete' => 'delete_user_meta'
            )
        ),
        array (
            'key' => 'first_name',
            'table' => 'wp_usermeta',
            'methods' => array (
                'create' => 'update_user_meta',
                'read' => 'get_user_meta',
                'update' => 'update_user_meta',
                'delete' => 'delete_user_meta'
            )
        ),
        array (
            'key' => 'last_name',
            'table' => 'wp_usermeta',
            'methods' => array (
                'create' => 'update_user_meta',
                'read' => 'get_user_meta',
                'update' => 'update_user_meta',
                'delete' => 'delete_user_meta'
            )
        ),
    ),
    'from_cache' => 1, // whether this data is retrieved from the wordpress cache
    'cached' => 1 // whether this data has been stored in a wordpress cache
);
```

To modify the array, you can use the `salesforce_rest_api_wordpress_object_fields` hook.

Code example:

```
add_filter( 'salesforce_rest_api_wordpress_object_fields', 'add_field', 10, 2 );
function add_field( $object_fields, $wordpress_object ) {
    $object_fields[] = array(
        'key' => 'field_foo',
        'table' => 'table_foo',
        'methods' => array (
            'create' => 'foo_plugin_create',
            'read' => 'foo_plugin_read',
            'update' => 'foo_plugin_update',
            'delete' => 'foo_plugin_delete'
        )
    );
    return $object_fields;
}
```