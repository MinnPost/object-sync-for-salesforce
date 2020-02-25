;(function($) {
"use strict";

/**
 * Generates the WordPress object fields based on the dropdown activity and API results.
 */
function wordpressObjectFields() {
  var delay = function () {
    var timer = 0;
    return function (callback, ms) {
      clearTimeout(timer);
      timer = setTimeout(callback, ms);
    };
  }();

  if (0 === $('.wordpress_object_default_status > *').length) {
    $('.wordpress_object_default_status').hide();
  }

  $('#wordpress_object').on('change', function () {
    var that = this;
    var delayTime = 1000;
    delay(function () {
      var data = {
        'action': 'get_wordpress_object_description',
        'include': ['statuses'],
        'wordpress_object': that.value
      };
      $.post(ajaxurl, data, function (response) {
        var statusesMarkup = '';

        if (0 < $(response.data.statuses).length) {
          statusesMarkup += '<label for="wordpress_object_default_status">Default ' + that.value + ' status:</label>';
          statusesMarkup += '<select name="wordpress_object_default_status" id="wordpress_object_default_status"><option value="">- Select ' + that.value + ' status -</option>';
          $.each(response.data.statuses, function (index, value) {
            statusesMarkup += '<option value="' + index + '">' + value + '</option>';
          });
          statusesMarkup += '</select>';
          statusesMarkup += '<p class="description">If this fieldmap allows new records to be created from Salesforce data, you can set a default status for them. You can override this default status by making a field that maps to the status field in the field settings below, or by using a developer hook to populate it.</p>';
          statusesMarkup += '<p class="description">The only core object that requires a status is the post. If you do not otherwise set a status, newly created posts will be drafts.</p>';
        }

        $('.wordpress_object_default_status').html(statusesMarkup);

        if ('' !== statusesMarkup) {
          $('.wordpress_object_default_status').show();
        } else {
          $('.wordpress_object_default_status').hide();
        }

        if (jQuery.fn.select2) {
          $('select#wordpress_object_default_status').select2();
        }
      });
    }, delayTime);
  });
}
/**
 * When the plugin loads:
 * Manage the display for WordPress record type settings
 */


$(document).ready(function () {
  // Load record type settings for the WordPress object
  wordpressObjectRecordSettings();
});
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
        var recordTypesAllowedMarkup = '';
        var recordTypeDefaultMarkup = '';
        var dateMarkup = '';

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
 * When the plugin loads:
 * Manage the display for Salesforce object fields based on API response
 */


$(document).ready(function () {
  // get the available Salesforce object choices
  salesforceObjectFields();
});
"use strict";

/**
 * Gets the WordPress and Salesforce field results via an Ajax call
 * @param {string} system whether we want WordPress or Salesforce data
 * @param {string} objectName the value for the object name from the the <select>
 */
function loadFieldOptions(system, objectName) {
  var data = {
    'action': 'get_' + system + '_object_fields'
  };
  var selectField = '.column-' + system + '_field select';
  var fields = '';
  var firstField = $(selectField + ' option').first().text();

  if ('' !== $(selectField).val()) {
    return;
  }

  fields += '<option value="">' + firstField + '</option>';

  if ('wordpress' === system) {
    data['wordpress_object'] = objectName;
  } else if ('salesforce' === system) {
    data['salesforce_object'] = objectName;
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
/**
 * When the plugin loads:
 * Clear fields when the targeted WordPress or Salesforce object type changes
 * Manage the display for Salesforce object fields based on API reponse
 */

$(document).ready(function () {
  // if there is already a wp or sf object, make sure it has the right fields when the page loads
  loadFieldOptions('wordpress', $('select#wordpress_object').val());
  loadFieldOptions('salesforce', $('select#salesforce_object').val());
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
 * @param {string} oldKey the data key attribute of the set that is being cloned
 * @param {string} newKey the data key attribute for the one we're appending
 * @param {object} lastRow the last set of the fieldmap
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
/**
 * When the plugin loads:
 * Add new fieldmap rows
 * Select2 on select fields
 */

$(document).ready(function () {
  // Duplicate the fields for a new row in the fieldmap options screen.
  addFieldMappingRow(); // setup the select2 fields if the library is present

  if (jQuery.fn.select2) {
    $('select#wordpress_object').select2();
    $('select#salesforce_object').select2();
    $('select#salesforce_record_type_default').select2();
    $('select#pull_trigger_field').select2();
    $('.column-wordpress_field select').select2();
    $('.column-salesforce_field select').select2();
  }
});
"use strict";

/**
 * Handle manual push of objects to Salesforce
 */
function pushObjects() {
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
}
/**
 * Handle manual pull of objects from Salesforce
 */


function pullObjects() {
  $('.salesforce_user_ajax_message').hide();
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
/**
 * When the plugin loads:
 * Clear plugin cache button
 * Manual push and pull
 */


$(document).ready(function () {
  // Clear the plugin cache via Ajax request.
  clearSfwpCacheLink(); // Handle manual push and pull of objects

  pushObjects(); // Handle manual pull of objects

  pullObjects();
});
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
$(document).ready(function () {
  // Don't show the WSDL file field unless SOAP is enabled
  toggleSoapFields();
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN0YXR1c2VzTWFya3VwIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJodG1sIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJ3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAiLCJyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCIsImRhdGVNYXJrdXAiLCJyZWNvcmRUeXBlSW5mb3MiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsIndvcmRwcmVzc09iamVjdCIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsImF0dHIiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImVuZCIsImNsb25lIiwiaSIsImgiLCJyZXBsYWNlIiwiYXBwZW5kIiwicHJvcCIsInB1c2hPYmplY3RzIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsInB1bGxPYmplY3RzIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7OztBQUdBLFNBQVNBLHFCQUFULEdBQWlDO0FBRWhDLE1BQUlDLEtBQUssR0FBSyxZQUFXO0FBQ3hCLFFBQUlDLEtBQUssR0FBRyxDQUFaO0FBQ0EsV0FBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtBQUMvQkMsTUFBQUEsWUFBWSxDQUFHSCxLQUFILENBQVo7QUFDQUEsTUFBQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtBQUNBLEtBSEQ7QUFJQSxHQU5hLEVBQWQ7O0FBUUEsTUFBSyxNQUFNRyxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0Q0MsTUFBdkQsRUFBZ0U7QUFDL0RELElBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDRSxJQUF4QztBQUNBOztBQUVERixFQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5QkcsRUFBekIsQ0FBNkIsUUFBN0IsRUFBdUMsWUFBVztBQUNqRCxRQUFJQyxJQUFJLEdBQUcsSUFBWDtBQUNBLFFBQUlDLFNBQVMsR0FBRyxJQUFoQjtBQUNB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QUYsQ0FBRCxDQUFjakIsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQ0FBNUIsRUFBNkUsWUFBVztBQUN2RnVGLEVBQUFBLGdCQUFnQjtBQUNoQixDQUZEO0FBSUExRixDQUFDLENBQUVvQixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0FxRSxFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FKRCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGVzIHRoZSBXb3JkUHJlc3Mgb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiB0aGUgZHJvcGRvd24gYWN0aXZpdHkgYW5kIEFQSSByZXN1bHRzLlxuICovXG5mdW5jdGlvbiB3b3JkcHJlc3NPYmplY3RGaWVsZHMoKSB7XG5cblx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0fTtcblx0fSgpICk7XG5cblx0aWYgKCAwID09PSAkKCAnLndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXMgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXMnICkuaGlkZSgpO1xuXHR9XG5cblx0JCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfd29yZHByZXNzX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdCdpbmNsdWRlJyA6IFsgJ3N0YXR1c2VzJyBdLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB0aGF0LnZhbHVlXG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuXHRcdFx0XHR2YXIgc3RhdHVzZXNNYXJrdXAgPSAnJztcblxuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdHN0YXR1c2VzTWFya3VwICs9ICc8bGFiZWwgZm9yPVwid29yZHByZXNzX29iamVjdF9kZWZhdWx0X3N0YXR1c1wiPkRlZmF1bHQgJyArIHRoYXQudmFsdWUgKyAnIHN0YXR1czo8L2xhYmVsPic7XG5cdFx0XHRcdFx0c3RhdHVzZXNNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXNcIiBpZD1cIndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXNcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgJyArIHRoYXQudmFsdWUgKyAnIHN0YXR1cyAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRzdGF0dXNlc01hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRzdGF0dXNlc01hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRzdGF0dXNlc01hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPklmIHRoaXMgZmllbGRtYXAgYWxsb3dzIG5ldyByZWNvcmRzIHRvIGJlIGNyZWF0ZWQgZnJvbSBTYWxlc2ZvcmNlIGRhdGEsIHlvdSBjYW4gc2V0IGEgZGVmYXVsdCBzdGF0dXMgZm9yIHRoZW0uIFlvdSBjYW4gb3ZlcnJpZGUgdGhpcyBkZWZhdWx0IHN0YXR1cyBieSBtYWtpbmcgYSBmaWVsZCB0aGF0IG1hcHMgdG8gdGhlIHN0YXR1cyBmaWVsZCBpbiB0aGUgZmllbGQgc2V0dGluZ3MgYmVsb3csIG9yIGJ5IHVzaW5nIGEgZGV2ZWxvcGVyIGhvb2sgdG8gcG9wdWxhdGUgaXQuPC9wPic7XG5cdFx0XHRcdFx0c3RhdHVzZXNNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGUgb25seSBjb3JlIG9iamVjdCB0aGF0IHJlcXVpcmVzIGEgc3RhdHVzIGlzIHRoZSBwb3N0LiBJZiB5b3UgZG8gbm90IG90aGVyd2lzZSBzZXQgYSBzdGF0dXMsIG5ld2x5IGNyZWF0ZWQgcG9zdHMgd2lsbCBiZSBkcmFmdHMuPC9wPic7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCAnLndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXMnICkuaHRtbCggc3RhdHVzZXNNYXJrdXAgKTtcblxuXHRcdFx0XHRpZiAoICcnICE9PSBzdGF0dXNlc01hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXMnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcud29yZHByZXNzX29iamVjdF9kZWZhdWx0X3N0YXR1cycgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdF9kZWZhdWx0X3N0YXR1cycgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSk7XG5cdFx0fSwgZGVsYXlUaW1lICk7XG5cdH0pO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgV29yZFByZXNzIHJlY29yZCB0eXBlIHNldHRpbmdzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIExvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgZm9yIHRoZSBXb3JkUHJlc3Mgb2JqZWN0XG5cdHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCk7XG59ICk7XG4iLCIvKipcbiAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG4gKiBUaGlzIGFsc28gZ2VuZXJhdGVzIG90aGVyIHF1ZXJ5IGZpZWxkcyB0aGF0IGFyZSBvYmplY3Qtc3BlY2lmaWMsIGxpa2UgZGF0ZSBmaWVsZHMsIHJlY29yZCB0eXBlcyBhbGxvd2VkLCBldGMuXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0fTtcblx0fSgpICk7XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHR9XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0fVxuXHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHR9XG5cblx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JzogdGhhdC52YWx1ZVxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXHRcdFx0XHR2YXIgZGF0ZU1hcmt1cCA9ICcnO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0sIGRlbGF5VGltZSApO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlc3BvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0RmllbGQgPSAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnO1xuXHR2YXIgZmllbGRzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmaWVsZHM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0RmllbGQgKS5odG1sKCBmaWVsZHMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkcyB3aGVuIHRoZSBwYWdlIGxvYWRzXG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoICdkZXN0cm95JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5jbG9uZSggdHJ1ZSApO1xuXHR9XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQWRkIG5ldyBmaWVsZG1hcCByb3dzXG4gKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRHVwbGljYXRlIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
}(jQuery));
