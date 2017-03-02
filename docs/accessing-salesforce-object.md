# Accessing the Salesforce API object

If you need to use the Salesforce API object outside this plugin, it is easily accessible. Once you have it in your theme/plugin/etc, you can run any call against it that is available in the [`saleforce`](../classes/salesforce_pull.php) class.

## Code example

```
if ( ! function_exists( 'is_plugin_active' ) ) {
    require_once( ABSPATH . '/wp-admin/includes/plugin.php' );
}
if ( is_plugin_active('salesforce-rest-api/salesforce-rest-api.php') ) {
    require_once plugin_dir_path( __FILE__ ) . '../salesforce-rest-api/salesforce-rest-api.php';
    $salesforce = Salesforce_Rest_API::get_instance();
    $salesforce_api = $salesforce->salesforce['sfapi'];
    $mail = $wordpress_object['user_email'];
    $query = "SELECT Primary_Contact__c FROM Email__c WHERE Email_Address__c = '$mail'";
    $result = $salesforce_api->query( $query );
}
```

