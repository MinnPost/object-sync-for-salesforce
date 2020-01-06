/**
 * Handle manual push and pull of objects
 */
function pushAndPullObjects() {
	$( '.salesforce_user_ajax_message' ).hide();
	if ( 0 < $( '#wordpress_object_ajax' ).length ) {
		$( '.push_to_salesforce_button' ).on( 'click', function() {
			var wordpressObject = $( '#wordpress_object_ajax' ).val();
			var wordpressId = $( '#wordpress_id_ajax' ).val();
			var salesforceId = $( '#salesforce_id_ajax' ).val();
			var data = {
				'action' : 'push_to_salesforce',
				'wordpress_object' : wordpressObject,
				'wordpress_id' : wordpressId,
				'salesforce_id' : salesforceId
			}
			$.post( ajaxurl, data, function( response ) {
				if ( true === response.success ) {
					updateSalesforceUserSummary();
					$( '.salesforce_user_ajax_message' ).width( $( '.mapped-salesforce-user' ).width() - 27 );
					$( '.salesforce_user_ajax_message' ).html( '<p>This object has been pushed to Salesforce.</p>' ).fadeIn().delay( 4000 ).fadeOut();
				}
			});
			return false;
		});
	}
	$( '.pull_from_salesforce_button' ).on( 'click', function() {
		var salesforceId = $( '#salesforce_id_ajax' ).val();
		var wordpressObject = $( '#wordpress_object_ajax' ).val();
		var data = {
			'action' : 'pull_from_salesforce',
			'salesforce_id' : salesforceId,
			'wordpress_object' : wordpressObject
		}
		$.post( ajaxurl, data, function( response ) {
			if ( true === response.success ) {
				updateSalesforceUserSummary();
				$( '.salesforce_user_ajax_message' ).width( $( '.mapped-salesforce-user' ).width() - 27 );
				$( '.salesforce_user_ajax_message' ).html( '<p>This object has been pulled from Salesforce.</p>' ).fadeIn().delay( 4000 ).fadeOut();
			}
		});
		return false;
	});
}
/**
 * Updates the user profile summary of Salesforce info.
 */
function updateSalesforceUserSummary() {
	var mappingId = $( '#mapping_id_ajax' ).val();
	var data = {
		'action' : 'refresh_mapped_data',
		'mapping_id' : mappingId
	}
	$.post( ajaxurl, data, function( response ) {
		if ( true === response.success ) {
			$( 'td.last_sync_message' ).text( response.data.last_sync_message );
			$( 'td.last_sync_action' ).text( response.data.last_sync_action );
			$( 'td.last_sync_status' ).text( response.data.last_sync_status );
			$( 'td.last_sync' ).text( response.data.last_sync );
			if ( '1' === response.data.last_sync_status ) {
				$( 'td.last_sync_status' ).text( 'success' );
			}
		}
	});
}
/**
 * Clear the plugin cache via Ajax request.
 */
function clearSfwpCacheLink() {
	$( '#clear-sfwp-cache' ).click( function() {
		var data = {
			'action' : 'clear_sfwp_cache'
		}
		var that = $( this );
		$.post( ajaxurl, data, function( response ) {
			if ( true === response.success && true === response.data.success ) {
				that.parent().html( response.data.message ).fadeIn();
			}
		});
		return false;
	});
}
