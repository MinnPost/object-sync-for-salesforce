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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiaGlkZSIsIm9uIiwidGhhdCIsImRlbGF5VGltZSIsImRhdGEiLCJ2YWx1ZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAiLCJyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCIsImRhdGVNYXJrdXAiLCJyZWNvcmRUeXBlSW5mb3MiLCJlYWNoIiwiaW5kZXgiLCJodG1sIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsInZhbCIsIndvcmRwcmVzc09iamVjdCIsInJvd0tleSIsInRleHQiLCJNYXRoIiwiZmxvb3IiLCJEYXRlIiwibm93IiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicmVtb3ZlIiwicHJlcGVuZCIsIndvcmRwcmVzcyIsInNhbGVzZm9yY2UiLCJtYXJrdXAiLCJrZXkiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInN1Y2Nlc3MiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImZhZGVPdXQiLCJzYWxlc2ZvcmNlSWQiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsImRvY3VtZW50Iiwibm90IiwicHJvcCIsInJlYWR5IiwidGltZW91dCIsImFqYXhTdGFydCIsImFkZENsYXNzIiwiYWpheFN0b3Ai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Q0FBNkIyRCxPQUE3QjtBQUNBM0QsUUFBQUEsQ0FBQyxDQUFFLHVCQUFGLENBQUQsQ0FBNkI4QyxNQUE3QjtBQUNBLE9BSG1CLEVBR2pCLElBSGlCLENBQXBCO0FBSUEsS0FORCxFQWIrQixDQXFCL0I7O0FBQ0E5QyxJQUFBQSxDQUFDLENBQUVvRSxRQUFGLENBQUQsQ0FBY0ssU0FBZCxDQUF5QixZQUFXO0FBQ25DekUsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQjBFLFFBQWhCLENBQTBCLFdBQTFCO0FBQ0EsS0FGRCxFQUVHQyxRQUZILENBRWEsWUFBVztBQUN2QjNFLE1BQUFBLENBQUMsQ0FBRSxVQUFGLENBQUQsQ0FBZ0I0RSxXQUFoQixDQUE2QixXQUE3QjtBQUNBLEtBSkQ7QUFLQTNFLElBQUFBLHNCQUFzQjtBQUN0QitCLElBQUFBLGtCQUFrQjtBQUNsQnFCLElBQUFBLGtCQUFrQjtBQUNsQmEsSUFBQUEsa0JBQWtCO0FBQ2xCLEdBL0JEO0FBZ0NBLENBaFNDLEVBZ1NDckMsTUFoU0QsQ0FBRiIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiggZnVuY3Rpb24oICQgKSB7XG5cdC8qKlxuXHQgKiBHZW5lcmF0ZXMgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiB0aGUgZHJvcGRvd24gYWN0aXZpdHkgYW5kIEFQSSByZXN1bHRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHRcdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0XHR9O1xuXHRcdH0oKSApO1xuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdH1cblx0XHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdFx0J2luY2x1ZGUnIDogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0XHQnZmllbGRfdHlwZScgOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiB0aGF0LnZhbHVlXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cblx0XHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJycsIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJycsIGRhdGVNYXJrdXAgPSAnJztcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXG5cblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+J1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPidcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIGRlbGF5VGltZSApO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdCAqL1xuXHQgZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHRcdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciByb3dLZXk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRcdHJvd0tleSA9IE1hdGguZmxvb3IoIERhdGUubm93KCkgLyAxMDAwICk7XG5cdFx0XHRcdGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuXHQgKiBAcGFyYW0gc3RyaW5nIHdvcmRwcmVzc09iamVjdCB0aGUgV29yZFByZXNzIG9iamVjdCB0eXBlXG5cdCAqIEBwYXJhbSBzdHJpbmcgc2FsZXNmb3JjZU9iamVjdCB0aGUgU2FsZXNmb3JjZSBvYmplY3QgdHlwZVxuXHQgKiBAcGFyYW0gaW50IHJvd0tleSB3aGljaCByb3cgd2UncmUgd29ya2luZyBvblxuXHQgKi9cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIHdvcmRwcmVzc09iamVjdCwgc2FsZXNmb3JjZU9iamVjdCwgcm93S2V5ICkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAnZ2V0X3dwX3NmX29iamVjdF9maWVsZHMnLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHNhbGVzZm9yY2VPYmplY3Rcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzID0gJyc7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZSA9ICcnO1xuXHRcdFx0dmFyIG1hcmt1cCA9ICcnO1xuXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19maWVsZFsnICsgcm93S2V5ICsgJ11cIiBpZD1cIndvcmRwcmVzc19maWVsZC0nICsgcm93S2V5ICsgJ1wiPidcblx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFdvcmRQcmVzcyBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS53b3JkcHJlc3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHR3b3JkcHJlc3MgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfZmllbGRbJyArIHJvd0tleSArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX2ZpZWxkLScgKyByb3dLZXkgKyAnXCI+J1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFNhbGVzZm9yY2UgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc2FsZXNmb3JjZSwgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRtYXJrdXAgPSAnPHRyPjx0ZCBjbGFzcz1cImNvbHVtbi13b3JkcHJlc3NfZmllbGRcIj4nICsgd29yZHByZXNzICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLXNhbGVzZm9yY2VfZmllbGRcIj4nICsgc2FsZXNmb3JjZSArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19wcmVtYXRjaFwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfcHJlbWF0Y2hbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19wcmVtYXRjaC0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2tleVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfa2V5WycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfa2V5LScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1kaXJlY3Rpb25cIj48ZGl2IGNsYXNzPVwicmFkaW9zXCI+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cInNmX3dwXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy1zZi13cFwiPiAgU2FsZXNmb3JjZSB0byBXb3JkUHJlc3M8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJ3cF9zZlwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctd3Atc2ZcIj4gIFdvcmRQcmVzcyB0byBTYWxlc2ZvcmNlPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic3luY1wiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctc3luY1wiIGNoZWNrZWQ+ICBTeW5jPC9sYWJlbD48L2Rpdj48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19kZWxldGVcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX2RlbGV0ZVsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX2RlbGV0ZS0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48L3RyPic7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbWFya3VwICk7XG5cblx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHR9XG5cblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0ICovXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19pZCcgOiB3b3JkcHJlc3NJZFxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHRcdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdFx0J21hcHBpbmdfaWQnIDogbWFwcGluZ0lkXG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVna
