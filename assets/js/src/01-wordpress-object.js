/**
 * Generate record type choices for the WordPress object
 * This includes possible statuses to choose from, and whether or not there are drafts
 * @param {string} wordpressObject the WordPress object name
 * @param {bool} change is this a change or a pageload
 */
function wordpressObjectRecordSettings( wordpressObject, change ) {
	var data = {
		'action': 'get_wordpress_object_description',
		'include': [ 'statuses', 'drafts' ],
		'wordpress_object': wordpressObject
	};

	// for default status picker
	var selectStatusesContainer  = '.sfwp-m-wordpress-statuses';
	var selectStatusField = '#sfwp-default-status';
	var statusFieldOptions = '';
	var firstStatusOption = $( selectStatusField + ' option' ).first().text();

	// for draft settings
	var draftContainer = 'sfwp-m-wordpress-drafts';
	var draftFieldGroup = draftContainer + draftContainer + '-' + wordpressObject + ' .sfwp-m-single-checkboxes';
	var draftOptions = '';
	var draftMarkup = '';

	// hide the containers first in case they're empty
	$( selectStatusesContainer ).addClass( 'wordpress-statuses-template' );
	$( '.' + draftContainer ).addClass( 'sfwp-m-drafts-template' );
	$( '.' + draftContainer ).addClass( draftContainer );
	if ( true === change ) {
		$( draftFieldGroup + ' input[type="checkbox"]' ).prop( 'checked', false );
	}

	if ( '' !== $( selectStatusField ).val() ) {
		$( selectStatusesContainer ).removeClass( 'wordpress-statuses-template' );
	} else {
		firstStatusOption = '<option value="">' + firstStatusOption + '</option>';
		statusFieldOptions += firstStatusOption;
	}

	if ( 0 < $( draftFieldGroup + 'input:checked' ).length ) {
		$( '.' + draftContainer ).removeClass( 'sfwp-m-drafts-template' );
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
					statusFieldOptions += '<option value="' + index + '">' + value + '</option>';
				} );
				$( selectStatusField ).html( statusFieldOptions );
			}
			if ( 0 < $( response.data.drafts ).length ) {
				$( '.' + draftContainer ).removeClass( 'sfwp-m-drafts-template' );
			}
		},
		complete: function() {
			$( '.spinner-wordpress' ).removeClass( 'is-active' );
			if ( firstStatusOption !== statusFieldOptions ) {
				$( selectStatusesContainer ).removeClass( 'wordpress-statuses-template' );
			}
		}
	} );
}

// load record type settings if the WordPress object changes
$( document ).on( 'change', 'select#sfwp-wordpress-object', function() {
	var wordpressObject = this.value;
	wordpressObjectRecordSettings( wordpressObject, true );
} );

/**
 * When the plugin loads:
 * Manage the display for WordPress record type settings
 */
$( document ).ready( function() {

	// Load record type settings for the WordPress object
	wordpressObjectRecordSettings( $( 'select#sfwp-wordpress-object' ).val(), false );
} );
