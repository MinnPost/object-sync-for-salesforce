"use strict";

(function ($) {
  /**
   * Don't show the WSDL file field unless SOAP is enabled
   */
  function toggleSoapFields() {
    if (0 < $('.object-sync-for-salesforce-enable-soap').length) {
      if ($('.object-sync-for-salesforce-enable-soap input').is(':checked')) {
        $('.object-sync-for-salesforce-soap-wsdl-path').show();
      } else {
        $('.object-sync-for-salesforce-soap-wsdl-path').hide();
      }
    }
  }
  /**
   * Generates the Salesforce object fields based on the dropdown activity and API results.
   */


  function salesforceObjectFields() {
    var delay = function () {
      var timer = 0;
      return function (callback, ms) {
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
      };
    }();

    if (0 === $('.salesforce_record_types_allowed > *').length) {
      $('.salesforce_record_types_allowed').hide();
    }

    if (0 === $('.salesforce_record_type_default > *').length) {
      $('.salesforce_record_type_default').hide();
    }

    if (0 === $('.pull_trigger_field > *').length) {
      $('.pull_trigger_field').hide();
    }

    $('#salesforce_object').on('change', function () {
      var that = this;
      var delayTime = 1000;
      delay(function () {
        var data = {
          'action': 'get_salesforce_object_description',
          'include': ['fields', 'recordTypeInfos'],
          'field_type': 'datetime',
          'salesforce_object': that.value
        };
        $.post(ajaxurl, data, function (response) {
          var recordTypesAllowedMarkup = '',
              recordTypeDefaultMarkup = '',
              dateMarkup = '';

          if (0 < $(response.data.recordTypeInfos).length) {
            recordTypesAllowedMarkup += '<label for="salesforce_record_types_allowed">Allowed Record Types:</label><div class="checkboxes">';
            $.each(response.data.recordTypeInfos, function (index, value) {
              recordTypesAllowedMarkup += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
            });
            recordTypesAllowedMarkup += '</div>';
            recordTypeDefaultMarkup += '<label for="salesforce_record_type_default">Default Record Type:</label>';
            recordTypeDefaultMarkup += '<select name="salesforce_record_type_default" id="salesforce_record_type_default"><option value="">- Select record type -</option>';
            $.each(response.data.recordTypeInfos, function (index, value) {
              recordTypeDefaultMarkup += '<option value="' + index + '">' + value + '</option>';
            });
          }

          $('.salesforce_record_types_allowed').html(recordTypesAllowedMarkup);
          $('.salesforce_record_type_default').html(recordTypeDefaultMarkup);

          if (0 < $(response.data.fields).length) {
            dateMarkup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
            dateMarkup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>';
            $.each(response.data.fields, function (index, value) {
              dateMarkup += '<option value="' + value.name + '">' + value.label + '</option>';
            });
            dateMarkup += '</select>';
            dateMarkup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>';
          }

          $('.pull_trigger_field').html(dateMarkup);

          if ('' !== recordTypesAllowedMarkup) {
            $('.salesforce_record_types_allowed').show();
          } else {
            $('.salesforce_record_types_allowed').hide();
          }

          if ('' !== recordTypeDefaultMarkup) {
            $('.salesforce_record_type_default').show();
          } else {
            $('.salesforce_record_type_default').hide();
          }

          if ('' !== dateMarkup) {
            $('.pull_trigger_field').show();
          } else {
            $('.pull_trigger_field').hide();
          }

          if (jQuery.fn.select2) {
            $('select#salesforce_record_type_default').select2();
            $('select#pull_trigger_field').select2();
          }
        });
      }, delayTime);
    });
  }
  /**
   * Duplicates the fields for a new row in the fieldmap options screen.
   */


  function addFieldMappingRow() {
    $('#add-field-mapping').click(function () {
      var salesforceObject = $('#salesforce_object').val();
      var wordpressObject = $('#wordpress_object').val();
      var rowKey;
      $(this).text('Add another field mapping');

      if ('' !== wordpressObject && '' !== salesforceObject) {
        rowKey = Math.floor(Date.now() / 1000);
        fieldmapFields(wordpressObject, salesforceObject, rowKey);
        $(this).parent().find('.missing-object').remove();
      } else {
        $(this).parent().prepend('<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>');
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


  function fieldmapFields(wordpressObject, salesforceObject, rowKey) {
    var data = {
      'action': 'get_wp_sf_object_fields',
      'wordpress_object': wordpressObject,
      'salesforce_object': salesforceObject
    };
    $.post(ajaxurl, data, function (response) {
      var wordpress = '';
      var salesforce = '';
      var markup = '';
      wordpress += '<select name="wordpress_field[' + rowKey + ']" id="wordpress_field-' + rowKey + '">';
      wordpress += '<option value="">- Select WordPress field -</option>';
      $.each(response.data.wordpress, function (index, value) {
        wordpress += '<option value="' + value.key + '">' + value.key + '</option>';
      });
      wordpress += '</select>';
      salesforce += '<select name="salesforce_field[' + rowKey + ']" id="salesforce_field-' + rowKey + '">';
      salesforce += '<option value="">- Select Salesforce field -</option>';
      $.each(response.data.salesforce, function (index, value) {
        salesforce += '<option value="' + value.name + '">' + value.label + '</option>';
      });
      salesforce += '</select>';
      markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + rowKey + ']" id="is_prematch-' + rowKey + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + rowKey + ']" id="is_key-' + rowKey + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sync" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sync" checked>  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + rowKey + ']" id="is_delete-' + rowKey + '" value="1" /></td></tr>';
      $('table.fields tbody').append(markup);

      if (jQuery.fn.select2) {
        $('.column-wordpress_field select').select2();
        $('.column-salesforce_field select').select2();
      }
    });
  }
  /**
   * Handle manual push and pull of objects
   */


  function pushAndPullObjects() {
    $('.salesforce_user_ajax_message').hide();

    if (0 < $('#wordpress_object_ajax').length) {
      $('.push_to_salesforce_button').on('click', function () {
        var wordpressObject = $('#wordpress_object_ajax').val();
        var wordpressId = $('#wordpress_id_ajax').val();
        var salesforceId = $('#salesforce_id_ajax').val();
        var data = {
          'action': 'push_to_salesforce',
          'wordpress_object': wordpressObject,
          'wordpress_id': wordpressId,
          'salesforce_id': salesforceId
        };
        $.post(ajaxurl, data, function (response) {
          if (true === response.success) {
            updateSalesforceUserSummary();
            $('.salesforce_user_ajax_message').width($('.mapped-salesforce-user').width() - 27);
            $('.salesforce_user_ajax_message').html('<p>This object has been pushed to Salesforce.</p>').fadeIn().delay(4000).fadeOut();
          }
        });
        return false;
      });
    }

    $('.pull_from_salesforce_button').on('click', function () {
      var salesforceId = $('#salesforce_id_ajax').val();
      var wordpressObject = $('#wordpress_object_ajax').val();
      var data = {
        'action': 'pull_from_salesforce',
        'salesforce_id': salesforceId,
        'wordpress_object': wordpressObject
      };
      $.post(ajaxurl, data, function (response) {
        if (true === response.success) {
          updateSalesforceUserSummary();
          $('.salesforce_user_ajax_message').width($('.mapped-salesforce-user').width() - 27);
          $('.salesforce_user_ajax_message').html('<p>This object has been pulled from Salesforce.</p>').fadeIn().delay(4000).fadeOut();
        }
      });
      return false;
    });
  }
  /**
   * Updates the user profile summary of Salesforce info.
   */


  function updateSalesforceUserSummary() {
    var mappingId = $('#mapping_id_ajax').val();
    var data = {
      'action': 'refresh_mapped_data',
      'mapping_id': mappingId
    };
    $.post(ajaxurl, data, function (response) {
      if (true === response.success) {
        $('td.last_sync_message').text(response.data.last_sync_message);
        $('td.last_sync_action').text(response.data.last_sync_action);
        $('td.last_sync_status').text(response.data.last_sync_status);
        $('td.last_sync').text(response.data.last_sync);

        if ('1' === response.data.last_sync_status) {
          $('td.last_sync_status').text('success');
        }
      }
    });
  }
  /**
   * Clear the plugin cache via Ajax request.
   */


  function clearSfwpCacheLink() {
    $('#clear-sfwp-cache').click(function () {
      var data = {
        'action': 'clear_sfwp_cache'
      };
      var that = $(this);
      $.post(ajaxurl, data, function (response) {
        if (true === response.success && true === response.data.success) {
          that.parent().html(response.data.message).fadeIn();
        }
      });
      return false;
    });
  } // show wsdl field if soap is enabled


  $(document).on('change', '.object-sync-for-salesforce-enable-soap input', function () {
    toggleSoapFields();
  });
  /**
   * As the Drupal plugin does, we only allow one field to be a prematch
   */

  $(document).on('click', '.column-is_prematch input', function () {
    $('.column-is_prematch input').not(this).prop('checked', false);
  });
  /**
   * As the Drupal plugin does, we only allow one field to be a key
   */

  $(document).on('click', '.column-is_key input', function () {
    $('.column-is_key input').not(this).prop('checked', false);
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

  $(document).ready(function () {
    // for main admin settings
    toggleSoapFields(); // for the fieldmap add/edit screen

    var timeout;

    if (jQuery.fn.select2) {
      /*$( 'select#wordpress_object' ).select2();
      $( 'select#salesforce_object' ).select2();
      $( 'select#salesforce_record_type_default' ).select2();
      $( 'select#pull_trigger_field' ).select2();
      $( '.column-wordpress_field select' ).select2();
      $( '.column-salesforce_field select' ).select2();*/
      $('.sfwp-o-fieldmap select').select2();
    }

    $('#wordpress_object, #salesforce_object').on('change', function () {
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        $('table.fields tbody tr').fadeOut();
        $('table.fields tbody tr').remove();
      }, 1000);
    }); // todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page

    $(document).ajaxStart(function () {
      $('.spinner').addClass('is-active');
    }).ajaxStop(function () {
      $('.spinner').removeClass('is-active');
    });
    salesforceObjectFields();
    addFieldMappingRow(); // for push/pull methods running via ajax

    pushAndPullObjects(); // for clearing the plugin cache

    clearSfwpCacheLink();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJ0b2dnbGVTb2FwRmllbGRzIiwibGVuZ3RoIiwiaXMiLCJzaG93IiwiaGlkZSIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJkZWxheSIsInRpbWVyIiwiY2FsbGJhY2siLCJtcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJvbiIsInRoYXQiLCJkZWxheVRpbWUiLCJkYXRhIiwidmFsdWUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwiZWFjaCIsImluZGV4IiwiaHRtbCIsImZpZWxkcyIsIm5hbWUiLCJsYWJlbCIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsInZhbCIsIndvcmRwcmVzc09iamVjdCIsInJvd0tleSIsInRleHQiLCJNYXRoIiwiZmxvb3IiLCJEYXRlIiwibm93IiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicmVtb3ZlIiwicHJlcGVuZCIsIndvcmRwcmVzcyIsInNhbGVzZm9yY2UiLCJtYXJrdXAiLCJrZXkiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInN1Y2Nlc3MiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImZhZGVPdXQiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsImRvY3VtZW50Iiwibm90IiwicHJvcCIsInJlYWR5IiwidGltZW91dCIsImFqYXhTdGFy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QUFBLGdCQUFnQixHQUhlLENBSy9COztBQUNBLFFBQUl5RSxPQUFKOztBQUVBLFFBQUszQyxNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4Qjs7Ozs7O0FBTUFqQyxNQUFBQSxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQmlDLE9BQS9CO0FBQ0E7O0FBRURqQyxJQUFBQSxDQUFDLENBQUUsdUNBQUYsQ0FBRCxDQUE2Q2EsRUFBN0MsQ0FBaUQsUUFBakQsRUFBMkQsWUFBVztBQUNyRUYsTUFBQUEsWUFBWSxDQUFFK0QsT0FBRixDQUFaO0FBQ0FBLE1BQUFBLE9BQU8sR0FBRzlELFVBQVUsQ0FBRSxZQUFXO0FBQ2hDWixRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjhELE9BQTdCO0FBQ0E5RCxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QmdELE1BQTdCO0FBQ0EsT0FIbUIsRUFHakIsSUFIaUIsQ0FBcEI7QUFJQSxLQU5ELEVBbEIrQixDQTBCL0I7O0FBQ0FoRCxJQUFBQSxDQUFDLENBQUVzRSxRQUFGLENBQUQsQ0FBY0ssU0FBZCxDQUF5QixZQUFXO0FBQ25DM0UsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQjRFLFFBQWhCLENBQTBCLFdBQTFCO0FBQ0EsS0FGRCxFQUVHQyxRQUZILENBRWEsWUFBVztBQUN2QjdFLE1BQUFBLENBQUMsQ0FBRSxVQUFGLENBQUQsQ0FBZ0I4RSxXQUFoQixDQUE2QixXQUE3QjtBQUNBLEtBSkQ7QUFLQXhFLElBQUFBLHNCQUFzQjtBQUN0QjRCLElBQUFBLGtCQUFrQixHQWpDYSxDQW1DL0I7O0FBQ0FxQixJQUFBQSxrQkFBa0IsR0FwQ2EsQ0FzQy9COztBQUNBYSxJQUFBQSxrQkFBa0I7QUFDbEIsR0F4Q0Q7QUF5Q0EsQ0EvVEMsRUErVENyQyxNQS9URCxDQUFGIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHQvKipcblx0ICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0ICovXG5cdGZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cblx0ICovXG5cdGZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0XHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWVyID0gMDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdFx0fTtcblx0XHR9KCkgKTtcblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHR9XG5cdFx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJyA6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnLCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnLCBkYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPidcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9LCBkZWxheVRpbWUgKTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHQgKi9cblx0IGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0XHQkKCAnI2FkZC1maWVsZC1tYXBwaW5nJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgcm93S2V5O1xuXHRcdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdFx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0XHRyb3dLZXkgPSBNYXRoLmZsb29yKCBEYXRlLm5vdygpIC8gMTAwMCApO1xuXHRcdFx0XHRmaWVsZG1hcEZpZWxkcyggd29yZHByZXNzT2JqZWN0LCBzYWxlc2ZvcmNlT2JqZWN0LCByb3dLZXkgKTtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcblx0ICogQHBhcmFtIHN0cmluZyB3b3JkcHJlc3NPYmplY3QgdGhlIFdvcmRQcmVzcyBvYmplY3QgdHlwZVxuXHQgKiBAcGFyYW0gc3RyaW5nIHNhbGVzZm9yY2VPYmplY3QgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGVcblx0ICogQHBhcmFtIGludCByb3dLZXkgd2hpY2ggcm93IHdlJ3JlIHdvcmtpbmcgb25cblx0ICovXG5cdGZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ2dldF93cF9zZl9vYmplY3RfZmllbGRzJyxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiBzYWxlc2ZvcmNlT2JqZWN0XG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0dmFyIHdvcmRwcmVzcyA9ICcnO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2UgPSAnJztcblx0XHRcdHZhciBtYXJrdXAgPSAnJztcblxuXHRcdFx0d29yZHByZXNzICs9ICc8c2VsZWN0IG5hbWU9XCJ3b3JkcHJlc3NfZmllbGRbJyArIHJvd0tleSArICddXCIgaWQ9XCJ3b3JkcHJlc3NfZmllbGQtJyArIHJvd0tleSArICdcIj4nXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBXb3JkUHJlc3MgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEud29yZHByZXNzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0d29yZHByZXNzICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX2ZpZWxkWycgKyByb3dLZXkgKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9maWVsZC0nICsgcm93S2V5ICsgJ1wiPidcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBTYWxlc2ZvcmNlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnNhbGVzZm9yY2UsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0bWFya3VwID0gJzx0cj48dGQgY2xhc3M9XCJjb2x1bW4td29yZHByZXNzX2ZpZWxkXCI+JyArIHdvcmRwcmVzcyArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkXCI+JyArIHNhbGVzZm9yY2UgKyAnPC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfcHJlbWF0Y2hcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX3ByZW1hdGNoWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfcHJlbWF0Y2gtJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19rZXlcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX2tleVsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX2tleS0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4tZGlyZWN0aW9uXCI+PGRpdiBjbGFzcz1cInJhZGlvc1wiPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzZl93cFwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctc2Ytd3BcIj4gIFNhbGVzZm9yY2UgdG8gV29yZFByZXNzPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwid3Bfc2ZcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXdwLXNmXCI+ICBXb3JkUHJlc3MgdG8gU2FsZXNmb3JjZTwvbGFiZWw+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cInN5bmNcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXN5bmNcIiBjaGVja2VkPiAgU3luYzwvbGFiZWw+PC9kaXY+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfZGVsZXRlXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19kZWxldGVbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19kZWxldGUtJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PC90cj4nO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG1hcmt1cCApO1xuXG5cdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdCAqL1xuXHRmdW5jdGlvbiBwdXNoQW5kUHVsbE9iamVjdHMoKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0XHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19pZCcgOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWRcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdFxuXHRcdFx0fVxuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cblx0ICovXG5cdGZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0XHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHRcdCdtYXBwaW5nX2lkJyA6IG1hcHBpbmdJZFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHQgKi9cblx0ZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHRcdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHRcdH1cblx0XHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBzaG93IHdzZGwgZmllbGQgaWYgc29hcCBpcyBlbmFibGVkXG5cdCQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXHR9KTtcblxuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcblx0ICovXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzLCBpbml0aWFsaXplIG9yIGVuYWJsZSB0aGluZ3M6XG5cdCAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuXHQgKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuXHQgKiBBZGQgYSBzcGlubmVyIGZvciBBamF4IHJlcXVlc3RzXG5cdCAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG5cdCAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG5cdCAqIENsZWFyaW5nIHRoZSBjYWNoZVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0XHQvLyBmb3IgbWFpbiBhZG1pbiBzZXR0aW5nc1xuXHRcdHRvZ2dsZVNvYXBGaWVsZHMoKTtcblxuXHRcdC8vIGZvciB0aGUgZmllbGRtYXAgYWRkL2VkaXQgc2NyZWVuXG5cdFx0dmFyIHRpbWVvdXQ7XG5cblx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0LyokKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTsqL1xuXHRcdFx0JCggJy5zZndwLW8tZmllbGRtYXAgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHR9XG5cblx0XHQkKCAnI3dvcmRwcmVzc19vYmplY3QsICNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdFx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLnJlbW92ZSgpO1xuXHRcdFx0fSwgMTAwMCApO1xuXHRcdH0pO1xuXG5cdFx0Ly8gdG9kbzogbmVlZCB0byBmaXggdGhpcyBzbyBpdCBkb2Vzbid0IHJ1biBhbGwgdGhlIHNwaW5uZXJzIGF0IHRoZSBzYW1lIHRpbWUgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGVzIG9uIHRoZSBzYW1lIHBhZ2Vcblx0XHQkKCBkb2N1bWVudCApLmFqYXhTdGFydCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXInICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSkuYWpheFN0b3AoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pO1xuXHRcdHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKTtcblx0XHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHRcdC8vIGZvciBwdXNoL3B1bGwgbWV0aG9kcyBydW5uaW5nIHZpYSBhamF4XG5cdFx0cHVzaEFuZFB1bGxPYmplY3RzKCk7XG5cblx0XHQvLyBmb3IgY2xlYXJpbmcgdGhlIHBsdWdpbiBjYWNoZVxuXHRcdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXHR9KTtcbn0oIGpRdWVyeSApICk7XG4iXX0=
