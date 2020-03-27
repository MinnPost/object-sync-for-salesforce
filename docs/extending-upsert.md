# Extending upsert

By default, an upsert happens if a prematch field has the same value in WordPress and Salesforce. For example, if you are mapping a WordPress user to a Salesforce Contact, and one of the fields is for an email address.

In this case, an upsert query will happen in either system. A `push` will look for a Salesforce Contact that has the same email address as the WordPress user. A `pull`, it will look for a WordPress user with the same email address as the Salesforce Contact. If it finds one, it will update instead of creating a new record.

## Hooks

Several hooks in the plugin expand how upsert works. They can be used with `push` or `pull` events, depending on the hook.

### Change the key or value for the upsert match

Use the `object_sync_for_salesforce_modify_upsert_key` hook to change an upsert key, or what the field is, by which an object should be matched. This only runs when an upsert operation is already running.

Use the `object_sync_for_salesforce_modify_upsert_value` hook to change an upsert value, or what the field value is, by which an object should be matched. This only runs when an upsert operation is already running.

### Make a custom function for matching items

This allows you to run entirely different functions to change what happens on an upsert. The `object_sync_for_salesforce_find_wp_object_match` runs on a `pull`, when the change happens in Salesforce. The `object_sync_for_salesforce_find_sf_object_match` runs on a `push`, when the change happens in WordPress.

#### Example

This is an example where email fields are mapped between Salesforce Contacts and WordPress users. But in this case, there is a custom Salesforce object for email addresses that allows Contacts to have multiple email addresses.

The hook use expands the matching to check any of the email addresses associated with that Contact, and return the Contact ID for the object map if a match is found.

```php
add_filter( 'object_sync_for_salesforce_find_sf_object_match', 'find_sf_object_match', 10, 4 );
function find_sf_object_match( $salesforce_id, $wordpress_object, $mapping = array(), $action ) {
    if ( $action === 'push' && $mapping['wordpress_object'] === 'user' ) {
        if ( is_object( $this->salesforce ) ) {
            $salesforce_api = $this->salesforce->salesforce['sfapi'];
        } else {
            $salesforce = $this->salesforce();
            $salesforce_api = $salesforce->salesforce['sfapi'];
        }

        if ( is_object( $salesforce_api ) ) {

            // we want to see if the user's email address exists as a primary on any contact and use that contact if so
            $mail = $wordpress_object['user_email'];
            $query = "SELECT Primary_Contact__c FROM Email__c WHERE Email_Address__c = '$mail'";
            $result = $salesforce_api->query( $query );

            if ( $result['data']['totalSize'] === 1 ) {
                $salesforce_id = $result['data']['records'][0]['Primary_Contact__c'];
            }
        }
    }

    return $salesforce_id;
}
```

