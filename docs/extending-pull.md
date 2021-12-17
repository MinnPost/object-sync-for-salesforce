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

The result of this filter is not processed in any way by the plugin before it is sent to the Salesforce API, so if you filter the query once it is a string, make sure the query has no errors before using it.

### Hook

`object_sync_for_salesforce_pull_query_string_modify` allows you to change the SOQL query string before it is sent to Salesforce.

```php
/**
// Example to change the order to descending
*
* @param string $query The SOQL query string
* @param array $query_parameters array of parameters about the query. Includes Salesforce object type (a string), fields (an array of Salesforce fields), the order (an array), the query limit (an integer), the query offset (an integer), and the conditions applied to the query (an array). 
*/
add_filter( 'object_sync_for_salesforce_pull_query_string_modify', 'change_pull_query', 10, 2 );
function change_pull_query_string( $query, $query_parameters ) {
	$query = str_replace( 'ASC', 'DESC', $query);
	return $query;
}
```

## Last Modified Date

When the plugin makes a pull request to Salesforce, it uses the last time it ran (or when it was activated, if it hasn't run yet) as the oldest date for records to pull. This filter allows developers to set the "last pull date" to any datetime value, including a datetime from before the plugin was activated.

### Hook

When passing a value with this hook, it needs to be in the format `Y-m-d\TH:i:s\Z`. The plugin converts its own value to a GMT date, so you may want to keep up with this precedent for consistency.

Note: if you change this value using the hook, the plugin will store it when it saves queries. This means that if you use the filter and then decide you don't want to use the filter, you'll need to reset this date. You can do this in one of two ways:

1. Resave your fieldmap.
2. Run the filter without a date parameter. For example, if you use `$pull_trigger_field_value = gmdate( 'Y-m-d\TH:i:s\Z' );`, the value will be reset to the value of `now()`, and once that value is saved, you can stop using the filter.

```php
// example to use another datetime value.
// the value needs to be a gmdate, formatted for Salesforce: 'Y-m-d\TH:i:s\Z'.
add_filter( 'object_sync_for_salesforce_change_pull_date_value', 'change_pull_date_value', 10, 5 );
// can always reduce this number if all the arguments are not necessary
function change_pull_date_value( $pull_trigger_field_value, $object_type, $soql, $fieldmap_id ) {
	if ( 'Contact' === $object_type  ) {
		// example: go back to 2006-01-01T23:01:01+01:00, which is 1136152861.
		$pull_trigger_field_value = gmdate( 'Y-m-d\TH:i:s\Z', 1136152861 );
	}
	return $pull_trigger_field_value;
}
```
