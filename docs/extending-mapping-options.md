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