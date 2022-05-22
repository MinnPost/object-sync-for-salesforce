/**
 * Don't show the WSDL file field unless SOAP is enabled
 */
function toggleSoapFields() {
	if ( 0 < $( '.object-sync-for-salesforce-enable-soap' ).length ) {
		if ( $( '.object-sync-for-salesforce-enable-soap input' ).is( ':checked' ) ) {
			$( '.object-sync-for-salesforce-soap-wsdl-path' ).show();
		} else {
			$( '.object-sync-for-salesforce-soap-wsdl-path' ).hide();
		}
	}
}

// Don't show the WSDL file field unless SOAP is enabled
$( document ).on( 'change', '.object-sync-for-salesforce-enable-soap input', function() {
	toggleSoapFields();
} );

$( document ).ready( function() {

	// Don't show the WSDL file field unless SOAP is enabled
	toggleSoapFields();
} );
