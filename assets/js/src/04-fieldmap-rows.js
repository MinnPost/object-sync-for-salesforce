
/**
 * Duplicates the fields for a new row in the fieldmap options screen.
 * this appears not to work with data() instead of attr()
 */
 function addFieldMappingRow() {
	$( '#add-field-mapping' ).click( function() {
		var salesforceObject = $( '#sfwp-salesforce-object' ).val();
		var wordpressObject = $( '#sfwp-wordpress-object' ).val();
		var newKey = new Date().getUTCMilliseconds();
		var lastRow = $( 'table.fields tbody tr' ).last();
		var oldKey = lastRow.attr( 'data-key' );
		oldKey = new RegExp( oldKey, 'g' );
		$( this ).text( 'Add another field mapping' );
		if ( '' !== wordpressObject && '' !== salesforceObject ) {
			fieldmapFields( oldKey, newKey, lastRow );
			$( this ).parent().find( '.missing-object' ).remove();
		} else {
			$( this ).parent().prepend( '<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>' );
		}
		return false;
	} );
}

/**
 * Clones the fieldset markup provided by the server-side template and appends it at the end.
 * this appears not to work with data() instead of attr()
 * @param {string} oldKey the data key attribute of the set that is being cloned
 * @param {string} newKey the data key attribute for the one we're appending
 * @param {object} lastRow the last set of the fieldmap
 */
function fieldmapFields( oldKey, newKey, lastRow ) {
	var nextRow = '';
	if ( jQuery.fn.select2 ) {
		nextRow = lastRow.find( 'select' ).select2( 'destroy' ).end().clone( true ).removeClass( 'fieldmap-template' );
	} else {
		nextRow = lastRow.clone( true );
	}
	console.log('nextRow is ' + nextRow);
	$( nextRow ).attr( 'data-key', newKey );
	$( nextRow ).each( function() {
		$( this ).html( function( i, h ) {
			return h.replace( oldKey, newKey );
		} );
	} );
	$( 'table.fields tbody' ).append( nextRow );
	if ( jQuery.fn.select2 ) {
		lastRow.find( 'select' ).select2();
		nextRow.find( 'select' ).select2();
	}
}

/**
 * As the Drupal plugin does, we only allow one field to be a prematch
 */
$( document ).on( 'click', '.column-is_prematch input', function() {
	$( '.column-is_prematch input' ).not( this ).prop( 'checked', false );
} );

/**
 * As the Drupal plugin does, we only allow one field to be a key
 */
$( document ).on( 'click', '.column-is_key input', function() {
	$( '.column-is_key input' ).not( this ).prop( 'checked', false );
} );

/**
 * When clicking a field action, don't use the default
 */
$( document ).on( 'click', '.sfwp-a-fieldmap-field-action', function( event ) {
	event.preventDefault();
} );

/**
 * When clicking edit on a field, toggle its expanded status
 */
$( document ).on( 'click', '.sfwp-a-fieldmap-field-action-edit', function( event ) {
	$( this ).closest( '.sfwp-a-fieldmap-values' ).toggleClass( 'sfwp-a-fieldmap-values-expanded' );
} );

/**
 * When clicking delete on a field, offer to delete it
 */
$( document ).on( 'click', '.sfwp-a-fieldmap-field-action-delete', function( event ) {
	//$( this ).closest( '.sfwp-a-fieldmap-values' ).toggleClass( 'sfwp-a-fieldmap-values-deleted' );
} );

/**
 * When the plugin loads:
 * Add new fieldmap rows
 * Select2 on select fields
 */
$( document ).ready( function() {

	// Duplicate the fields for a new row in the fieldmap options screen.
	addFieldMappingRow();

	// setup the select2 fields if the library is present
	if ( jQuery.fn.select2 ) {
		$( 'select#sfwp-wordpress-object' ).select2();
		$( 'select#sfwp-default-status' ).select2();
		$( 'select#sfwp-salesforce-object' ).select2();
		$( 'select#sfwp-salesforce-record-type-default' ).select2();
		$( 'select#sfwp-pull-trigger-field' ).select2();
		$( '.sfwp-fieldmap-wordpress-field select' ).select2();
		$( '.sfwp-fieldmap-salesforce-field select' ).select2();
	}
} );
