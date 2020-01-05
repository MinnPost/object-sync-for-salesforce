"use strict";

(function ($) {
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

    $.post(ajaxurl, data, function (response) {
      $.each(response.data.fields, function (index, value) {
        if ('wordpress' === system) {
          fields += '<option value="' + value.key + '">' + value.key + '</option>';
        } else if ('salesforce' === system) {
          fields += '<option value="' + value.name + '">' + value.label + '</option>';
        }
      });
      $(selectField).html(fields);
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
   * Gets the WordPress and Salesforce field results via an Ajax call
   * @param string oldKey the data-key attribute of the set that is being cloned
   * @param string newKey the data-key attribute for the one we're appending
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
  }); // show wsdl field if soap is enabled

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
    toggleSoapFields(); // if there is already a wp or sf object, make sure it has the right fields

    loadFieldOptions('wordpress', $('select#wordpress_object').val());
    loadFieldOptions('salesforce', $('select#salesforce_object').val());

    if (jQuery.fn.select2) {
      $('select#wordpress_object').select2();
      $('select#salesforce_object').select2();
      $('select#salesforce_record_type_default').select2();
      $('select#pull_trigger_field').select2();
      $('.column-wordpress_field select').select2();
      $('.column-salesforce_field select').select2();
    } // todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page


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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0X25hbWUiLCJkYXRhIiwic2VsZWN0RmllbGQiLCJmaWVsZHMiLCJmaXJzdF9maWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImtleSIsIm5hbWUiLCJsYWJlbCIsImh0bWwiLCJ0b2dnbGVTb2FwRmllbGRzIiwibGVuZ3RoIiwiaXMiLCJzaG93IiwiaGlkZSIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJkZWxheSIsInRpbWVyIiwiY2FsbGJhY2siLCJtcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJvbiIsInRoYXQiLCJkZWxheVRpbWUiLCJyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAiLCJyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCIsImRhdGVNYXJrdXAiLCJyZWNvcmRUeXBlSW5mb3MiLCJqUXVlcnkiLCJmbiIsInNlbGVjdDIiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsInNhbGVzZm9yY2VPYmplY3QiLCJ3b3JkcHJlc3NPYmplY3QiLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJhdHRyIiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicmVtb3ZlIiwicHJlcGVuZCIsIm5leHRSb3ciLCJlbmQiLCJjbG9uZSIsInJlbW92ZUNsYXNzIiwiaSIsImgiLCJyZXBsYWNlIiwiYXBwZW5kIiwicHVzaEFuZFB1bGxPYmplY3RzIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJzdWNjZXNzIiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJmYWRlT3V0IiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJkb2N1bWVudCIsInRpbWVvdXQiLCJub3QiLCJwcm9wIiwicmVhZHkiLCJhamF4U3RhcnQiLCJhZGRDbGFzcyIsImFqYXhTdG9wIl0sIm1hcHBpbmdzIjoiOztBQUFFLFdBQVVBLENBQVYsRUFBYztBQUVmLFdBQVNDLGdCQUFULENBQTJCQyxNQUEzQixFQUFtQ0MsV0FBbkMsRUFBaUQ7QUFDaEQsUUFBSUMsSUFBSSxHQUFHO0FBQ1YsZ0JBQVcsU0FBU0YsTUFBVCxHQUFrQjtBQURuQixLQUFYO0FBR0EsUUFBSUcsV0FBVyxHQUFHLGFBQWFILE1BQWIsR0FBc0IsZUFBeEM7QUFDQSxRQUFJSSxNQUFNLEdBQUcsRUFBYjtBQUNBLFFBQUlDLFdBQVcsR0FBR1AsQ0FBQyxDQUFFSyxXQUFXLEdBQUcsU0FBaEIsQ0FBRCxDQUE0QkcsS0FBNUIsR0FBb0NDLElBQXBDLEVBQWxCOztBQUNBLFFBQUssT0FBT1QsQ0FBQyxDQUFFSyxXQUFGLENBQUQsQ0FBaUJLLEdBQWpCLEVBQVosRUFBcUM7QUFDcEM7QUFDQTs7QUFDREosSUFBQUEsTUFBTSxJQUFJLHNCQUFzQkMsV0FBdEIsR0FBb0MsV0FBOUM7O0FBQ0EsUUFBSyxnQkFBZ0JMLE1BQXJCLEVBQThCO0FBQzdCRSxNQUFBQSxJQUFJLENBQUMsa0JBQUQsQ0FBSixHQUEyQkQsV0FBM0I7QUFDQSxLQUZELE1BRU8sSUFBSyxpQkFBaUJELE1BQXRCLEVBQStCO0FBQ3JDRSxNQUFBQSxJQUFJLENBQUMsbUJBQUQsQ0FBSixHQUE0QkQsV0FBNUI7QUFDQSxLQUZNLE1BRUE7QUFDTixhQUFPRyxNQUFQO0FBQ0E7O0FBQ0ROLElBQUFBLENBQUMsQ0FBQ1csSUFBRixDQUFRQyxPQUFSLEVBQWlCUixJQUFqQixFQUF1QixVQUFVUyxRQUFWLEVBQXFCO0FBQzNDYixNQUFBQSxDQUFDLENBQUNjLElBQUYsQ0FB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Q0FBRCxDQUFnQzBDLE9BQWhDO0FBQ0ExQyxNQUFBQSxDQUFDLENBQUUsdUNBQUYsQ0FBRCxDQUE2QzBDLE9BQTdDO0FBQ0ExQyxNQUFBQSxDQUFDLENBQUUsMkJBQUYsQ0FBRCxDQUFpQzBDLE9BQWpDO0FBQ0ExQyxNQUFBQSxDQUFDLENBQUUsZ0NBQUYsQ0FBRCxDQUFzQzBDLE9BQXRDO0FBQ0ExQyxNQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1QzBDLE9BQXZDO0FBQ0EsS0FoQjhCLENBa0IvQjs7O0FBQ0ExQyxJQUFBQSxDQUFDLENBQUVtRixRQUFGLENBQUQsQ0FBY0ssU0FBZCxDQUF5QixZQUFXO0FBQ25DeEYsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQnlGLFFBQWhCLENBQTBCLFdBQTFCO0FBQ0EsS0FGRCxFQUVHQyxRQUZILENBRWEsWUFBVztBQUN2QjFGLE1BQUFBLENBQUMsQ0FBRSxVQUFGLENBQUQsQ0FBZ0IrRCxXQUFoQixDQUE2QixXQUE3QjtBQUNBLEtBSkQ7QUFLQXJDLElBQUFBLHNCQUFzQjtBQUN0QmlCLElBQUFBLGtCQUFrQixHQXpCYSxDQTJCL0I7O0FBQ0F5QixJQUFBQSxrQkFBa0IsR0E1QmEsQ0E4Qi9COztBQUNBYSxJQUFBQSxrQkFBa0I7QUFDbEIsR0FoQ0Q7QUFpQ0EsQ0FoV0MsRUFnV0N6QyxNQWhXRCxDQUFGIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdF9uYW1lICkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnLFxuXHRcdH1cblx0XHR2YXIgc2VsZWN0RmllbGQgPSAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnO1xuXHRcdHZhciBmaWVsZHMgPSAnJztcblx0XHR2YXIgZmlyc3RfZmllbGQgPSAkKCBzZWxlY3RGaWVsZCArICcgb3B0aW9uJykuZmlyc3QoKS50ZXh0KCk7XG5cdFx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RmllbGQgKS52YWwoKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0X2ZpZWxkICsgJzwvb3B0aW9uPic7XG5cdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0X25hbWU7XG5cdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0X25hbWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBmaWVsZHM7XG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQkKCBzZWxlY3RGaWVsZCApLmh0bWwoIGZpZWxkcyApO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdCAqL1xuXHRmdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRcdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdFx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aW1lciA9IDA7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHRcdH07XG5cdFx0fSgpICk7XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0XHQnaW5jbHVkZScgOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdFx0XHRcdCdmaWVsZF90eXBlJyA6ICdkYXRldGltZScsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHRoYXQudmFsdWVcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJywgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJywgZGF0ZU1hcmt1cCA9ICcnO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cblxuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj5EZWZhdWx0IFJlY29yZCBUeXBlOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmh0bWwoIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nXG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+J1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgZGVsYXlUaW1lICk7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0ICovXG5cdCBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdFx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdFx0XHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHRcdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdFx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0XHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG5cdCAqIEBwYXJhbSBzdHJpbmcgb2xkS2V5IHRoZSBkYXRhLWtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuXHQgKiBAcGFyYW0gc3RyaW5nIG5ld0tleSB0aGUgZGF0YS1rZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuXHQgKiBAcGFyYW0gb2JqZWN0IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuXHQgKi9cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHRcdHZhciBuZXh0Um93ID0gJyc7XG4gICAgICAgIGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKVxuXHQgICAgICAgICAgICAuc2VsZWN0MiggJ2Rlc3Ryb3knIClcblx0ICAgICAgICAgICAgLmVuZCgpXG5cdCAgICAgICAgICAgIC5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcbiAgICAgICAgfVxuXHRcdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0XHQkKCBuZXh0Um93ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblx0fVxuXHQvKipcblx0ICogSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0ICovXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZFxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHRcdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdFx0J21hcHBpbmdfaWQnIDogbWFwcGluZ0lkXG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdFx0fSwgMTAwMCApO1xuXHR9KTtcblxuXHQvLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG5cdCQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0XHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHRcdH0sIDEwMDAgKTtcblx0fSk7XG5cblx0Ly8gc2hvdyB3c2RsIGZpZWxkIGlmIHNvYXAgaXMgZW5hYmxlZFxuXHQkKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdHRvZ2dsZVNvYXBGaWVsZHMoKTtcblx0fSk7XG5cblx0LyoqXG5cdCAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcblx0ICovXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblx0LyoqXG5cdCAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblx0LyoqXG5cdCAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkcywgaW5pdGlhbGl6ZSBvciBlbmFibGUgdGhpbmdzOlxuXHQgKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcblx0ICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcblx0ICogQWRkIGEgc3Bpbm5lciBmb3IgQWpheCByZXF1ZXN0c1xuXHQgKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuXHQgKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuXHQgKiBDbGVhcmluZyB0aGUgY2FjaGVcblx0ICovXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdFx0Ly8gZm9yIG1haW4gYWRtaW4gc2V0dGluZ3Ncblx0XHR0b2dnbGVTb2FwRmllbGRzKCk7XG5cblx0XHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHNcblx0XHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpICk7XG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpICk7XG5cblx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0fVxuXG5cdFx0Ly8gdG9kbzogbmVlZCB0byBmaXggdGhpcyBzbyBpdCBkb2Vzbid0IHJ1biBhbGwgdGhlIHNwaW5uZXJzIGF0IHRoZSBzYW1lIHRpbWUgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGVzIG9uIHRoZSBzYW1lIHBhZ2Vcblx0XHQkKCBkb2N1bWVudCApLmFqYXhTdGFydCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXInICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSkuYWpheFN0b3AoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pO1xuXHRcdHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKTtcblx0XHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHRcdC8vIGZvciBwdXNoL3B1bGwgbWV0aG9kcyBydW5uaW5nIHZpYSBhamF4XG5cdFx0cHVzaEFuZFB1bGxPYmplY3RzKCk7XG5cblx0XHQvLyBmb3IgY2xlYXJpbmcgdGhlIHBsdWdpbiBjYWNoZVxuXHRcdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXHR9KTtcbn0oIGpRdWVyeSApICk7XG4iXX0=
