/**
 * Gets the WordPress and Salesforce field results via an Ajax call
 * @param {string} system whether we want WordPress or Salesforce data
 * @param {string} objectName the value for the object name from the the <select>
 */
function loadFieldOptions( system, objectName ) {
	var data = {
		'action': 'get_' + system + '_object_fields'
	};
	var selectField = '.column-' + system + '_field select';
	var fields = '';
	var firstField = $( selectField + ' option' ).first().text();
	if ( '' !== $( selectField ).val() ) {
		return;
	}
	fields += '<option value="">' + firstField + '</option>';
	if ( 'wordpress' === system ) {
		data['wordpress_object'] = objectName;
	} else if ( 'salesforce' === system ) {
		data['salesforce_object'] = objectName;
	} else {
		return fields;
	}

	$.ajax( {
		type: 'POST',
		url: ajaxurl,
		data: data,
		beforeSend: function() {
			$( '.spinner-' + system ).addClass( 'is-active' );
		},
		success: function( response ) {
			$.each( response.data.fields, function( index, value ) {
				if ( 'wordpress' === system ) {
					fields += '<option value="' + value.key + '">' + value.key + '</option>';
				} else if ( 'salesforce' === system ) {
					fields += '<option value="' + value.name + '">' + value.label + '</option>';
				}
			} );
			$( selectField ).html( fields );
		},
		complete: function() {
			$( '.spinner-' + system ).removeClass( 'is-active' );
		}
	} );
}

// load available options if the wordpress object changes
$( document ).on( 'change', 'select#sfwp-wordpress-object', function() {
	var timeout;
	loadFieldOptions( 'wordpress', $( this ).val() );
	clearTimeout( timeout );
	timeout = setTimeout( function() {
		$( 'table.fields tbody tr' ).fadeOut();
		$( 'table.fields tbody tr' ).not( '.fieldmap-template' ).remove();
	}, 1000 );
} );

// load available options if the salesforce object changes
$( document ).on( 'change', 'select#sfwp-salesforce-object', function() {
	var timeout;
	loadFieldOptions( 'salesforce', $( this ).val() );
	clearTimeout( timeout );
	timeout = setTimeout( function() {
		$( 'table.fields tbody tr' ).fadeOut();
		$( 'table.fields tbody tr' ).not( '.fieldmap-template' ).remove();
	}, 1000 );
} );

/**
 * When the plugin loads:
 * Clear fields when the targeted WordPress or Salesforce object type changes
 * Manage the display for Salesforce object fields based on API reponse
 */
$( document ).ready( function() {

	// if there is already a wp or sf object, make sure it has the right fields when the page loads
	loadFieldOptions( 'wordpress', $( 'select#sfwp-wordpress-object' ).val() );
	loadFieldOptions( 'salesforce', $( 'select#sfwp-salesforce-object' ).val() );
} );
