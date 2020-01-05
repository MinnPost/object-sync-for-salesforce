( function( $ ) {

	function loadFieldOptions( system, object_name ) {
		var data = {
			'action' : 'get_' + system + '_object_fields',
		}
		var fields = '';
		var first_field = $( '.column-' + system + '_field select option').first().text();
		fields += '<option value="">' + first_field + '</option>';
		if ( 'wordpress' === system ) {
			data['wordpress_object'] = object_name;
		} else if ( 'salesforce' === system ) {
			data['salesforce_object'] = object_name;
		} else {
			return fields;
		}
		$.post( ajaxurl, data, function( response ) {
			$.each( response.data.fields, function( index, value ) {
				if ( 'wordpress' === system ) {
					fields += '<option value="' + value.key + '">' + value.key + '</option>';
				} else if ( 'salesforce' === system ) {
					fields += '<option value="' + value.name + '">' + value.label + '</option>';
				}
			});
			$( '.column-' + system + '_field select' ).html( fields );
		});
	}

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

	/**
	 * Generates the Salesforce object fields based on the dropdown activity and API results.
	 */
	function salesforceObjectFields() {

		var delay = ( function() {
			var timer = 0;
			return function( callback, ms ) {
				clearTimeout ( timer );
				timer = setTimeout( callback, ms );
			};
		}() );

		if ( 0 === $( '.salesforce_record_types_allowed > *' ).length ) {
			$( '.salesforce_record_types_allowed' ).hide();
		}

		if ( 0 === $( '.salesforce_record_type_default > *' ).length ) {
			$( '.salesforce_record_type_default' ).hide();
		}
		if ( 0 === $( '.pull_trigger_field > *' ).length ) {
			$( '.pull_trigger_field' ).hide();
		}

		$( '#salesforce_object' ).on( 'change', function() {
			var that = this;
			var delayTime = 1000;
			delay( function() {
				var data = {
					'action' : 'get_salesforce_object_description',
					'include' : [ 'fields', 'recordTypeInfos' ],
					'field_type' : 'datetime',
					'salesforce_object' : that.value
				}
				$.post( ajaxurl, data, function( response ) {

					var recordTypesAllowedMarkup = '', recordTypeDefaultMarkup = '', dateMarkup = '';

					if ( 0 < $( response.data.recordTypeInfos ).length ) {
						recordTypesAllowedMarkup += '<label for="salesforce_record_types_allowed">Allowed Record Types:</label><div class="checkboxes">';
						$.each( response.data.recordTypeInfos, function( index, value ) {
							recordTypesAllowedMarkup += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
						});
						recordTypesAllowedMarkup += '</div>';


						recordTypeDefaultMarkup += '<label for="salesforce_record_type_default">Default Record Type:</label>';
						recordTypeDefaultMarkup += '<select name="salesforce_record_type_default" id="salesforce_record_type_default"><option value="">- Select record type -</option>';
						$.each( response.data.recordTypeInfos, function( index, value ) {
							recordTypeDefaultMarkup += '<option value="' + index + '">' + value + '</option>';
						});
					}

					$( '.salesforce_record_types_allowed' ).html( recordTypesAllowedMarkup );
					$( '.salesforce_record_type_default' ).html( recordTypeDefaultMarkup );

					if ( 0 < $( response.data.fields ).length ) {
						dateMarkup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
						dateMarkup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>'
						$.each( response.data.fields, function( index, value ) {
							dateMarkup += '<option value="' + value.name + '">' + value.label + '</option>';
						});
						dateMarkup += '</select>';
						dateMarkup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>'
					}

					$( '.pull_trigger_field' ).html( dateMarkup );

					if ( '' !== recordTypesAllowedMarkup ) {
						$( '.salesforce_record_types_allowed' ).show();
					} else {
						$( '.salesforce_record_types_allowed' ).hide();
					}
					if ( '' !== recordTypeDefaultMarkup ) {
						$( '.salesforce_record_type_default' ).show();
					} else {
						$( '.salesforce_record_type_default' ).hide();
					}

					if ( '' !== dateMarkup ) {
						$( '.pull_trigger_field' ).show();
					} else {
						$( '.pull_trigger_field' ).hide();
					}

					if ( jQuery.fn.select2 ) {
						$( 'select#salesforce_record_type_default' ).select2();
						$( 'select#pull_trigger_field' ).select2();
					}

				});
			}, delayTime );
		});
	}
	/**
	 * Duplicates the fields for a new row in the fieldmap options screen.
	 */
	 function addFieldMappingRow() {
		$( '#add-field-mapping' ).click( function() {
			var salesforceObject = $( '#salesforce_object' ).val();
			var wordpressObject = $( '#wordpress_object' ).val();
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
		});
	}
	/**
	 * Gets the WordPress and Salesforce field results via an Ajax call
	 * @param string oldKey the data-key attribute of the set that is being cloned
	 * @param string newKey the data-key attribute for the one we're appending
	 * @param object lastRow the last set of the fieldmap
	 */
	function fieldmapFields( oldKey, newKey, lastRow ) {
		var nextRow = '';
        if ( jQuery.fn.select2 ) {
        	nextRow = lastRow.find( 'select' )
	            .select2( 'destroy' )
	            .end()
	            .clone( true ).removeClass( 'fieldmap-template' );
        } else {
        	nextRow = lastRow.clone( true );
        }
		$( nextRow ).attr( 'data-key', newKey );
		$( nextRow ).each(function() {
			$( this ).html( function( i, h ) {
				return h.replace( oldKey, newKey );
			});
		});
		$( 'table.fields tbody' ).append( nextRow );
		if ( jQuery.fn.select2 ) {
			lastRow.find( 'select' ).select2();
			nextRow.find( 'select' ).select2();
		}
	}
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

	// load available options if the wordpress object changes
	$( document ).on( 'change', 'select#wordpress_object', function() {
		var timeout;
		loadFieldOptions( 'wordpress', $( this ).val() );
		clearTimeout( timeout );
		timeout = setTimeout( function() {
			$( 'table.fields tbody tr' ).fadeOut();
			$( 'table.fields tbody tr' ).not( '.fieldmap-template' ).remove();
		}, 1000 );
	});

	// load available options if the salesforce object changes
	$( document ).on( 'change', 'select#salesforce_object', function() {
		var timeout;
		loadFieldOptions( 'salesforce', $( this ).val() );
		clearTimeout( timeout );
		timeout = setTimeout( function() {
			$( 'table.fields tbody tr' ).fadeOut();
			$( 'table.fields tbody tr' ).not( '.fieldmap-template' ).remove();
		}, 1000 );
	});

	// show wsdl field if soap is enabled
	$( document ).on( 'change', '.object-sync-for-salesforce-enable-soap input', function() {
		toggleSoapFields();
	});

	/**
	 * As the Drupal plugin does, we only allow one field to be a prematch
	 */
	$( document ).on( 'click', '.column-is_prematch input', function() {
		$( '.column-is_prematch input' ).not( this ).prop( 'checked', false );
	});
	/**
	 * As the Drupal plugin does, we only allow one field to be a key
	 */
	$( document ).on( 'click', '.column-is_key input', function() {
		$( '.column-is_key input' ).not( this ).prop( 'checked', false );
	});
	/**
	 * When the plugin loads, initialize or enable things:
	 * Select2 on select fields
	 * Clear fields when the targeted WordPress or Salesforce object type changes
	 * Add a spinner for Ajax requests
	 * Manage the display for Salesforce object fields based on API reponse
	 * Manual push and pull
	 * Clearing the cache
	 */
	$( document ).ready( function() {

		// for main admin settings
		toggleSoapFields();

		// if there is already a wp or sf object, make sure it has the right fields
		loadFieldOptions( 'wordpress', $( 'select#wordpress_object' ).val() );
		loadFieldOptions( 'salesforce', $( 'select#salesforce_object' ).val() );

		if ( jQuery.fn.select2 ) {
			$( 'select#wordpress_object' ).select2();
			$( 'select#salesforce_object' ).select2();
			$( 'select#salesforce_record_type_default' ).select2();
			$( 'select#pull_trigger_field' ).select2();
			$( '.column-wordpress_field select' ).select2();
			$( '.column-salesforce_field select' ).select2();
		}

		// todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page
		$( document ).ajaxStart( function() {
			$( '.spinner' ).addClass( 'is-active' );
		}).ajaxStop( function() {
			$( '.spinner' ).removeClass( 'is-active' );
		});
		salesforceObjectFields();
		addFieldMappingRow();

		// for push/pull methods running via ajax
		pushAndPullObjects();

		// for clearing the plugin cache
		clearSfwpCacheLink();
	});
}( jQuery ) );
