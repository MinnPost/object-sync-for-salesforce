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
					var fieldLabel = '';
					if ( 'undefined' !== typeof value.label ) {
						fieldLabel = value.label;
					} else {
						fieldLabel = value.name;
					}
					fields += '<option value="' + value.name + '">' + fieldLabel + '</option>';
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
$( document ).on( 'change', 'select#wordpress_object', function() {
	var timeout;
	loadFieldOptions( 'wordpress', $( this ).val() );
	clearTimeout( timeout );
	timeout = setTimeout( function() {
		$( 'table.fields tbody tr' ).fadeOut();
		$( 'table.fields tbody tr' ).not( '.fieldmap-template' ).remove();
	}, 1000 );
} );

// load available options if the salesforce object changes
$( document ).on( 'change', 'select#salesforce_object', function() {
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
	loadFieldOptions( 'wordpress', $( 'select#wordpress_object' ).val() );
	loadFieldOptions( 'salesforce', $( 'select#salesforce_object' ).val() );
} );
