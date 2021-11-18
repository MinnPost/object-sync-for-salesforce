# Extending the Salesforce Pull

## SOQL Object

When the plugin makes a call to the Salesforce API, it runs a SOQL query using a SOQL query object. Developers can modify this query object before it runs.

### Hook

`object_sync_for_salesforce_pull_query_modify` allows you to change the SOQL query object before it is sent to Salesforce.

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

## SOQL String

Before the plugin makes a call to the Salesforce API, it converts the SOQL query to a string. Developers can modify this query string, giving them full control of the query before it runs.

The result of this filter is not processed by the plugin before it is sent to the Salesforce API, so make sure the query has no errors before using it.

### Hook

`object_sync_for_salesforce_pull_query_string_modify` allows you to change the SOQL query string before it is sent to Salesforce.

```php
/**
// Example to change the order to descending
*
* @param string $soql_string
*   The SOQL query string
* @param object $soql
*   The SOQL query object
* @param string $object_type
*   Salesforce object type
* @param array $salesforce_mapping
*   The map between the WordPress and Salesforce object types
* @param array $mapped_fields
*   The fields that are mapped between these objects
* @return string $soql_string
*   The SOQL query string
*/
add_filter( 'object_sync_for_salesforce_pull_query_string_modify', 'change_pull_query_string', 10, 5 );
// can always reduce this number if all the arguments are not necessary
function change_pull_query_string( $soql_string, $soql, $type, $salesforce_mapping, $mapped_fields ) {
	$soql_string = str_replace( 'ASC', 'DESC', $soql_string);
	return $soql_string;
}
```
