( function( $ ) {

	/**
	 * Based on the Salesforce field's info, we can set some options for how the data is handled
	 */
	function salesforceFieldInfo() {
		var wordpressFieldOptions = '.sfwp-wordpresss-field-options';
		var salesforceObject      = $( '#salesforce_object' ).val();
		$( wordpressFieldOptions ).hide();
		if ( '' !== salesforceObject ) {
			$( document ).on( 'change', '[id^=salesforce_field-]', function() {
				var data = {
					'action'            : 'get_salesforce_field_info',
					'salesforce_object' : salesforceObject,
					'salesforce_field'  : $( this ).val()
				}
				var parent = $( this ).parent().parent();
				$( wordpressFieldOptions, $( parent )).hide();
				$.post( ajaxurl, data, function( response ) {
					if ( true === response.success && 'undefined' !== typeof response.data.type ) {
						var salesforceFieldType = response.data.type;
						$( wordpressFieldOptions, $( parent ) ).show();
					}
				});
			});
		}
	}

	/**
	 * When the plugin loads, initialize or enable things:
	 */
	$( document ).ready( function() {

		salesforceFieldInfo();
	});
}( jQuery ) );
