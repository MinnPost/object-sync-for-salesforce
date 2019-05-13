'use strict';

( function( $ ) {

  /**
   * Generates the Salesforce object fields based on the dropdown activity and API results.
   */
  function salesforceObjectFields() {
    var delay = ( function() {
      var timer = 0;
      return function( callback, ms ) {
        clearTimeout( timer );
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
          'action': 'get_salesforce_object_description',
          'include': [ 'fields', 'recordTypeInfos' ],
          'field_type': 'datetime',
          'salesforce_object': that.value
        };
        $.post( ajaxurl, data, function( response ) {
          var recordTypesAllowedMarkup = '',
              recordTypeDefaultMarkup = '',
              dateMarkup = '';

          if ( 0 < $( response.data.recordTypeInfos ).length ) {
            recordTypesAllowedMarkup += '<label for="salesforce_record_types_allowed">Allowed Record Types:</label><div class="checkboxes">';
            $.each( response.data.recordTypeInfos, function( index, value ) {
              recordTypesAllowedMarkup += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
            } );
            recordTypesAllowedMarkup += '</div>';
            recordTypeDefaultMarkup += '<label for="salesforce_record_type_default">Default Record Type:</label>';
            recordTypeDefaultMarkup += '<select name="salesforce_record_type_default" id="salesforce_record_type_default"><option value="">- Select record type -</option>';
            $.each( response.data.recordTypeInfos, function( index, value ) {
              recordTypeDefaultMarkup += '<option value="' + index + '">' + value + '</option>';
            } );
          }

          $( '.salesforce_record_types_allowed' ).html( recordTypesAllowedMarkup );
          $( '.salesforce_record_type_default' ).html( recordTypeDefaultMarkup );

          if ( 0 < $( response.data.fields ).length ) {
            dateMarkup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
            dateMarkup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>';
            $.each( response.data.fields, function( index, value ) {
              dateMarkup += '<option value="' + value.name + '">' + value.label + '</option>';
            } );
            dateMarkup += '</select>';
            dateMarkup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>';
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
        } );
      }, delayTime );
    } );
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
    } );
  }

  /**
   * Gets the WordPress and Salesforce field results via an Ajax call
   * @param string wordpressObject the WordPress object type
   * @param string salesforceObject the Salesforce object type
   * @param int rowKey which row we're working on
   */


  function fieldmapFields( wordpressObject, salesforceObject, rowKey ) {
    var data = {
      'action': 'get_wp_sf_object_fields',
      'wordpress_object': wordpressObject,
      'salesforce_object': salesforceObject
    };
    $.post( ajaxurl, data, function( response ) {
      var wordpress = '';
      var salesforce = '';
      var markup = '';
      wordpress += '<select name="wordpress_field[' + rowKey + ']" id="wordpress_field-' + rowKey + '">';
      wordpress += '<option value="">- Select WordPress field -</option>';
      $.each( response.data.wordpress, function( index, value ) {
        wordpress += '<option value="' + value.key + '">' + value.key + '</option>';
      } );
      wordpress += '</select>';
      salesforce += '<select name="salesforce_field[' + rowKey + ']" id="salesforce_field-' + rowKey + '">';
      salesforce += '<option value="">- Select Salesforce field -</option>';
      $.each( response.data.salesforce, function( index, value ) {
        salesforce += '<option value="' + value.name + '">' + value.label + '</option>';
      } );
      salesforce += '</select>';
      markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + rowKey + ']" id="is_prematch-' + rowKey + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + rowKey + ']" id="is_key-' + rowKey + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sync" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sync" checked>  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + rowKey + ']" id="is_delete-' + rowKey + '" value="1" /></td></tr>';
      $( 'table.fields tbody' ).append( markup );

      if ( jQuery.fn.select2 ) {
        $( '.column-wordpress_field select' ).select2();
        $( '.column-salesforce_field select' ).select2();
      }
    } );
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
          'action': 'push_to_salesforce',
          'wordpress_object': wordpressObject,
          'wordpress_id': wordpressId,
          'salesforce_id': salesforceId
        };
        $.post( ajaxurl, data, function( response ) {
          if ( true === response.success ) {
            updateSalesforceUserSummary();
            $( '.salesforce_user_ajax_message' ).width( $( '.mapped-salesforce-user' ).width() - 27 );
            $( '.salesforce_user_ajax_message' ).html( '<p>This object has been pushed to Salesforce.</p>' ).fadeIn().delay( 4000 ).fadeOut();
          }
        } );
        return false;
      } );
    }

    $( '.pull_from_salesforce_button' ).on( 'click', function() {
      var salesforceId = $( '#salesforce_id_ajax' ).val();
      var wordpressObject = $( '#wordpress_object_ajax' ).val();
      var data = {
        'action': 'pull_from_salesforce',
        'salesforce_id': salesforceId,
        'wordpress_object': wordpressObject
      };
      $.post( ajaxurl, data, function( response ) {
        if ( true === response.success ) {
          updateSalesforceUserSummary();
          $( '.salesforce_user_ajax_message' ).width( $( '.mapped-salesforce-user' ).width() - 27 );
          $( '.salesforce_user_ajax_message' ).html( '<p>This object has been pulled from Salesforce.</p>' ).fadeIn().delay( 4000 ).fadeOut();
        }
      } );
      return false;
    } );
  }

  /**
   * Updates the user profile summary of Salesforce info.
   */


  function updateSalesforceUserSummary() {
    var mappingId = $( '#mapping_id_ajax' ).val();
    var data = {
      'action': 'refresh_mapped_data',
      'mapping_id': mappingId
    };
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
    } );
  }

  /**
   * Clear the plugin cache via Ajax request.
   */


  function clearSfwpCacheLink() {
    $( '#clear-sfwp-cache' ).click( function() {
      var data = {
        'action': 'clear_sfwp_cache'
      };
      var that = $( this );
      $.post( ajaxurl, data, function( response ) {
        if ( true === response.success && true === response.data.success ) {
          that.parent().html( response.data.message ).fadeIn();
        }
      } );
      return false;
    } );
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
    } ); // todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page

    $( document ).ajaxStart( function() {
      $( '.spinner' ).addClass( 'is-active' );
    } ).ajaxStop( function() {
      $( '.spinner' ).removeClass( 'is-active' );
    } );
    salesforceObjectFields();
    addFieldMappingRow();
    pushAndPullObjects();
    clearSfwpCacheLink();
  } );
} ( jQuery ) );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiaGlkZSIsIm9uIiwidGhhdCIsImRlbGF5VGltZSIsImRhdGEiLCJ2YWx1ZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAiLCJyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCIsImRhdGVNYXJrdXAiLCJyZWNvcmRUeXBlSW5mb3MiLCJlYWNoIiwiaW5kZXgiLCJodG1sIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsInZhbCIsIndvcmRwcmVzc09iamVjdCIsInJvd0tleSIsInRleHQiLCJNYXRoIiwiZmxvb3IiLCJEYXRlIiwibm93IiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicmVtb3ZlIiwicHJlcGVuZCIsIndvcmRwcmVzcyIsInNhbGVzZm9yY2UiLCJtYXJrdXAiLCJrZXkiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInN1Y2Nlc3MiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImZhZGVPdXQiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsImRvY3VtZW50Iiwibm90IiwicHJvcCIsInJlYWR5IiwidGltZW91dCIsImFqYXhTdGFydCIsImFkZENsYXNzIiwiYWpheFN0b3Ai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T0FBRixDQUFaO0FBQ0FBLE1BQUFBLE9BQU8sR0FBR2pFLFVBQVUsQ0FBRSxZQUFXO0FBQ2hDUCxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjRELE9BQTdCO0FBQ0E1RCxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjhDLE1BQTdCO0FBQ0EsT0FIbUIsRUFHakIsSUFIaUIsQ0FBcEI7QUFJQSxLQU5ELEVBYitCLENBcUIvQjs7QUFDQTlDLElBQUFBLENBQUMsQ0FBRW9FLFFBQUYsQ0FBRCxDQUFjSyxTQUFkLENBQXlCLFlBQVc7QUFDbkN6RSxNQUFBQSxDQUFDLENBQUUsVUFBRixDQUFELENBQWdCMEUsUUFBaEIsQ0FBMEIsV0FBMUI7QUFDQSxLQUZELEVBRUdDLFFBRkgsQ0FFYSxZQUFXO0FBQ3ZCM0UsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQjRFLFdBQWhCLENBQTZCLFdBQTdCO0FBQ0EsS0FKRDtBQUtBM0UsSUFBQUEsc0JBQXNCO0FBQ3RCK0IsSUFBQUEsa0JBQWtCO0FBQ2xCcUIsSUFBQUEsa0JBQWtCO0FBQ2xCYSxJQUFBQSxrQkFBa0I7QUFDbEIsR0EvQkQ7QUFnQ0EsQ0FsU0MsRUFrU0NyQyxNQWxTRCxDQUFGIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblx0LyoqXG5cdCAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdFx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aW1lciA9IDA7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHRcdH07XG5cdFx0fSgpICk7XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0XHQnaW5jbHVkZScgOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdFx0XHRcdCdmaWVsZF90eXBlJyA6ICdkYXRldGltZScsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHRoYXQudmFsdWVcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJywgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJywgZGF0ZU1hcmt1cCA9ICcnO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cblxuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj5EZWZhdWx0IFJlY29yZCBUeXBlOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmh0bWwoIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nXG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+J1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgZGVsYXlUaW1lICk7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0ICovXG5cdCBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdFx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHJvd0tleTtcblx0XHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdFx0cm93S2V5ID0gTWF0aC5mbG9vciggRGF0ZS5ub3coKSAvIDEwMDAgKTtcblx0XHRcdFx0ZmllbGRtYXBGaWVsZHMoIHdvcmRwcmVzc09iamVjdCwgc2FsZXNmb3JjZU9iamVjdCwgcm93S2V5ICk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG5cdCAqIEBwYXJhbSBzdHJpbmcgd29yZHByZXNzT2JqZWN0IHRoZSBXb3JkUHJlc3Mgb2JqZWN0IHR5cGVcblx0ICogQHBhcmFtIHN0cmluZyBzYWxlc2ZvcmNlT2JqZWN0IHRoZSBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlXG5cdCAqIEBwYXJhbSBpbnQgcm93S2V5IHdoaWNoIHJvdyB3ZSdyZSB3b3JraW5nIG9uXG5cdCAqL1xuXHRmdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggd29yZHByZXNzT2JqZWN0LCBzYWxlc2ZvcmNlT2JqZWN0LCByb3dLZXkgKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdnZXRfd3Bfc2Zfb2JqZWN0X2ZpZWxkcycsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogc2FsZXNmb3JjZU9iamVjdFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdHZhciB3b3JkcHJlc3MgPSAnJztcblx0XHRcdHZhciBzYWxlc2ZvcmNlID0gJyc7XG5cdFx0XHR2YXIgbWFya3VwID0gJyc7XG5cblx0XHRcdHdvcmRwcmVzcyArPSAnPHNlbGVjdCBuYW1lPVwid29yZHByZXNzX2ZpZWxkWycgKyByb3dLZXkgKyAnXVwiIGlkPVwid29yZHByZXNzX2ZpZWxkLScgKyByb3dLZXkgKyAnXCI+J1xuXHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgV29yZFByZXNzIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLndvcmRwcmVzcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHdvcmRwcmVzcyArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0c2FsZXNmb3JjZSArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9maWVsZFsnICsgcm93S2V5ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfZmllbGQtJyArIHJvd0tleSArICdcIj4nXG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgU2FsZXNmb3JjZSBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5zYWxlc2ZvcmNlLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdG1hcmt1cCA9ICc8dHI+PHRkIGNsYXNzPVwiY29sdW1uLXdvcmRwcmVzc19maWVsZFwiPicgKyB3b3JkcHJlc3MgKyAnPC90ZD48dGQgY2xhc3M9XCJjb2x1bW4tc2FsZXNmb3JjZV9maWVsZFwiPicgKyBzYWxlc2ZvcmNlICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWlzX3ByZW1hdGNoXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19wcmVtYXRjaFsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX3ByZW1hdGNoLScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48dGQgY2xhc3M9XCJjb2x1bW4taXNfa2V5XCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19rZXlbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19rZXktJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWRpcmVjdGlvblwiPjxkaXYgY2xhc3M9XCJyYWRpb3NcIj48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic2Zfd3BcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXNmLXdwXCI+ICBTYWxlc2ZvcmNlIHRvIFdvcmRQcmVzczwvbGFiZWw+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cIndwX3NmXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy13cC1zZlwiPiAgV29yZFByZXNzIHRvIFNhbGVzZm9yY2U8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzeW5jXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy1zeW5jXCIgY2hlY2tlZD4gIFN5bmM8L2xhYmVsPjwvZGl2PjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2RlbGV0ZVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfZGVsZXRlWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfZGVsZXRlLScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48L3RkPjwvdHI+Jztcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBtYXJrdXAgKTtcblxuXHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdH1cblxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHQgKi9cblx0ZnVuY3Rpb24gcHVzaEFuZFB1bGxPYmplY3RzKCkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdFx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHRcdCd3b3JkcHJlc3NfaWQnIDogd29yZHByZXNzSWQsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnIDogc2FsZXNmb3JjZUlkXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nIDogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnIDogc2FsZXNmb3JjZUlkLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3Rcblx0XHRcdH1cblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG5cdCAqL1xuXHRmdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdFx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0XHQnbWFwcGluZ19pZCcgOiBtYXBwaW5nSWRcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0ICovXG5cdGZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0XHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nIDogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0XHR9XG5cdFx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHRcdCQucG9zdCggYWpheHV
