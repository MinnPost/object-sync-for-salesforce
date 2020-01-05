"use strict";

(function ($) {
  function loadFieldOptions(system, object_name) {
    var data = {
      'action': 'get_' + system + '_object_fields'
    };
    var fields = '';
    var first_field = $('.column-' + system + '_field select option').first().text();
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
      $('.column-' + system + '_field select').html(fields);
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
      var newKey = new Date().getUTCMilliseconds();
      var lastRow = $('table.fields tbody tr').last();
      var oldKey = lastRow.attr('data-key');
      oldKey = new RegExp(oldKey, 'g');
      $(this).text('Add another field mapping');
      fieldmapFields(oldKey, newKey, lastRow);
      $(this).parent().find('.missing-object').remove();
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
      $('table.fields tbody tr').not(':last').remove();
    }, 1000);
  }); // load available options if the salesforce object changes

  $(document).on('change', 'select#salesforce_object', function () {
    var timeout;
    loadFieldOptions('salesforce', $(this).val());
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      $('table.fields tbody tr').fadeOut();
      $('table.fields tbody tr').not(':last').remove();
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
    toggleSoapFields();

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0X25hbWUiLCJkYXRhIiwiZmllbGRzIiwiZmlyc3RfZmllbGQiLCJmaXJzdCIsInRleHQiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJrZXkiLCJuYW1lIiwibGFiZWwiLCJodG1sIiwidG9nZ2xlU29hcEZpZWxkcyIsImxlbmd0aCIsImlzIiwic2hvdyIsImhpZGUiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJhdHRyIiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicmVtb3ZlIiwibmV4dFJvdyIsImVuZCIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NPYmplY3QiLCJ2YWwiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInN1Y2Nlc3MiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImZhZGVPdXQiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsImRvY3VtZW50IiwidGltZW91dCIsIm5vdCIsInByb3AiLCJyZWFkeSIsImFqYXhTdGFydCIsImFkZENsYXNzIiwiYWpheFN0b3AiXSwibWFwcGluZ3MiOiI7O0FBQUUsV0FBVUEsQ0FBVixFQUFjO0FBRWYsV0FBU0MsZ0JBQVQsQ0FBMkJDLE1BQTNCLEVBQW1DQyxXQUFuQyxFQUFpRDtBQUNoRCxRQUFJQyxJQUFJLEdBQUc7QUFDVixnQkFBVyxTQUFTRixNQUFULEdBQWtCO0FBRG5CLEtBQVg7QUFHQSxRQUFJRyxNQUFNLEdBQUcsRUFBYjtBQUNBLFFBQUlDLFdBQVcsR0FBR04sQ0FBQyxDQUFFLGFBQWFFLE1BQWIsR0FBc0Isc0JBQXhCLENBQUQsQ0FBaURLLEtBQWpELEdBQXlEQyxJQUF6RCxFQUFsQjtBQUNBSCxJQUFBQSxNQUFNLElBQUksc0JBQXNCQyxXQUF0QixHQUFvQyxXQUE5Qzs7QUFDQSxRQUFLLGdCQUFnQkosTUFBckIsRUFBOEI7QUFDN0JFLE1BQUFBLElBQUksQ0FBQyxrQkFBRCxDQUFKLEdBQTJCRCxXQUEzQjtBQUNBLEtBRkQsTUFFTyxJQUFLLGlCQUFpQkQsTUFBdEIsRUFBK0I7QUFDckNFLE1BQUFBLElBQUksQ0FBQyxtQkFBRCxDQUFKLEdBQTRCRCxXQUE1QjtBQUNBLEtBRk0sTUFFQTtBQUNOLGFBQU9FLE1BQVA7QUFDQTs7QUFDREwsSUFBQUEsQ0FBQyxDQUFDUyxJQUFGLENBQVFDLE9BQVIsRUFBaUJOLElBQWpCLEVBQXVCLFVBQVVPLFFBQVYsRUFBcUI7QUFDM0NYLE1BQUFBLENBQUMsQ0FBQ1ksSUFBRixDQUFRRCxRQUFRLENBQUNQLElBQVQsQ0FBY0MsTUFBdEIsRUFBOEIsVUFBVVEsS0FBVixFQUFpQkMsS0FBakIsRUFBeUI7QUFDdEQsWUFBSyxnQkFBZ0JaLE1BQXJCLEVBQThCO0FBQzdCRyxVQUFBQSxNQUFNLElBQUksb0JBQW9CUyxLQUFLLENBQUNDLEdBQTFCLEdBQWdDLElB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QWtWQ3hDLE1BbFZELENBQUYiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0X25hbWUgKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcycsXG5cdFx0fVxuXHRcdHZhciBmaWVsZHMgPSAnJztcblx0XHR2YXIgZmlyc3RfZmllbGQgPSAkKCAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3Qgb3B0aW9uJykuZmlyc3QoKS50ZXh0KCk7XG5cdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0X2ZpZWxkICsgJzwvb3B0aW9uPic7XG5cdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0X25hbWU7XG5cdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0X25hbWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBmaWVsZHM7XG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQkKCAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnICkuaHRtbCggZmllbGRzICk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0ICovXG5cdGZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cblx0ICovXG5cdGZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0XHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWVyID0gMDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdFx0fTtcblx0XHR9KCkgKTtcblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHR9XG5cdFx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJyA6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnLCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnLCBkYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPidcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9LCBkZWxheVRpbWUgKTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHQgKi9cblx0IGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0XHQkKCAnI2FkZC1maWVsZC1tYXBwaW5nJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdFx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0XHRcdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0XHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG5cdCAqIEBwYXJhbSBzdHJpbmcgb2xkS2V5IHRoZSBkYXRhLWtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuXHQgKiBAcGFyYW0gc3RyaW5nIG5ld0tleSB0aGUgZGF0YS1rZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuXHQgKiBAcGFyYW0gb2JqZWN0IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuXHQgKi9cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHRcdHZhciBuZXh0Um93ID0gJyc7XG4gICAgICAgIGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKVxuXHQgICAgICAgICAgICAuc2VsZWN0MiggJ2Rlc3Ryb3knIClcblx0ICAgICAgICAgICAgLmVuZCgpXG5cdCAgICAgICAgICAgIC5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcbiAgICAgICAgfVxuXHRcdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0XHQkKCBuZXh0Um93ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblx0fVxuXHQvKipcblx0ICogSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0ICovXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZFxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHRcdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdFx0J21hcHBpbmdfaWQnIDogbWFwcGluZ0lkXG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICc6bGFzdCcgKS5yZW1vdmUoKTtcblx0XHR9LCAxMDAwICk7XG5cdH0pO1xuXG5cdC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZW91dDtcblx0XHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICc6bGFzdCcgKS5yZW1vdmUoKTtcblx0XHR9LCAxMDAwICk7XG5cdH0pO1xuXG5cdC8vIHNob3cgd3NkbCBmaWVsZCBpZiBzb2FwIGlzIGVuYWJsZWRcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHR0b2dnbGVTb2FwRmllbGRzKCk7XG5cdH0pO1xuXG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHMsIGluaXRpYWxpemUgb3IgZW5hYmxlIHRoaW5nczpcblx0ICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG5cdCAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG5cdCAqIEFkZCBhIHNwaW5uZXIgZm9yIEFqYXggcmVxdWVzdHNcblx0ICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2Vcblx0ICogTWFudWFsIHB1c2ggYW5kIHB1bGxcblx0ICogQ2xlYXJpbmcgdGhlIGNhY2hlXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHRcdC8vIGZvciBtYWluIGFkbWluIHNldHRpbmdzXG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblxuXHRcdC8vIHRvZG86IG5lZWQgdG8gZml4IHRoaXMgc28gaXQgZG9lc24ndCBydW4gYWxsIHRoZSBzcGlubmVycyBhdCB0aGUgc2FtZSB0aW1lIHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlcyBvbiB0aGUgc2FtZSBwYWdlXG5cdFx0JCggZG9jdW1lbnQgKS5hamF4U3RhcnQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pLmFqYXhTdG9wKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KTtcblx0XHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG5cdFx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cblx0XHQvLyBmb3IgcHVzaC9wdWxsIG1ldGhvZHMgcnVubmluZyB2aWEgYWpheFxuXHRcdHB1c2hBbmRQdWxsT2JqZWN0cygpO1xuXG5cdFx0Ly8gZm9yIGNsZWFyaW5nIHRoZSBwbHVnaW4gY2FjaGVcblx0XHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblx0fSk7XG59KCBqUXVlcnkgKSApO1xuIl19
