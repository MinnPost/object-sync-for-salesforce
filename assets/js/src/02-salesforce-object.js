/**
 * Generate record type choices for the Salesforce object
 * This includes record types allowed and date fields.
 * @param {string} salesforceObject the Salesforce object name
 * @param {bool} change is this a change or a pageload
 */
function salesforceObjectRecordSettings( salesforceObject, change ) {
	var data = {
		'action': 'get_salesforce_object_description',
		'include': [ 'fields', 'recordTypeInfos' ],
		'field_type': 'datetime',
		'salesforce_object': salesforceObject
	};

	// for allowed types and default type
	var allowedTypesContainer = 'sfwp-m-salesforce-record-types-allowed';
	var allowedTypesFieldGroup = '.' + allowedTypesContainer + '.' + allowedTypesContainer + '-' + salesforceObject + ' .checkboxes';
	var allowedTypeOptions = '';
	var recordTypesAllowedMarkup = '';
	var recordTypeDefaultMarkup = '';

	// for date fields
	var selectDateContainer = '.sfwp-m-pull-trigger-field';
	var selectDateField = '#sfwp-pull-trigger-field';
	//var selectDateField = '.sfwp-m-pull-trigger-field.sfwp-m-pull-trigger-field-' + salesforceObject + ' #sfwp-pull-trigger-field';
	var dateFieldOptions = '';
	var firstDateOption = $( selectDateField + ' option' ).first().text();

	// add the Salesforce object we're looking at to the allowed types container
	$( '.' + allowedTypesContainer ).attr( 'class', 'sfwp-m-fieldmap-subgroup ' + allowedTypesContainer ).addClass( allowedTypesContainer + '-' + salesforceObject );
	// hide the containers first in case they're empty
	$( '.' + allowedTypesContainer ).addClass( 'record-types-allowed-template' );
	$( selectDateContainer ).addClass( 'pull-trigger-field-template' );
	defaultRecordTypeSettings();
	if ( true === change ) {
		$( allowedTypesFieldGroup + ' input[type="checkbox"]' ).prop( 'checked', false );
		$( selectDateField ).val( '' );
	}
	
	if ( 0 < $( allowedTypesFieldGroup + 'input:checked' ).length ) {
		$( allowedTypesContainer ).removeClass( 'record-types-allowed-template' );
	}

	if ( '' !== $( selectDateField ).val() ) {
		$( selectDateContainer ).removeClass( 'pull-trigger-field-template' );
	} else {
		firstDateOption = '<option value="">' + firstDateOption + '</option>';
		dateFieldOptions += firstDateOption;
	}

	$.ajax( {
		type: 'POST',
		url: ajaxurl,
		data: data,
		beforeSend: function() {
			$( '.spinner-salesforce' ).addClass( 'is-active' );
		},
		success: function( response ) {
			if ( 0 < $( response.data.recordTypeInfos ).length ) {
				$.each( response.data.recordTypeInfos, function( index, value ) {
					allowedTypeOptions += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
				} );
			}
			$( allowedTypesFieldGroup ).html( allowedTypeOptions );
			if ( 0 < $( response.data.fields ).length && '' !== dateFieldOptions ) {
				$.each( response.data.fields, function( index, value ) {
					dateFieldOptions += '<option value="' + value.name + '">' + value.label + '</option>';
				} );
				$( selectDateField ).html( dateFieldOptions );
			}
		},
		complete: function() {
			$( '.spinner-salesforce' ).removeClass( 'is-active' );
			if ( '' !== allowedTypeOptions ) {
				$( '.' + allowedTypesContainer ).removeClass( 'record-types-allowed-template' );
			}
			if ( firstDateOption !== dateFieldOptions ) {
				$( selectDateContainer ).removeClass( 'pull-trigger-field-template' );
			}
		}
	} );
}

/**
 * Allow for picking the default record type, when a Salesforce object has record types.
 */
function defaultRecordTypeSettings( allowedTypesContainer ) {
	var selectContainer = $( '.sfwp-m-salesforce-record-type-default' );
	var selectDefaultField = '#sfwp-salesforce-record-type-default';
	var recordTypeFields = '';
	var firstRecordTypeField = $( selectDefaultField + ' option' ).first().text();
	var selected = '';
	recordTypeFields += '<option value="">' + firstRecordTypeField + '</option>';
	if ( 0 === $( '.' + allowedTypesContainer + ' input[type="checkbox"]:checked' ).length ) {
		selectContainer.addClass( 'record-type-default-template' );
		return;
	}
	$( '.' + allowedTypesContainer + ' input[type="checkbox"]:checked' ).each( function( index ) {
		if ( 1 === $( '.' + allowedTypesContainer + ' input[type="checkbox"]:checked' ).length ) {
			selected = ' selected';
		}
		recordTypeFields += '<option value="' + $( this ).val() + '"' + selected +'>' + $( this ).closest( 'label' ).text() + '</option>';
	} );
	$( selectDefaultField ).html( recordTypeFields );
	if ( 1 < $( '.' + allowedTypesContainer + ' input[type="checkbox"]:checked' ).length ) {
		selectContainer.removeClass( 'record-type-default-template' );
	}
};

// load record type settings if the Salesforce object changes
$( document ).on( 'change', 'select#sfwp-salesforce-object', function() {
	var salesforceObject = this.value;
	salesforceObjectRecordSettings( salesforceObject, true );
} );

// load record type default choices if the allowed record types change
$( document ).on( 'change', '.sfwp-m-salesforce-record-types-allowed input[type="checkbox"]', function() {
	defaultRecordTypeSettings( 'sfwp-m-salesforce-record-types-allowed' );
} );

/**
 * When the plugin loads:
 * Manage the display for Salesforce record type settings
 */
$( document ).ready( function() {

	// Load record type settings for the Salesforce object
	salesforceObjectRecordSettings( $( 'select#sfwp-salesforce-object' ).val(), false );
} );
