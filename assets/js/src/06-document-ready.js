/**
 * When the plugin loads, initialize or enable things:
 * Select2 on select fields
 * Clear fields when the targeted WordPress or Salesforce object type changes
 * Manage the display for Salesforce object fields based on API reponse
 * Manual push and pull
 * Clearing the cache
 */
$( document ).ready( function() {

	// Don't show the WSDL file field unless SOAP is enabled
	toggleSoapFields();

	// if there is already a wp or sf object, make sure it has the right fields when the page loads
	loadFieldOptions( 'wordpress', $( 'select#wordpress_object' ).val() );
	loadFieldOptions( 'salesforce', $( 'select#salesforce_object' ).val() );

	// setup the select2 fields if the library is present
	if ( jQuery.fn.select2 ) {
		$( 'select#wordpress_object' ).select2();
		$( 'select#salesforce_object' ).select2();
		$( 'select#salesforce_record_type_default' ).select2();
		$( 'select#pull_trigger_field' ).select2();
		$( '.column-wordpress_field select' ).select2();
		$( '.column-salesforce_field select' ).select2();
	}

	// get the available Salesforce object choices
	salesforceObjectFields();

	// Duplicate the fields for a new row in the fieldmap options screen.
	addFieldMappingRow();

	// Handle manual push and pull of objects
	pushAndPullObjects();

	// Clear the plugin cache via Ajax request.
	clearSfwpCacheLink();
});
