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

$(document).ready(function () {
  // get the available Salesforce object choices
  salesforceObjectFields();
});
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
  var firstField = $(selectField + ' option').first().text();

  if ('' !== $(selectField).val()) {
    return;
  }

  fields += '<option value="">' + firstField + '</option>';

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

$(document).ready(function () {
  // Clear the plugin cache via Ajax request.
  clearSfwpCacheLink(); // Handle manual push and pull of objects

  pushAndPullObjects();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZG9jdW1lbnQiLCJyZWFkeSIsImxvYWRGaWVsZE9wdGlvbnMiLCJzeXN0ZW0iLCJvYmplY3RfbmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsIndvcmRwcmVzc09iamVjdCIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsImF0dHIiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImVuZCIsImNsb25lIiwiaSIsImgiLCJyZXBsYWNlIiwiYXBwZW5kIiwicHJvcCIsInB1c2hBbmRQdWxsT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7OztBQUlBLFNBQVNBLHNCQUFULEdBQWtDO0FBRWpDLE1BQUlDLEtBQUssR0FBSyxZQUFXO0FBQ3hCLFFBQUlDLEtBQUssR0FBRyxDQUFaO0FBQ0EsV0FBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtBQUMvQkMsTUFBQUEsWUFBWSxDQUFHSCxLQUFILENBQVo7QUFDQUEsTUFBQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtBQUNBLEtBSEQ7QUFJQSxHQU5hLEVBQWQ7O0FBUUEsTUFBSyxNQUFNRyxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0Q0MsTUFBdkQsRUFBZ0U7QUFDL0RELElBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDRSxJQUF4QztBQUNBOztBQUVELE1BQUssTUFBTUYsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkNDLE1BQXRELEVBQStEO0FBQzlERCxJQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q0UsSUFBdkM7QUFDQTs7QUFDRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCQyxNQUExQyxFQUFtRDtBQUNsREQsSUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJFLElBQTNCO0FBQ0E7O0FBRURGLEVBQUFBLENBQUMsQ0FBRSxv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WUFBVztBQUMvQjtBQUNBMkQsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBSEQiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG4gKiBUaGlzIGFsc28gZ2VuZXJhdGVzIG90aGVyIHF1ZXJ5IGZpZWxkcyB0aGF0IGFyZSBvYmplY3Qtc3BlY2lmaWMsIGxpa2UgZGF0ZSBmaWVsZHMsIHJlY29yZCB0eXBlcyBhbGxvd2VkLCBldGMuXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0fTtcblx0fSgpICk7XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHR9XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0fVxuXHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHR9XG5cblx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0J2luY2x1ZGUnIDogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHRoYXQudmFsdWVcblx0XHRcdH1cblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJywgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJywgZGF0ZU1hcmt1cCA9ICcnO1xuXG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cblxuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPidcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPidcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblxuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSk7XG5cdFx0fSwgZGVsYXlUaW1lICk7XG5cdH0pO1xufVxuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0Ly8gZ2V0IHRoZSBhdmFpbGFibGUgU2FsZXNmb3JjZSBvYmplY3QgY2hvaWNlc1xuXHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG59KTtcbiIsIi8qKlxuICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuICogQHBhcmFtIHN0cmluZyBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqIEBwYXJhbSBzdHJpbmcgb2JqZWN0X25hbWUgdGhlIHZhbHVlIGZvciB0aGUgb2JqZWN0IG5hbWUgZnJvbSB0aGUgdGhlIDxzZWxlY3Q+XG4gKi9cbmZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0X25hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nIDogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJyxcblx0fTtcblx0dmFyIHNlbGVjdEZpZWxkID0gJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0Jztcblx0dmFyIGZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RGaWVsZCA9ICQoIHNlbGVjdEZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdEZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdEZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3RfbmFtZTtcblx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnc2FsZXNmb3JjZV9vYmplY3QnXSA9IG9iamVjdF9uYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmaWVsZHM7XG5cdH1cblxuXHQkLmFqYXgoe1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdCQoIHNlbGVjdEZpZWxkICkuaHRtbCggZmllbGRzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59KTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkcyB3aGVuIHRoZSBwYWdlIGxvYWRzXG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpICk7XG59KTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdFx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0XHR2YXIgb2xkS2V5ID0gbGFzdFJvdy5hdHRyKCAnZGF0YS1rZXknICk7XG5cdFx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0pO1xufVxuLyoqXG4gKiBDbG9uZXMgdGhlIGZpZWxkc2V0IG1hcmt1cCBwcm92aWRlZCBieSB0aGUgc2VydmVyLXNpZGUgdGVtcGxhdGUgYW5kIGFwcGVuZHMgaXQgYXQgdGhlIGVuZC5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICogQHBhcmFtIHN0cmluZyBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0gc3RyaW5nIG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIG9iamVjdCBsYXN0Um93IHRoZSBsYXN0IHNldCBvZiB0aGUgZmllbGRtYXBcbiAqL1xuZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHR2YXIgbmV4dFJvdyA9ICcnO1xuICAgIGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG4gICAgXHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApXG4gICAgICAgICAgICAuc2VsZWN0MiggJ2Rlc3Ryb3knIClcbiAgICAgICAgICAgIC5lbmQoKVxuICAgICAgICAgICAgLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcbiAgICB9IGVsc2Uge1xuICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcbiAgICB9XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0JCggdGhpcyApLmh0bWwoIGZ1bmN0aW9uKCBpLCBoICkge1xuXHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHR9KTtcblx0fSk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59KTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0pO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0Ly8gRHVwbGljYXRlIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0pO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuICovXG5mdW5jdGlvbiBwdXNoQW5kUHVsbE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnIDogd29yZHByZXNzSWQsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fVxuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnIDogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSk7XG59XG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nIDogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJyA6IG1hcHBpbmdJZFxuXHR9XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn1cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdH1cblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KTtcbn1cblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cdC8vIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdHB1c2hBbmRQdWxsT2JqZWN0cygpO1xufSk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSk7XG5cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59KTtcbiJdfQ==
}(jQuery));
