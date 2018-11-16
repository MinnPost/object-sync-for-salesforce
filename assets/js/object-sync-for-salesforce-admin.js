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
        var data = {
          'action': 'push_to_salesforce',
          'wordpress_object': wordpressObject,
          'wordpress_id': wordpressId
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiaGlkZSIsIm9uIiwiZWwiLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0IiwidmFsIiwid29yZHByZXNzT2JqZWN0Iiwicm93S2V5IiwidGV4dCIsIk1hdGgiLCJmbG9vciIsIkRhdGUiLCJub3ciLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJyZW1vdmUiLCJwcmVwZW5kIiwid29yZHByZXNzIiwic2FsZXNmb3JjZSIsIm1hcmt1cCIsImtleSIsImFwcGVuZCIsInB1c2hBbmRQdWxsT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic3VjY2VzcyIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsInNhbGVzZm9yY2VJZCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwiZG9jdW1lbnQiLCJub3QiLCJwcm9wIiwicmVhZHkiLCJ0aW1lb3V0IiwiYWpheFN0YXJ0IiwiYWRkQ2xhc3MiLCJhamF4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QUQsQ0FBNkIrQyxNQUE3QjtBQUNBLE9BSG1CLEVBR2pCLElBSGlCLENBQXBCO0FBSUEsS0FORCxFQWIrQixDQXFCL0I7O0FBQ0EvQyxJQUFBQSxDQUFDLENBQUVxRSxRQUFGLENBQUQsQ0FBY0ssU0FBZCxDQUF5QixZQUFXO0FBQ25DMUUsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQjJFLFFBQWhCLENBQTBCLFdBQTFCO0FBQ0EsS0FGRCxFQUVHQyxRQUZILENBRWEsWUFBVztBQUN2QjVFLE1BQUFBLENBQUMsQ0FBRSxVQUFGLENBQUQsQ0FBZ0I2RSxXQUFoQixDQUE2QixXQUE3QjtBQUNBLEtBSkQ7QUFLQTVFLElBQUFBLHNCQUFzQjtBQUN0QmdDLElBQUFBLGtCQUFrQjtBQUNsQnFCLElBQUFBLGtCQUFrQjtBQUNsQmEsSUFBQUEsa0JBQWtCO0FBQ2xCLEdBL0JEO0FBaUNBLENBeFFDLEVBd1FDckMsTUF4UUQsQ0FBRiIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHRcdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0XHR9O1xuXHRcdH0oKSApO1xuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdH1cblx0XHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCBlbCApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJyA6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnLCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnLCBkYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPidcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9LCBkZWxheVRpbWUgKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0XHQkKCAnI2FkZC1maWVsZC1tYXBwaW5nJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgcm93S2V5O1xuXHRcdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdFx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0XHRyb3dLZXkgPSBNYXRoLmZsb29yKCBEYXRlLm5vdygpIC8gMTAwMCApO1xuXHRcdFx0XHRmaWVsZG1hcEZpZWxkcyggd29yZHByZXNzT2JqZWN0LCBzYWxlc2ZvcmNlT2JqZWN0LCByb3dLZXkgKTtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXG5cdGZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ2dldF93cF9zZl9vYmplY3RfZmllbGRzJyxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiBzYWxlc2ZvcmNlT2JqZWN0XG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0dmFyIHdvcmRwcmVzcyA9ICcnO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2UgPSAnJztcblx0XHRcdHZhciBtYXJrdXAgPSAnJztcblxuXHRcdFx0d29yZHByZXNzICs9ICc8c2VsZWN0IG5hbWU9XCJ3b3JkcHJlc3NfZmllbGRbJyArIHJvd0tleSArICddXCIgaWQ9XCJ3b3JkcHJlc3NfZmllbGQtJyArIHJvd0tleSArICdcIj4nXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBXb3JkUHJlc3MgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEud29yZHByZXNzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0d29yZHByZXNzICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX2ZpZWxkWycgKyByb3dLZXkgKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9maWVsZC0nICsgcm93S2V5ICsgJ1wiPidcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBTYWxlc2ZvcmNlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnNhbGVzZm9yY2UsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0bWFya3VwID0gJzx0cj48dGQgY2xhc3M9XCJjb2x1bW4td29yZHByZXNzX2ZpZWxkXCI+JyArIHdvcmRwcmVzcyArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkXCI+JyArIHNhbGVzZm9yY2UgKyAnPC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfcHJlbWF0Y2hcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX3ByZW1hdGNoWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfcHJlbWF0Y2gtJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19rZXlcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX2tleVsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX2tleS0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4tZGlyZWN0aW9uXCI+PGRpdiBjbGFzcz1cInJhZGlvc1wiPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzZl93cFwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctc2Ytd3BcIj4gIFNhbGVzZm9yY2UgdG8gV29yZFByZXNzPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwid3Bfc2ZcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXdwLXNmXCI+ICBXb3JkUHJlc3MgdG8gU2FsZXNmb3JjZTwvbGFiZWw+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cInN5bmNcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXN5bmNcIiBjaGVja2VkPiAgU3luYzwvbGFiZWw+PC9kaXY+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfZGVsZXRlXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19kZWxldGVbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19kZWxldGUtJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PC90cj4nO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG1hcmt1cCApO1xuXG5cdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBwdXNoQW5kUHVsbE9iamVjdHMoKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0XHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHRcdCd3b3JkcHJlc3NfaWQnIDogd29yZHByZXNzSWRcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdFxuXHRcdFx0fVxuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdFx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0XHQnbWFwcGluZ19pZCcgOiBtYXBwaW5nSWRcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIGFzIHRoZSBkcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2ggb3Iga2V5XG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblxuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHRcdHZhciB0aW1lb3V0O1xuXG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblxuXHRcdCQoICcjd29yZHByZXNzX29iamVjdCwgI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0XHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkucmVtb3ZlKCk7XG5cdFx0XHR9LCAxMDAwICk7XG5cdFx0fSk7XG5cblx0XHQvLyB0b2RvOiBuZWVkIHRvIGZpeCB0aGlzIHNvIGl0IGRvZXNuJ3QgcnVuIGFsbCB0aGUgc3Bpbm5lcnMgYXQgdGhlIHNhbWUgdGltZSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZXMgb24gdGhlIHNhbWUgcGFnZVxuXHRcdCQoIGRvY3VtZW50ICkuYWpheFN0YXJ0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KS5hamF4U3RvcCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXInICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSk7XG5cdFx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xuXHRcdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXHRcdHB1c2hBbmRQdWxsT2JqZWN0cygpO1xuXHRcdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXHR9KTtcblxufSggalF1ZXJ5ICkgKTtcbiJdfQ==
