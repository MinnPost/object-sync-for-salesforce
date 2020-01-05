"use strict";

(function ($) {
  /**
   * Gets the WordPress and Salesforce field results via an Ajax call
   * @param string system whether we want WordPress or Salesforce data
   * @param string object_name the value for the object name from the the <select>
   */
  function loadFieldOptions(system, object_name) {
    var data = {
      'action': 'get_' + system + '_object_fields'
    };
    var selectField = '.column-' + system + '_field select';
    var fields = '';
    var first_field = $(selectField + ' option').first().text();

    if ('' !== $(selectField).val()) {
      return;
    }

    fields += '<option value="">' + first_field + '</option>';

    if ('wordpress' === system) {
      data['wordpress_object'] = object_name;
    } else if ('salesforce' === system) {
      data['salesforce_object'] = object_name;
    } else {
      return fields;
    }

    $.ajax({
      type: 'POST',
      url: ajaxurl,
      data: data,
      beforeSend: function beforeSend() {
        $('.spinner-' + system).addClass('is-active');
      },
      success: function success(response) {
        $.each(response.data.fields, function (index, value) {
          if ('wordpress' === system) {
            fields += '<option value="' + value.key + '">' + value.key + '</option>';
          } else if ('salesforce' === system) {
            fields += '<option value="' + value.name + '">' + value.label + '</option>';
          }
        });
        $(selectField).html(fields);
      },
      complete: function complete() {
        $('.spinner-' + system).removeClass('is-active');
      }
    });
  }
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
   * This also generates other query fields that are object-specific, like date fields, record types allowed, etc.
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
   * this appears not to work with data() instead of attr()
   */


  function addFieldMappingRow() {
    $('#add-field-mapping').click(function () {
      var salesforceObject = $('#salesforce_object').val();
      var wordpressObject = $('#wordpress_object').val();
      var newKey = new Date().getUTCMilliseconds();
      var lastRow = $('table.fields tbody tr').last();
      var oldKey = lastRow.attr('data-key');
      oldKey = new RegExp(oldKey, 'g');
      $(this).text('Add another field mapping');

      if ('' !== wordpressObject && '' !== salesforceObject) {
        fieldmapFields(oldKey, newKey, lastRow);
        $(this).parent().find('.missing-object').remove();
      } else {
        $(this).parent().prepend('<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>');
      }

      return false;
    });
  }
  /**
   * Clones the fieldset markup provided by the server-side template and appends it at the end.
   * this appears not to work with data() instead of attr()
   * @param string oldKey the data key attribute of the set that is being cloned
   * @param string newKey the data key attribute for the one we're appending
   * @param object lastRow the last set of the fieldmap
   */


  function fieldmapFields(oldKey, newKey, lastRow) {
    var nextRow = '';

    if (jQuery.fn.select2) {
      nextRow = lastRow.find('select').select2('destroy').end().clone(true).removeClass('fieldmap-template');
    } else {
      nextRow = lastRow.clone(true);
    }

    $(nextRow).attr('data-key', newKey);
    $(nextRow).each(function () {
      $(this).html(function (i, h) {
        return h.replace(oldKey, newKey);
      });
    });
    $('table.fields tbody').append(nextRow);

    if (jQuery.fn.select2) {
      lastRow.find('select').select2();
      nextRow.find('select').select2();
    }
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
  } // load available options if the wordpress object changes


  $(document).on('change', 'select#wordpress_object', function () {
    var timeout;
    loadFieldOptions('wordpress', $(this).val());
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      $('table.fields tbody tr').fadeOut();
      $('table.fields tbody tr').not('.fieldmap-template').remove();
    }, 1000);
  }); // load available options if the salesforce object changes

  $(document).on('change', 'select#salesforce_object', function () {
    var timeout;
    loadFieldOptions('salesforce', $(this).val());
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      $('table.fields tbody tr').fadeOut();
      $('table.fields tbody tr').not('.fieldmap-template').remove();
    }, 1000);
  }); // Don't show the WSDL file field unless SOAP is enabled

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
   * Manage the display for Salesforce object fields based on API reponse
   * Manual push and pull
   * Clearing the cache
   */

  $(document).ready(function () {
    // Don't show the WSDL file field unless SOAP is enabled
    toggleSoapFields(); // if there is already a wp or sf object, make sure it has the right fields when the page loads

    loadFieldOptions('wordpress', $('select#wordpress_object').val());
    loadFieldOptions('salesforce', $('select#salesforce_object').val()); // setup the select2 fields if the library is present

    if (jQuery.fn.select2) {
      $('select#wordpress_object').select2();
      $('select#salesforce_object').select2();
      $('select#salesforce_record_type_default').select2();
      $('select#pull_trigger_field').select2();
      $('.column-wordpress_field select').select2();
      $('.column-salesforce_field select').select2();
    } // get the available Salesforce object choices


    salesforceObjectFields(); // Duplicate the fields for a new row in the fieldmap options screen.

    addFieldMappingRow(); // Handle manual push and pull of objects

    pushAndPullObjects(); // Clear the plugin cache via Ajax request.

    clearSfwpCacheLink();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0X25hbWUiLCJkYXRhIiwic2VsZWN0RmllbGQiLCJmaWVsZHMiLCJmaXJzdF9maWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYWpheHVybCIsImJlZm9yZVNlbmQiLCJhZGRDbGFzcyIsInN1Y2Nlc3MiLCJyZXNwb25zZSIsImVhY2giLCJpbmRleCIsInZhbHVlIiwia2V5IiwibmFtZSIsImxhYmVsIiwiaHRtbCIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0b2dnbGVTb2FwRmllbGRzIiwibGVuZ3RoIiwiaXMiLCJzaG93IiwiaGlkZSIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJkZWxheSIsInRpbWVyIiwiY2FsbGJhY2siLCJtcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJvbiIsInRoYXQiLCJkZWxheVRpbWUiLCJwb3N0IiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0Iiwid29yZHByZXNzT2JqZWN0IiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiYXR0ciIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInJlbW92ZSIsInByZXBlbmQiLCJuZXh0Um93IiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwiZG9jdW1lbnQiLCJ0aW1lb3V0Iiwibm90IiwicHJvcCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFFLFdBQVVBLENBQVYsRUFBYztBQUVmOzs7OztBQUtBLFdBQVNDLGdCQUFULENBQTJCQyxNQUEzQixFQUFtQ0MsV0FBbkMsRUFBaUQ7QUFDaEQsUUFBSUMsSUFBSSxHQUFHO0FBQ1YsZ0JBQVcsU0FBU0YsTUFBVCxHQUFrQjtBQURuQixLQUFYO0FBR0EsUUFBSUcsV0FBVyxHQUFHLGFBQWFILE1BQWIsR0FBc0IsZUFBeEM7QUFDQSxRQUFJSSxNQUFNLEdBQUcsRUFBYjtBQUNBLFFBQUlDLFdBQVcsR0FBR1AsQ0FBQyxDQUFFSyxXQUFXLEdBQUcsU0FBaEIsQ0FBRCxDQUE0QkcsS0FBNUIsR0FBb0NDLElBQXBDLEVBQWxCOztBQUNBLFFBQUssT0FBT1QsQ0FBQyxDQUFFSyxXQUFGLENBQUQsQ0FBaUJLLEdBQWpCLEVBQVosRUFBcUM7QUFDcEM7QUFDQTs7QUFDREosSUFBQUEsTUFBTSxJQUFJLHNCQUFzQkMsV0FBdEIsR0FBb0MsV0FBOUM7O0FBQ0EsUUFBSyxnQkFBZ0JMLE1BQXJCLEVBQThCO0FBQzdCRSxNQUFBQSxJQUFJLENBQUMsa0JBQUQsQ0FBSixHQUEyQkQsV0FBM0I7QUFDQSxLQUZELE1BRU8sSUFBSyxpQkFBaUJELE1BQXRCLEVBQStCO0FBQ3JDRSxNQUFBQSxJQUFJLENBQUMsbUJBQUQsQ0FBSixHQUE0QkQsV0FBNUI7QUFDQSxLQUZNLE1BRUE7QUFDTixhQUFPRyxNQUFQO0FBQ0E7O0FBRUROLElBQUFBLENBQUMsQ0FBQ1csSUFBRixDQUFPO0FBQ05DLE1BQUFBLElBQUksRUFBRSxNQURBO0FBRU5DLE1BQUFBLEdBQUcs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Q0FBRCxDQUFjSSxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQWpFLElBQUFBLGdCQUFnQixHQUhlLENBSy9COztBQUNBM0IsSUFBQUEsZ0JBQWdCLENBQUUsV0FBRixFQUFlRCxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQlUsR0FBL0IsRUFBZixDQUFoQjtBQUNBVCxJQUFBQSxnQkFBZ0IsQ0FBRSxZQUFGLEVBQWdCRCxDQUFDLENBQUUsMEJBQUYsQ0FBRCxDQUFnQ1UsR0FBaEMsRUFBaEIsQ0FBaEIsQ0FQK0IsQ0FTL0I7O0FBQ0EsUUFBS3NDLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVQyxPQUFmLEVBQXlCO0FBQ3hCbEQsTUFBQUEsQ0FBQyxDQUFFLHlCQUFGLENBQUQsQ0FBK0JrRCxPQUEvQjtBQUNBbEQsTUFBQUEsQ0FBQyxDQUFFLDBCQUFGLENBQUQsQ0FBZ0NrRCxPQUFoQztBQUNBbEQsTUFBQUEsQ0FBQyxDQUFFLHVDQUFGLENBQUQsQ0FBNkNrRCxPQUE3QztBQUNBbEQsTUFBQUEsQ0FBQyxDQUFFLDJCQUFGLENBQUQsQ0FBaUNrRCxPQUFqQztBQUNBbEQsTUFBQUEsQ0FBQyxDQUFFLGdDQUFGLENBQUQsQ0FBc0NrRCxPQUF0QztBQUNBbEQsTUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNrRCxPQUF2QztBQUNBLEtBakI4QixDQW1CL0I7OztBQUNBakIsSUFBQUEsc0JBQXNCLEdBcEJTLENBc0IvQjs7QUFDQWtCLElBQUFBLGtCQUFrQixHQXZCYSxDQXlCL0I7O0FBQ0F3QixJQUFBQSxrQkFBa0IsR0ExQmEsQ0E0Qi9COztBQUNBWSxJQUFBQSxrQkFBa0I7QUFDbEIsR0E5QkQ7QUErQkEsQ0FqWEMsRUFpWEN2QyxNQWpYRCxDQUFGIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHQvKipcblx0ICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuXHQgKiBAcGFyYW0gc3RyaW5nIHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuXHQgKiBAcGFyYW0gc3RyaW5nIG9iamVjdF9uYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIHRoZSA8c2VsZWN0PlxuXHQgKi9cblx0ZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3RfbmFtZSApIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJyxcblx0XHR9XG5cdFx0dmFyIHNlbGVjdEZpZWxkID0gJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0Jztcblx0XHR2YXIgZmllbGRzID0gJyc7XG5cdFx0dmFyIGZpcnN0X2ZpZWxkID0gJCggc2VsZWN0RmllbGQgKyAnIG9wdGlvbicpLmZpcnN0KCkudGV4dCgpO1xuXHRcdGlmICggJycgIT09ICQoIHNlbGVjdEZpZWxkICkudmFsKCkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdF9maWVsZCArICc8L29wdGlvbj4nO1xuXHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdF9uYW1lO1xuXHRcdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0ZGF0YVsnc2FsZXNmb3JjZV9vYmplY3QnXSA9IG9iamVjdF9uYW1lO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmllbGRzO1xuXHRcdH1cblxuXHRcdCQuYWpheCh7XG5cdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0XHR9LFxuICAgIFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG4gICAgXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIHNlbGVjdEZpZWxkICkuaHRtbCggZmllbGRzICk7XG4gICAgXHRcdH0sXG4gICAgXHRcdGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcbiAgICBcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdCAqL1xuXHRmdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRcdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG5cdCAqIFRoaXMgYWxzbyBnZW5lcmF0ZXMgb3RoZXIgcXVlcnkgZmllbGRzIHRoYXQgYXJlIG9iamVjdC1zcGVjaWZpYywgbGlrZSBkYXRlIGZpZWxkcywgcmVjb3JkIHR5cGVzIGFsbG93ZWQsIGV0Yy5cblx0ICovXG5cdGZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0XHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWVyID0gMDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdFx0fTtcblx0XHR9KCkgKTtcblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHR9XG5cdFx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJyA6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnLCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnLCBkYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPidcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9LCBkZWxheVRpbWUgKTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHQgKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcblx0ICovXG5cdCBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdFx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdFx0XHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHRcdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdFx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0XHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBDbG9uZXMgdGhlIGZpZWxkc2V0IG1hcmt1cCBwcm92aWRlZCBieSB0aGUgc2VydmVyLXNpZGUgdGVtcGxhdGUgYW5kIGFwcGVuZHMgaXQgYXQgdGhlIGVuZC5cblx0ICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG5cdCAqIEBwYXJhbSBzdHJpbmcgb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuXHQgKiBAcGFyYW0gc3RyaW5nIG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuXHQgKiBAcGFyYW0gb2JqZWN0IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuXHQgKi9cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHRcdHZhciBuZXh0Um93ID0gJyc7XG4gICAgICAgIGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKVxuXHQgICAgICAgICAgICAuc2VsZWN0MiggJ2Rlc3Ryb3knIClcblx0ICAgICAgICAgICAgLmVuZCgpXG5cdCAgICAgICAgICAgIC5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcbiAgICAgICAgfVxuXHRcdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0XHQkKCBuZXh0Um93ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblx0fVxuXHQvKipcblx0ICogSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0ICovXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZFxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHRcdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdFx0J21hcHBpbmdfaWQnIDogbWFwcGluZ0lkXG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdFx0fSwgMTAwMCApO1xuXHR9KTtcblxuXHQvLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG5cdCQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0XHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHRcdH0sIDEwMDAgKTtcblx0fSk7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHR0b2dnbGVTb2FwRmllbGRzKCk7XG5cdH0pO1xuXG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHMsIGluaXRpYWxpemUgb3IgZW5hYmxlIHRoaW5nczpcblx0ICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG5cdCAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG5cdCAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG5cdCAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG5cdCAqIENsZWFyaW5nIHRoZSBjYWNoZVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0XHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHRcdHRvZ2dsZVNvYXBGaWVsZHMoKTtcblxuXHRcdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkcyB3aGVuIHRoZSBwYWdlIGxvYWRzXG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS52YWwoKSApO1xuXHRcdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKSApO1xuXG5cdFx0Ly8gc2V0dXAgdGhlIHNlbGVjdDIgZmllbGRzIGlmIHRoZSBsaWJyYXJ5IGlzIHByZXNlbnRcblx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0fVxuXG5cdFx0Ly8gZ2V0IHRoZSBhdmFpbGFibGUgU2FsZXNmb3JjZSBvYmplY3QgY2hvaWNlc1xuXHRcdHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKTtcblxuXHRcdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRcdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXG5cdFx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0XHRwdXNoQW5kUHVsbE9iamVjdHMoKTtcblxuXHRcdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0XHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblx0fSk7XG59KCBqUXVlcnkgKSApO1xuIl19
