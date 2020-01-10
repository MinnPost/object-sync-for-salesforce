/**
 * Generate record type choices for the WordPress object
 * This includes possible statuses to choose from, and whether or not there are drafts
 * @param {string} wordpressObject the WordPress object name
 * @param {bool} change is this a change or a pageload
 */
function wordpressObjectRecordSettings( wordpressObject, change ) {
	var data = {
		'action': 'get_wordpress_object_description',
		'include': [ 'statuses' ],
		//'field_type': 'datetime',
		'wordpress_object': wordpressObject
	};

	// for default status picker
	var statusesContainer = '.sfwp-m-wordpress-statuses';
	var statusesFieldGroup = '.' + statusesContainer + '.' + statusesContainer + '-' + wordpressObject + ' #sfwp-default-status';
	var statusOptions = '';
	var statusesMarkup = '';

	// for draft settings
	var draftContainer = '.sfwp-m-wordpress-drafts';
	var draftFieldGroup = '.' + draftContainer + '.' + draftContainer + '-' + wordpressObject + ' .checkbox';
	var draftOption = '';
	var draftMarkup = '';

	// add the WordPress object we're looking at to the status container
	$( statusesContainer ).attr( 'class', 'sfwp-m-fieldmap-group-fields select ' + statusesContainer ).addClass( statusesContainer + '-' + wordpressObject );
	// hide the containers first in case they're empty
	$( statusesContainer ).addClass( 'wordpress-statuses-template' );
	$( draftContainer ).addClass( 'sfwp-m-drafts-template' );
	if ( true === change ) {
		$( statusesFieldGroup + ' input[type="checkbox"]' ).prop( 'checked', false );
		$( draftFieldGroup + ' input[type="checkbox"]' ).prop( 'checked', false );
	}
	
	if ( 0 < $( statusesFieldGroup + 'input:checked' ).length ) {
		$( statusesContainer ).removeClass( 'wordpress-statuses-template' );
	}

	if ( 0 < $( draftFieldGroup + 'input:checked' ).length ) {
		$( draftContainer ).removeClass( 'sfwp-m-drafts-template' );
	}

	$.ajax( {
		type: 'POST',
		url: ajaxurl,
		data: data,
		beforeSend: function() {
			$( '.spinner-wordpress' ).addClass( 'is-active' );
		},
		success: function( response ) {
			if ( 0 < $( response.data.statuses ).length ) {
				$.each( response.data.statuses, function( index, value ) {
					allowedTypeOptions += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
				} );
			}
			$( allowedTypesFieldGroup ).html( allowedTypeOptions );

			// hold onto this
			array1.filter(value => -1 !== array2.indexOf(value))

		},
		complete: function() {
			$( '.spinner-wordpress' ).removeClass( 'is-active' );
			if ( '' !== allowedTypeOptions ) {
				$( allowedTypesContainer ).removeClass( 'record-types-allowed-template' );
			}
			if ( firstDateOption !== dateFieldOptions ) {
				$( selectDateContainer ).removeClass( 'pull-trigger-field-template' );
			}
		}
	} );
}

/**
 * When the plugin loads:
 * Manage the display for WordPress record type settings
 */
$( document ).ready( function() {

	// Load record type settings for the WordPress object
	wordpressObjectRecordSettings( $( 'select#sfwp-wordpress-object' ).val(), false );
} );
