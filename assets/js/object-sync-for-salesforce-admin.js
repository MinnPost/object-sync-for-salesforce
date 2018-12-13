'use strict';

( function( $ ) {
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

    $( '#salesforce_object' ).on( 'change', function( el ) {
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
            dateMarkup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>';
            $.each( response.data.fields, function( index, value ) {
              dateMarkup += '<option value="' + value.name + '">' + value.label + '</option>';
            });
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
        });
      }, delayTime );
    });
  }

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
      });
      wordpress += '</select>';
      salesforce += '<select name="salesforce_field[' + rowKey + ']" id="salesforce_field-' + rowKey + '">';
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
        });
        return false;
      });
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
      });
      return false;
    });
  }

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
    });
  }

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
      });
      return false;
    });
  } // as the drupal plugin does, we only allow one field to be a prematch or key


  $( document ).on( 'click', '.column-is_prematch input', function() {
    $( '.column-is_prematch input' ).not( this ).prop( 'checked', false );
  });
  $( document ).on( 'click', '.column-is_key input', function() {
    $( '.column-is_key input' ).not( this ).prop( 'checked', false );
  });
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
    }); // todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiaGlkZSIsIm9uIiwiZWwiLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0IiwidmFsIiwid29yZHByZXNzT2JqZWN0Iiwicm93S2V5IiwidGV4dCIsIk1hdGgiLCJmbG9vciIsIkRhdGUiLCJub3ciLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJyZW1vdmUiLCJwcmVwZW5kIiwid29yZHByZXNzIiwic2FsZXNmb3JjZSIsIm1hcmt1cCIsImtleSIsImFwcGVuZCIsInB1c2hBbmRQdWxsT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwic3VjY2VzcyIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwiZG9jdW1lbnQiLCJub3QiLCJwcm9wIiwicmVhZHkiLCJ0aW1lb3V0IiwiYWpheFN0YXJ0IiwiYWRkQ2xhc3MiLCJhamF4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QUFXO0FBQ2hDUCxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjZELE9BQTdCO0FBQ0E3RCxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QitDLE1BQTdCO0FBQ0EsT0FIbUIsRUFHakIsSUFIaUIsQ0FBcEI7QUFJQSxLQU5ELEVBYitCLENBcUIvQjs7QUFDQS9DLElBQUFBLENBQUMsQ0FBRXFFLFFBQUYsQ0FBRCxDQUFjSyxTQUFkLENBQXlCLFlBQVc7QUFDbkMxRSxNQUFBQSxDQUFDLENBQUUsVUFBRixDQUFELENBQWdCMkUsUUFBaEIsQ0FBMEIsV0FBMUI7QUFDQSxLQUZELEVBRUdDLFFBRkgsQ0FFYSxZQUFXO0FBQ3ZCNUUsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQjZFLFdBQWhCLENBQTZCLFdBQTdCO0FBQ0EsS0FKRDtBQUtBNUUsSUFBQUEsc0JBQXNCO0FBQ3RCZ0MsSUFBQUEsa0JBQWtCO0FBQ2xCcUIsSUFBQUEsa0JBQWtCO0FBQ2xCYSxJQUFBQSxrQkFBa0I7QUFDbEIsR0EvQkQ7QUFpQ0EsQ0ExUUMsRUEwUUNyQyxNQTFRRCxDQUFGIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdFx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aW1lciA9IDA7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHRcdH07XG5cdFx0fSgpICk7XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oIGVsICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdFx0J2luY2x1ZGUnIDogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0XHQnZmllbGRfdHlwZScgOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiB0aGF0LnZhbHVlXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cblx0XHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJycsIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJycsIGRhdGVNYXJrdXAgPSAnJztcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXG5cblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+J1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPidcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIGRlbGF5VGltZSApO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHRcdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciByb3dLZXk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRcdHJvd0tleSA9IE1hdGguZmxvb3IoIERhdGUubm93KCkgLyAxMDAwICk7XG5cdFx0XHRcdGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIHdvcmRwcmVzc09iamVjdCwgc2FsZXNmb3JjZU9iamVjdCwgcm93S2V5ICkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAnZ2V0X3dwX3NmX29iamVjdF9maWVsZHMnLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHNhbGVzZm9yY2VPYmplY3Rcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzID0gJyc7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZSA9ICcnO1xuXHRcdFx0dmFyIG1hcmt1cCA9ICcnO1xuXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19maWVsZFsnICsgcm93S2V5ICsgJ11cIiBpZD1cIndvcmRwcmVzc19maWVsZC0nICsgcm93S2V5ICsgJ1wiPidcblx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFdvcmRQcmVzcyBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS53b3JkcHJlc3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHR3b3JkcHJlc3MgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfZmllbGRbJyArIHJvd0tleSArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX2ZpZWxkLScgKyByb3dLZXkgKyAnXCI+J1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFNhbGVzZm9yY2UgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc2FsZXNmb3JjZSwgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRtYXJrdXAgPSAnPHRyPjx0ZCBjbGFzcz1cImNvbHVtbi13b3JkcHJlc3NfZmllbGRcIj4nICsgd29yZHByZXNzICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLXNhbGVzZm9yY2VfZmllbGRcIj4nICsgc2FsZXNmb3JjZSArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19wcmVtYXRjaFwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfcHJlbWF0Y2hbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19wcmVtYXRjaC0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2tleVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfa2V5WycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfa2V5LScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1kaXJlY3Rpb25cIj48ZGl2IGNsYXNzPVwicmFkaW9zXCI+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cInNmX3dwXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy1zZi13cFwiPiAgU2FsZXNmb3JjZSB0byBXb3JkUHJlc3M8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJ3cF9zZlwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctd3Atc2ZcIj4gIFdvcmRQcmVzcyB0byBTYWxlc2ZvcmNlPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic3luY1wiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctc3luY1wiIGNoZWNrZWQ+ICBTeW5jPC9sYWJlbD48L2Rpdj48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19kZWxldGVcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX2RlbGV0ZVsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX2RlbGV0ZS0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48L3RyPic7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbWFya3VwICk7XG5cblx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHR9XG5cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZFxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0XHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHRcdCdtYXBwaW5nX2lkJyA6IG1hcHBpbmdJZFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0XHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nIDogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0XHR9XG5cdFx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gYXMgdGhlIGRydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaCBvciBrZXlcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdFx0dmFyIHRpbWVvdXQ7XG5cblx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0fVxuXG5cdFx0JCggJyN3b3JkcHJlc3Nfb2JqZWN0LCAjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5yZW1vdmUoKTtcblx0XHRcdH0sIDEwMDAgKTtcblx0XHR9KTtcblxuXHRcdC8vIHRvZG86IG5lZWQgdG8gZml4IHRoaXMgc28gaXQgZG9lc24ndCBydW4gYWxsIHRoZSBzcGlubmVycyBhdCB0aGUgc2FtZSB0aW1lIHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlcyBvbiB0aGUgc2FtZSBwYWdlXG5cdFx0JCggZG9jdW1lbnQgKS5hamF4U3RhcnQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pLmFqYXhTdG9wKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KTtcblx0XHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG5cdFx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cdFx0cHVzaEFuZFB1bGxPYmplY3RzKCk7XG5cdFx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cdH0pO1xuXG59KCBqUXVlcnkgKSApO1xuIl19
