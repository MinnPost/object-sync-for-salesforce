# Extending roles

If you have more user roles that need to be able to configure Salesforce (this is probably most useful if you have created custom roles) you can use the `object_sync_for_salesforce_roles_configure_salesforce` hook.

This hook runs when the plugin is first activated, so you'll need to de/reactivate the plugin if you need to change this.

## Code example

This example would give editor users the capability to configure Salesforce as well.

```php
add_filter( 'object_sync_for_salesforce_roles_configure_salesforce', 'add_more_roles', 10, 1 );
function add_more_roles( $roles ) {
    $roles = array( 'editor' );
    // or $roles[] = 'editor';
    return $roles;
}
```

This hook also runs on the deactivate process, so if you permanently remove the plugin the capability is not left lingering in WordPress.
