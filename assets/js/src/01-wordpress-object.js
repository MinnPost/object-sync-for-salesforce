/**
 * Generates the WordPress object fields based on the dropdown activity and API results.
 */
function wordpressObjectFields() {

	var delay = ( function() {
		var timer = 0;
		return function( callback, ms ) {
			clearTimeout ( timer );
			timer = setTimeout( callback, ms );
		};
	}() );

	if ( 0 === $( '.wordpress_object_default_status > *' ).length ) {
		$( '.wordpress_object_default_status' ).hide();
	}

	$( '#wordpress_object' ).on( 'change', function() {
		var that = this;
		var delayTime = 1000;
		delay( function() {
			var data = {
				'action' : 'get_wordpress_object_description',
				'include' : [ 'statuses' ],
				'wordpress_object' : that.value
			}
			$.post( ajaxurl, data, function( response ) {

				var statusesMarkup = '';

				if ( 0 < $( response.data.statuses ).length ) {
					statusesMarkup += '<label for="wordpress_object_default_status">Default ' + that.value + ' status:</label>';
					statusesMarkup += '<select name="wordpress_object_default_status" id="wordpress_object_default_status"><option value="">- Select ' + that.value + ' status -</option>';
					$.each( response.data.statuses, function( index, value ) {
						statusesMarkup += '<option value="' + index + '">' + value + '</option>';
					});
					statusesMarkup += '</select>';
					statusesMarkup += '<p class="description">If this fieldmap allows new records to be created from Salesforce data, you can set a default status for them. You can override this default status by making a field that maps to the status field in the field settings below, or by using a developer hook to populate it.</p>';
					statusesMarkup += '<p class="description">The only core object that requires a status is the post. If you do not otherwise set a status, newly created posts will be drafts.</p>';
				}

				$( '.wordpress_object_default_status' ).html( statusesMarkup );

				if ( '' !== statusesMarkup ) {
					$( '.wordpress_object_default_status' ).show();
				} else {
					$( '.wordpress_object_default_status' ).hide();
				}

				if ( jQuery.fn.select2 ) {
					$( 'select#wordpress_object_default_status' ).select2();
				}

			});
		}, delayTime );
	});
}

/**
 * When the plugin loads:
 * Manage the display for WordPress record type settings
 */
$( document ).ready( function() {

	// Load record type settings for the WordPress object
	wordpressObjectRecordSettings();
} );
