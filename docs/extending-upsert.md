# Extending upsert

By default, an upsert happens if a prematch field has the same value in WordPress and Salesforce. For example, if you are mapping a WordPress user to a Salesforce Contact, and one of the fields is for an email address.

In this case, an upsert query will happen in either system. A `push` will look for a Salesforce Contact that has the same email address as the WordPress user. A `pull`, it will look for a WordPress user with the same email address as the Salesforce Contact. If it finds one, it will update instead of creating a new record.

## Hooks

Several hooks in the plugin expand how upsert works. They can be used with `push` or `pull` events, depending on the hook.

### Change the key or value for the upsert match

salesforce_rest_api_modify_upsert_key
salesforce_rest_api_modify_upsert_value

### Make a custom function for matching items

salesforce_rest_api_find_wp_object_match
salesforce_rest_api_find_sf_object_match




salesforce_rest_api_upsert_custom_wordpress_item (should be somewhere else though)