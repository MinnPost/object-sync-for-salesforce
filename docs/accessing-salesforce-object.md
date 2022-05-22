# Accessing the Salesforce API object

If you need to use the Salesforce API object outside this plugin, it is accessible. Once you have it in your theme/plugin/etc, you can run any call against it that is available in the [`Object_Sync_Sf_Salesforce`](../classes/class-object-sync-sf-salesforce.php) class.

## Code example

```php
if ( ! function_exists( 'is_plugin_active' ) ) {
    require_once( ABSPATH . '/wp-admin/includes/plugin.php' );
}
if ( is_plugin_active('object-sync-for-salesforce/object-sync-for-salesforce.php') ) {
    require_once plugin_dir_path( __FILE__ ) . '../object-sync-for-salesforce/object-sync-for-salesforce.php';
    if ( function_exists( 'object_sync_for_salesforce' ) ) {
        $salesforce = object_sync_for_salesforce();
        $salesforce_api = $salesforce->salesforce['sfapi'];
        $mail = $wordpress_object['user_email'];
        $query = "SELECT Primary_Contact__c FROM Email__c WHERE Email_Address__c = '$mail'";
        $result = $salesforce_api->query( $query );
    }
}
```
