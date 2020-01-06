;(function($) {
"use strict";

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
"use strict";

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
});
"use strict";

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
"use strict";

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
}
"use strict";

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
} // Don't show the WSDL file field unless SOAP is enabled


$(document).on('change', '.object-sync-for-salesforce-enable-soap input', function () {
  toggleSoapFields();
});
"use strict";

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiLCIwNi1kb2N1bWVudC1yZWFkeS5qcyJdLCJuYW1lcyI6WyJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiJCIsImxlbmd0aCIsImhpZGUiLCJvbiIsInRoYXQiLCJkZWxheVRpbWUiLCJkYXRhIiwidmFsdWUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwiZWFjaCIsImluZGV4IiwiaHRtbCIsImZpZWxkcyIsIm5hbWUiLCJsYWJlbCIsInNob3ciLCJqUXVlcnkiLCJmbiIsInNlbGVjdDIiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0X25hbWUiLCJzZWxlY3RGaWVsZCIsImZpcnN0X2ZpZWxkIiwiZmlyc3QiLCJ0ZXh0IiwidmFsIiwiYWpheCIsInR5cGUiLCJ1cmwiLCJiZWZvcmVTZW5kIiwiYWRkQ2xhc3MiLCJzdWNjZXNzIiwia2V5IiwiY29tcGxldGUiLCJyZW1vdmVDbGFzcyIsImRvY3VtZW50IiwidGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsInNhbGVzZm9yY2VPYmplY3QiLCJ3b3JkcHJlc3NPYmplY3QiLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJhdHRyIiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicHJlcGVuZCIsIm5leHRSb3ciLCJlbmQiLCJjbG9uZSIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsInByb3AiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7OztBQUlBLFNBQVNBLHNCQUFULEdBQWtDO0FBRWpDLE1BQUlDLEtBQUssR0FBSyxZQUFXO0FBQ3hCLFFBQUlDLEtBQUssR0FBRyxDQUFaO0FBQ0EsV0FBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtBQUMvQkMsTUFBQUEsWUFBWSxDQUFHSCxLQUFILENBQVo7QUFDQUEsTUFBQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtBQUNBLEtBSEQ7QUFJQSxHQU5hLEVBQWQ7O0FBUUEsTUFBSyxNQUFNRyxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0Q0MsTUFBdkQsRUFBZ0U7QUFDL0RELElBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDRSxJQUF4QztBQUNBOztBQUVELE1BQUssTUFBTUYsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkNDLE1BQXRELEVBQStEO0FBQzlERCxJQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q0UsSUFBdkM7QUFDQTs7QUFDRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCQyxNQUExQyxFQUFtRDtBQUNsREQsSUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJFLElBQTNCO0FBQ0E7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Q2RBOzs7Ozs7OztBQVFBcEYsQ0FBQyxDQUFFMEMsUUFBRixDQUFELENBQWM0QyxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQUYsRUFBQUEsZ0JBQWdCLEdBSGUsQ0FLL0I7O0FBQ0EzRCxFQUFBQSxnQkFBZ0IsQ0FBRSxXQUFGLEVBQWV6QixDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQmdDLEdBQS9CLEVBQWYsQ0FBaEI7QUFDQVAsRUFBQUEsZ0JBQWdCLENBQUUsWUFBRixFQUFnQnpCLENBQUMsQ0FBRSwwQkFBRixDQUFELENBQWdDZ0MsR0FBaEMsRUFBaEIsQ0FBaEIsQ0FQK0IsQ0FTL0I7O0FBQ0EsTUFBS1YsTUFBTSxDQUFDQyxFQUFQLENBQVVDLE9BQWYsRUFBeUI7QUFDeEJ4QixJQUFBQSxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQndCLE9BQS9CO0FBQ0F4QixJQUFBQSxDQUFDLENBQUUsMEJBQUYsQ0FBRCxDQUFnQ3dCLE9BQWhDO0FBQ0F4QixJQUFBQSxDQUFDLENBQUUsdUNBQUYsQ0FBRCxDQUE2Q3dCLE9BQTdDO0FBQ0F4QixJQUFBQSxDQUFDLENBQUUsMkJBQUYsQ0FBRCxDQUFpQ3dCLE9BQWpDO0FBQ0F4QixJQUFBQSxDQUFDLENBQUUsZ0NBQUYsQ0FBRCxDQUFzQ3dCLE9BQXRDO0FBQ0F4QixJQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q3dCLE9BQXZDO0FBQ0EsR0FqQjhCLENBbUIvQjs7O0FBQ0EvQixFQUFBQSxzQkFBc0IsR0FwQlMsQ0FzQi9COztBQUNBc0QsRUFBQUEsa0JBQWtCLEdBdkJhLENBeUIvQjs7QUFDQXdCLEVBQUFBLGtCQUFrQixHQTFCYSxDQTRCL0I7O0FBQ0FXLEVBQUFBLGtCQUFrQjtBQUNsQixDQTlCRCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cbiAqIFRoaXMgYWxzbyBnZW5lcmF0ZXMgb3RoZXIgcXVlcnkgZmllbGRzIHRoYXQgYXJlIG9iamVjdC1zcGVjaWZpYywgbGlrZSBkYXRlIGZpZWxkcywgcmVjb3JkIHR5cGVzIGFsbG93ZWQsIGV0Yy5cbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aW1lciA9IDA7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHR9O1xuXHR9KCkgKTtcblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdH1cblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHR9XG5cdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdH1cblxuXHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHQnaW5jbHVkZScgOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdFx0XHQnZmllbGRfdHlwZScgOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0fVxuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cblx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnLCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnLCBkYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj5EZWZhdWx0IFJlY29yZCBUeXBlOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+J1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+J1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9KTtcblx0XHR9LCBkZWxheVRpbWUgKTtcblx0fSk7XG59XG4iLCIvKipcbiAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcbiAqIEBwYXJhbSBzdHJpbmcgc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0gc3RyaW5nIG9iamVjdF9uYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdF9uYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJyA6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcycsXG5cdH1cblx0dmFyIHNlbGVjdEZpZWxkID0gJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0Jztcblx0dmFyIGZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RfZmllbGQgPSAkKCBzZWxlY3RGaWVsZCArICcgb3B0aW9uJykuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdEZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdF9maWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0X25hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3RfbmFtZTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZmllbGRzO1xuXHR9XG5cblx0JC5hamF4KHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQkKCBzZWxlY3RGaWVsZCApLmh0bWwoIGZpZWxkcyApO1xuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9KTtcbn1cblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgd29yZHByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0pO1xuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KTtcbn1cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSBzdHJpbmcgb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHN0cmluZyBuZXdLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBmb3IgdGhlIG9uZSB3ZSdyZSBhcHBlbmRpbmdcbiAqIEBwYXJhbSBvYmplY3QgbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcbiAgICBpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKVxuICAgICAgICAgICAgLnNlbGVjdDIoICdkZXN0cm95JyApXG4gICAgICAgICAgICAuZW5kKClcbiAgICAgICAgICAgIC5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG4gICAgfSBlbHNlIHtcbiAgICBcdG5leHRSb3cgPSBsYXN0Um93LmNsb25lKCB0cnVlICk7XG4gICAgfVxuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSk7XG5cdH0pO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59KTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gcHVzaEFuZFB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH1cblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0pO1xufVxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJyA6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHQnbWFwcGluZ19pZCcgOiBtYXBwaW5nSWRcblx0fVxuXHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59XG4vKipcbiAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cbiAqL1xuZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSk7XG59XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSk7IiwiLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHMsIGluaXRpYWxpemUgb3IgZW5hYmxlIHRoaW5nczpcbiAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG4gKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuICogQ2xlYXJpbmcgdGhlIGNhY2hlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKSApO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxuXG5cdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xuXG5cdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoQW5kUHVsbE9iamVjdHMoKTtcblxuXHQvLyBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdGNsZWFyU2Z3cENhY2hlTGluaygpO1xufSk7XG4iXX0=
}(jQuery));
