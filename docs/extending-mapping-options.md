# Extending mapping

Developers can modify how mapping between objects works with several hooks.

## Available WordPress objects

There are many ways of adding custom WordPress objects, and there are also sometimes objects that will never be mapped to Salesforce. Use these hooks to modify what objects are available in the WordPress Object dropdown when adding/editing fieldmaps.

### Add more objects

The `object_sync_for_salesforce_add_more_wordpress_types` hook populates the array which is added to the list in the dropdown.

```php
add_filter( 'object_sync_for_salesforce_add_more_wordpress_types', 'add_more_types', 10, 1 );
function add_more_types( $wordpress_object_types ) {
    $wordpress_object_types[] = 'foo'; // this will add to the existing types.
    return $wordpress_object_types; // this returns all wordpress object types to the plugin
}
```

The `object_sync_for_salesforce_remove_wordpress_types` hook populates an array which is used to remove objects from the list in the dropdown.

```php
add_filter( 'object_sync_for_salesforce_remove_wordpress_types', 'remove_types', 10, 1 );
function remove_types( $types_to_remove ) {
    $types_to_remove[] = 'acme_product'; // this adds to the array of types to ignore
    return $types_to_remove;
}
```

In the above examples, an object called `foo` would be added to the dropdown, and an existing object called `acme_product` would be removed.

## Available WordPress fields

The `object_sync_for_salesforce_wordpress_object_fields` hook populates an array of fields for a given object, which is then added to the list in the dropdown. This array is also used in several other parts of the plugin, so its structure is more complex.

Example of `$object_fields` array:

```php
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

To modify the array, you can use the `object_sync_for_salesforce_wordpress_object_fields` hook.

Code example:

```php
add_filter( 'object_sync_for_salesforce_wordpress_object_fields', 'add_field', 10, 2 );
function add_field( $object_fields, $wordpress_object ) {
    $object_fields['data'][] = array(
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

## WordPress object data

The `object_sync_for_salesforce_wordpress_object_data` hook populates an array which retrieves the data about the WordPress item. You can modify this array, which allows you to add data to the item, for example from other sources or your own custom methods, which will then be available to be sent to Salesforce.

When you use this hook, the field needs to exist in WordPress, and already be mapped to a Salesforce field, but this hook allows you to set the data, or modify it (for example with custom formatting or validation or processing) for the WordPress field without it needing to exist in the WordPress interface. For example, you could use this to set the value of a hidden meta field that was mapped using the `object_sync_for_salesforce_wordpress_object_fields` hook.

Example of unaltered `$wordpress_object` array (in this case, for a user):

```php
$wordpress_object = array(
    'ID' => 8675309,
    'user_login' => 'testuser@test.com',
    'user_nicename' => 'testuser@test.com',
    'user_email' => 'testuser@test.com',
    'user_url' => '',
    'user_registered' => '2017-11-20 15:58:07',
    'user_status' => 0,
    'display_name' => 'test user',
    'nickname' => 'testuser@test.com',
    'first_name' => 'test',
    'last_name' => 'user',
    'description' => '',
    'rich_editing' => true,
    'comment_shortcuts' => false,
    'admin_color' => 'fresh',
    'use_ssl' => 0,
    'show_admin_bar_front' => true,
    'locale' => '',
    'wp_capabilities' => array(
        'subscriber' => 1,
    ),
);
```

To modify the array, you can use the `object_sync_for_salesforce_wordpress_object_data` hook.

Code example:

```php
add_filter( 'object_sync_for_salesforce_wordpress_object_data', 'add_data', 10, 1 );
function add_data( $wordpress_object ) {
    $wordpress_object['field_a'] = 'i am a field value that salesforce wants to store but WordPress does not care about';
    return $wordpress_object;
}
```

## Administration interface

Because there can be many fields in a WordPress or Salesforce installation, it can become difficult to find the correct fields for a fieldmap. To make this easier, we've included the [selectWoo](https://woocommerce.wordpress.com/2017/08/08/selectwoo-an-accessible-replacement-for-select2/) library from WooCommerce.

### Changing or disabling this feature

This plugin also includes the [Select2](https://select2.org/) library without requiring any additional files or configuration, and if you'd rather, you can use a developer hook to choose it instead.

You can also choose not to use a library at all, and the plugin will revert to the browser's default `select` tag behavior.

Code example:

```php
add_filter( 'object_sync_for_salesforce_select_library', 'change_select_library', 10, 1 );
function select_library( $select_library ) {
	$select_library = 'select2';
	// this could also be empty; in that case we would just use default browser select
	return $select_library;
}
```
