# Extending the Salesforce Pull

When the plugin makes a call to the Salesforce API, it runs a SOQL query using a SOQL query object. Developers can modify this query before it runs.

## Hook

`object_sync_for_salesforce_pull_query_modify` allows you to change the SOQL query before it is sent to Salesforce.

```php
/**
// Example to change the order to descending
*
* @param object $soql
*   The SOQL query object
* @param string $object_type
*   Salesforce object type
* @param array $salesforce_mapping
*   The map between the WordPress and Salesforce object types
* @param array $mapped_fields
*   The fields that are mapped between these objects
* @return object $soql
*   The SOQL query object
*/
add_filter( 'object_sync_for_salesforce_pull_query_modify', 'change_pull_query', 10, 4 );
// can always reduce this number if all the arguments are not necessary
function change_pull_query( $soql, $type, $salesforce_mapping, $mapped_fields ) {
	$soql->order = 'DESC';
	return $soql;
}
```
