/**
 * Generates the Salesforce object fields based on the dropdown activity and API results.
 * This also generates other query fields that are object-specific, like date fields, record types allowed, etc.
 */
function salesforceObjectFields() {

	var delay = ( function() {
		var timer = 0;
		return function( callback, ms ) {
			clearTimeout ( timer );
			timer = setTimeout( callback, ms );
		};
	}() );

	if ( 0 === $( '.salesforce_record_types_allowed > *' ).length ) {
		$( '.salesforce_record_types_allowed' ).hide();
	}

	if ( 0 === $( '.salesforce_record_type_default > *' ).length ) {
		$( '.salesforce_record_type_default' ).hide();
	}
	if ( 0 === $( '.pull_trigger_field > *' ).length ) {
		$( '.pull_trigger_field' ).hide();
	}

	$( '#salesforce_object' ).on( 'change', function() {
		var that = this;
		var delayTime = 1000;
		delay( function() {
			var data = {
				'action': 'get_salesforce_object_description',
				'include': [ 'fields', 'recordTypeInfos' ],
				'field_type': 'datetime',
				'salesforce_object': that.value
			};
			$.post( ajaxurl, data, function( response ) {
				var recordTypesAllowedMarkup = '';
				var recordTypeDefaultMarkup = '';
				var dateMarkup = '';
				if ( 0 < $( response.data.recordTypeInfos ).length ) {
					recordTypesAllowedMarkup += '<label for="salesforce_record_types_allowed">Allowed Record Types:</label><div class="checkboxes">';
					$.each( response.data.recordTypeInfos, function( index, value ) {
						recordTypesAllowedMarkup += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
					} );
					recordTypesAllowedMarkup += '</div>';
					recordTypeDefaultMarkup += '<label for="salesforce_record_type_default">Default Record Type:</label>';
					recordTypeDefaultMarkup += '<select name="salesforce_record_type_default" id="salesforce_record_type_default"><option value="">- Select record type -</option>';
					$.each( response.data.recordTypeInfos, function( index, value ) {
						recordTypeDefaultMarkup += '<option value="' + index + '">' + value + '</option>';
					} );
				}
				$( '.salesforce_record_types_allowed' ).html( recordTypesAllowedMarkup );
				$( '.salesforce_record_type_default' ).html( recordTypeDefaultMarkup );
				if ( 0 < $( response.data.fields ).length ) {
					dateMarkup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
					dateMarkup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>';
					$.each( response.data.fields, function( index, value ) {
						var fieldLabel = '';
						if ( 'undefined' !== typeof value.label ) {
							fieldLabel = value.label;
						} else {
							fieldLabel = value.name;
						}
						dateMarkup += '<option value="' + value.name + '">' + fieldLabel + '</option>';
					} );
					dateMarkup += '</select>';
					dateMarkup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>';
				}
				$( '.pull_trigger_field' ).html( dateMarkup );
				if ( '' !== recordTypesAllowedMarkup ) {
					$( '.salesforce_record_types_allowed' ).show();
				} else {
					$( '.salesforce_record_types_allowed' ).hide();
				}
				if ( '' !== recordTypeDefaultMarkup ) {
					$( '.salesforce_record_type_default' ).show();
				} else {
					$( '.salesforce_record_type_default' ).hide();
				}
				if ( '' !== dateMarkup ) {
					$( '.pull_trigger_field' ).show();
				} else {
					$( '.pull_trigger_field' ).hide();
				}
				if ( jQuery.fn.select2 ) {
					$( 'select#salesforce_record_type_default' ).select2();
					$( 'select#pull_trigger_field' ).select2();
				}
			} );
		}, delayTime );
	} );
}

/**
 * When the plugin loads:
 * Manage the display for Salesforce object fields based on API response
 */
$( document ).ready( function() {

	// get the available Salesforce object choices
	salesforceObjectFields();
} );
