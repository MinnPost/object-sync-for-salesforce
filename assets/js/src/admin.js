( function( $ ) {
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
			var rowKey;
			$( this ).text( 'Add another field mapping' );
			if ( '' !== wordpressObject && '' !== salesforceObject ) {
				rowKey = Math.floor( Date.now() / 1000 );
				fieldmapFields( wordpressObject, salesforceObject, rowKey );
				$( this ).parent().find( '.missing-object' ).remove();
			} else {
				$( this ).parent().prepend( '<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>' );
			}
			return false;
		});
	}
	/**
	 * Gets the WordPress and Salesforce field results via an Ajax call
	 * @param string wordpressObject the WordPress object type
	 * @param string salesforceObject the Salesforce object type
	 * @param int rowKey which row we're working on
	 */
	function fieldmapFields( wordpressObject, salesforceObject, rowKey ) {
		var data = {
			'action' : 'get_wp_sf_object_fields',
			'wordpress_object' : wordpressObject,
			'salesforce_object' : salesforceObject
		}
		$.post( ajaxurl, data, function( response ) {
			var wordpress = '';
			var salesforce = '';
			var markup = '';

			wordpress += '<select name="wordpress_field[' + rowKey + ']" id="wordpress_field-' + rowKey + '">'
			wordpress += '<option value="">- Select WordPress field -</option>';
			$.each( response.data.wordpress, function( index, value ) {
				wordpress += '<option value="' + value.key + '">' + value.key + '</option>';
			});
			wordpress += '</select>';

			salesforce += '<select name="salesforce_field[' + rowKey + ']" id="salesforce_field-' + rowKey + '">'
			salesforce += '<option value="">- Select Salesforce field -</option>';
			$.each( response.data.salesforce, function( index, value ) {
				salesforce += '<option value="' + value.name + '">' + value.label + '</option>';
			});
			salesforce += '</select>';

			markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + rowKey + ']" id="is_prematch-' + rowKey + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + rowKey + ']" id="is_key-' + rowKey + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sync" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sync" checked>  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + rowKey + ']" id="is_delete-' + rowKey + '" value="1" /></td></tr>';
			$( 'table.fields tbody' ).append( markup );

			if ( jQuery.fn.select2 ) {
				$( '.column-wordpress_field select' ).select2();
				$( '.column-salesforce_field select' ).select2();
			}

		});
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

		var timeout;

		if ( jQuery.fn.select2 ) {
			$( 'select#wordpress_object' ).select2();
			$( 'select#salesforce_object' ).select2();
			$( 'select#salesforce_record_type_default' ).select2();
			$( 'select#pull_trigger_field' ).select2();
			$( '.column-wordpress_field select' ).select2();
			$( '.column-salesforce_field select' ).select2();
		}

		$( '#wordpress_object, #salesforce_object' ).on( 'change', function() {
			clearTimeout( timeout );
			timeout = setTimeout( function() {
				$( 'table.fields tbody tr' ).fadeOut();
				$( 'table.fields tbody tr' ).remove();
			}, 1000 );
		});

		// todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page
		$( document ).ajaxStart( function() {
			$( '.spinner' ).addClass( 'is-active' );
		}).ajaxStop( function() {
			$( '.spinner' ).removeClass( 'is-active' );
		});
		salesforceObjectFields();
		addFieldMappingRow();
		pushAndPullObjects();
		clearSfwpCacheLink();
	});
}( jQuery ) );
