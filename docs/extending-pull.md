# Extending the Salesforce Pull

When the plugin makes a call to the Salesforce API, it runs a SOQL query using a SOQL query object. Developers can modify this query before it runs.

## Hook

`object_sync_for_salesforce_pull_query_modify` allows you to change the SOQL query before it is sent to Salesforce.

```php
// quick example to change the order to descending
add_filter( 'object_sync_for_salesforce_pull_query_modify', 'change_pull_query', 10, 6 );
// can always reduce this number if all the arguments are not necessary
function change_pull_query( $soql, $type, $salesforce_mapping, $mapped_fields, $salesforce_mapping, $mapped_fields ) {
	$soql->order = 'DESC';
	return $soql;
}
```
