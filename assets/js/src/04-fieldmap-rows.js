
/**
 * Duplicates the fields for a new row in the fieldmap options screen.
 * this appears not to work with data() instead of attr()
 */
 function addFieldMappingRow( button ) {
	var salesforceObject = $( '#sfwp-salesforce-object' ).val();
	var wordpressObject = $( '#sfwp-salesforce-wordpress' ).val();
	var newKey = new Date().getUTCMilliseconds();
	var lastRow = $( '.sfwp-a-fieldmap-values' ).last();
	var oldKey = lastRow.attr( 'data-key' );
	oldKey = new RegExp( oldKey, 'g' );
	if ( '' !== wordpressObject && '' !== salesforceObject ) {
		fieldmapFields( oldKey, newKey, lastRow );
		button.parent().find( '.missing-object' ).remove();
		button.text( button.data( 'add-more' ) );
	} else {
		button.text( button.data( 'add-first' ) );
		button.parent().prepend( '<div class="error missing-object"><span>' + button.data( 'error-missing-object' ) + '</span></div>' );
	}
	return false;
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
		nextRow = lastRow.find( 'select' ).select2( 'destroy' ).end().clone( true ).removeClass( 'sfwp-a-fieldmap-values-template' );
	} else {
		nextRow = lastRow.find( 'select' ).end().clone( true ).removeClass( 'sfwp-a-fieldmap-values-template' );
	}
	console.log('nextRow key is ' + newKey);
	$( nextRow ).attr( 'data-key', newKey );
	$( nextRow ).each( function() {
		$( this ).html( function( i, h ) {
			return h.replace( oldKey, newKey );
		} );
	} );
	$( '.sfwp-m-fieldmap-fields' ).append( nextRow );
	if ( jQuery.fn.select2 ) {
		lastRow.find( 'select' ).select2({ width: '100%' });
		nextRow.find( 'select' ).select2({ width: '100%' });
	}
}

// load available options if the WordPress object changes
$( document ).on( 'change', '.sfwp-fieldmap-wordpress-field select', function() {
	disableAlreadyMappedFields( 'wordpress' );
} );
// load available options if the Salesforce object changes
$( document ).on( 'change', '.sfwp-fieldmap-salesforce-field select', function() {
	disableAlreadyMappedFields( 'salesforce' );
} );

/**
 * Disable fields that are already mapped from being mapped again.
 * @param {string} system whether we want WordPress or Salesforce data
 */
function disableAlreadyMappedFields( system ) {
	// load the select statements for Salesforce or WordPress.
	var select = $( '.fieldmap-disable-mapped-fields .sfwp-fieldmap-' + system + '-field select' );
	var allSelected = [];
	// add each currently selected value to an array, then make it unique.
	select.each( function( i, fieldChoice ) {
		var selectedValue = $( fieldChoice ).find( 'option:selected' ).val();
		if ( null !== selectedValue && '' !== selectedValue ) {
			allSelected.push( selectedValue );
		}
	});
	allSelected = allSelected.filter((v, i, a) => a.indexOf(v) === i);
	// disable the items that are selected in another select, enable them otherwise.
	$( 'option', select ).removeProp( 'disabled' );
	$( 'option', select ).prop( 'disabled', false );
	$.each( allSelected, function( key, value ) {
		$( 'option[value=' + value + ']:not(:selected)', select ).prop( 'disabled', true );
	} );
	// reinitialize select2 if it's active.
	if ( jQuery.fn.select2 ) {
		$( '.sfwp-fieldmap-' + system + '-field select' ).select2({ width: '100%' });
	}
}

/**
 * Handle click event for the Add another field mapping button.
 * It duplicates the fields for a new row in the fieldmap options screen.
 */
 $( document ).on( 'click', '#add-field-mapping', function() {
	addFieldMappingRow( $( this ) );
} );

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
	var expandedRow = $( '.sfwp-a-fieldmap-values-expanded ');
	if ( jQuery.fn.select2 ) {
		expandedRow.find( 'select' ).select2({ width: '100%' });
	}
} );

/**
 * When clicking delete on a field, offer to delete it
 */
$( document ).on( 'click', '.sfwp-a-fieldmap-field-action-delete', function( event ) {
	//$( this ).closest( '.sfwp-a-fieldmap-values' ).toggleClass( 'sfwp-a-fieldmap-values-deleted' );
} );

/**
 * When the plugin loads:
 * Disable fields that are already selected
 * Select2 on select fields
 */
$( document ).ready( function() {
	// add the postbox JavaScript from Core.
	postboxes.add_postbox_toggles(pagenow);

	// disable the option values for fields that have already been mapped.
	disableAlreadyMappedFields( 'salesforce' );
	disableAlreadyMappedFields( 'wordpress' );

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
