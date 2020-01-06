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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZG9jdW1lbnQiLCJyZWFkeSIsImxvYWRGaWVsZE9wdGlvbnMiLCJzeXN0ZW0iLCJvYmplY3ROYW1lIiwic2VsZWN0RmllbGQiLCJmaXJzdEZpZWxkIiwiZmlyc3QiLCJ0ZXh0IiwidmFsIiwiYWpheCIsInR5cGUiLCJ1cmwiLCJiZWZvcmVTZW5kIiwiYWRkQ2xhc3MiLCJzdWNjZXNzIiwia2V5IiwiY29tcGxldGUiLCJyZW1vdmVDbGFzcyIsInRpbWVvdXQiLCJmYWRlT3V0Iiwibm90IiwicmVtb3ZlIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0Iiwid29yZHByZXNzT2JqZWN0IiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiYXR0ciIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJwcm9wIiwicHVzaE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwicHVsbE9iamVjdHMiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7OztBQUlBLFNBQVNBLHNCQUFULEdBQWtDO0FBRWpDLE1BQUlDLEtBQUssR0FBSyxZQUFXO0FBQ3hCLFFBQUlDLEtBQUssR0FBRyxDQUFaO0FBQ0EsV0FBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtBQUMvQkMsTUFBQUEsWUFBWSxDQUFHSCxLQUFILENBQVo7QUFDQUEsTUFBQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtBQUNBLEtBSEQ7QUFJQSxHQU5hLEVBQWQ7O0FBUUEsTUFBSyxNQUFNRyxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0Q0MsTUFBdkQsRUFBZ0U7QUFDL0RELElBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDRSxJQUF4QztBQUNBOztBQUVELE1BQUssTUFBTUYsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkNDLE1BQXRELEVBQStEO0FBQzlERCxJQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q0UsSUFBdkM7QUFDQTs7QUFDRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCQyxNQUExQyxFQUFtRDtBQUNsREQsSUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJFLElBQTNCO0FBQ0E7O0FBRURGLEVBQUFBLENBQUMs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RixDQUFDLENBQUV5QixRQUFGLENBQUQsQ0FBY3RCLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0NBQTVCLEVBQTZFLFlBQVc7QUFDdkZtRixFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FGRDtBQUlBdEYsQ0FBQyxDQUFFeUIsUUFBRixDQUFELENBQWNDLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBNEQsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBSkQiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG4gKiBUaGlzIGFsc28gZ2VuZXJhdGVzIG90aGVyIHF1ZXJ5IGZpZWxkcyB0aGF0IGFyZSBvYmplY3Qtc3BlY2lmaWMsIGxpa2UgZGF0ZSBmaWVsZHMsIHJlY29yZCB0eXBlcyBhbGxvd2VkLCBldGMuXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0fTtcblx0fSgpICk7XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHR9XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0fVxuXHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHR9XG5cblx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JzogdGhhdC52YWx1ZVxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXHRcdFx0XHR2YXIgZGF0ZU1hcmt1cCA9ICcnO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0sIGRlbGF5VGltZSApO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlc3BvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0RmllbGQgPSAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnO1xuXHR2YXIgZmllbGRzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmaWVsZHM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0RmllbGQgKS5odG1sKCBmaWVsZHMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkcyB3aGVuIHRoZSBwYWdlIGxvYWRzXG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcbiAgICBpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKVxuICAgIFx0XHQuc2VsZWN0MiggJ2Rlc3Ryb3knIClcbiAgICBcdFx0LmVuZCgpXG4gICAgXHRcdC5jbG9uZSggdHJ1ZSApXG4gICAgXHRcdC5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuICAgIH0gZWxzZSB7XG4gICAgXHRuZXh0Um93ID0gbGFzdFJvdy5jbG9uZSggdHJ1ZSApO1xuICAgIH1cblx0JCggbmV4dFJvdyApLmF0dHIoICdkYXRhLWtleScsIG5ld0tleSApO1xuXHQkKCBuZXh0Um93ICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0JCggdGhpcyApLmh0bWwoIGZ1bmN0aW9uKCBpLCBoICkge1xuXHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHR9ICk7XG5cdH0gKTtcblx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG5leHRSb3cgKTtcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdG5leHRSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBBZGQgbmV3IGZpZWxkbWFwIHJvd3NcbiAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEdXBsaWNhdGUgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cblx0Ly8gc2V0dXAgdGhlIHNlbGVjdDIgZmllbGRzIGlmIHRoZSBsaWJyYXJ5IGlzIHByZXNlbnRcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHQkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59ICk7XG4iLCIvKipcbiAqIEhhbmRsZSBtYW51YWwgcHVzaCBvZiBvYmplY3RzIHRvIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVzaE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHQnd29yZHByZXNzX2lkJzogd29yZHByZXNzSWQsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9ICk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0cyBmcm9tIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVsbE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZCxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdFx0fTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuICovXG5mdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHQnbWFwcGluZ19pZCc6IG1hcHBpbmdJZFxuXHR9O1xuXHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cbiAqL1xuZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdH07XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBwbHVnaW4gY2FjaGUgYnV0dG9uXG4gKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdHB1c2hPYmplY3RzKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHNcblx0cHVsbE9iamVjdHMoKTtcbn0gKTtcbiIsIi8qKlxuICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiAqL1xuZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0fVxuXHR9XG59XG5cbi8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG5cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcbiJdfQ==
}(jQuery));
