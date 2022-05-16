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
            var fieldLabel = '';

            if ('undefined' !== typeof value.label) {
              fieldLabel = value.label;
            } else {
              fieldLabel = value.name;
            }

            dateMarkup += '<option value="' + value.name + '">' + fieldLabel + '</option>';
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
          var fieldLabel = '';

          if ('undefined' !== typeof value.label) {
            fieldLabel = value.label;
          } else {
            fieldLabel = value.name;
          }

          fields += '<option value="' + value.name + '">' + fieldLabel + '</option>';
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
function addFieldMappingRow(button) {
  var salesforceObject = $('#salesforce_object').val();
  var wordpressObject = $('#wordpress_object').val();
  var newKey = new Date().getUTCMilliseconds();
  var lastRow = $('table.fields tbody tr').last();
  var oldKey = lastRow.attr('data-key');
  oldKey = new RegExp(oldKey, 'g');

  if ('' !== wordpressObject && '' !== salesforceObject) {
    fieldmapFields(oldKey, newKey, lastRow);
    button.parent().find('.missing-object').remove();
    button.text(button.data('add-more'));
  } else {
    button.text(button.data('add-first'));
    button.parent().prepend('<div class="error missing-object"><span>' + button.data('error-missing-object') + '</span></div>');
  }

  return false;
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
    nextRow = lastRow.find('select').end().clone(true).removeClass('fieldmap-template');
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
} // load available options if the WordPress object changes


$(document).on('change', '.column-wordpress_field select', function () {
  disableAlreadyMappedFields('wordpress');
}); // load available options if the Salesforce object changes

$(document).on('change', '.column-salesforce_field select', function () {
  disableAlreadyMappedFields('salesforce');
});
/**
 * Disable fields that are already mapped from being mapped again.
 * @param {string} system whether we want WordPress or Salesforce data
 */

function disableAlreadyMappedFields(system) {
  // load the select statements for Salesforce or WordPress.
  var select = $('.fieldmap-disable-mapped-fields .column-' + system + '_field select');
  var allSelected = []; // add each currently selected value to an array, then make it unique.

  select.each(function (i, fieldChoice) {
    var selectedValue = $(fieldChoice).find('option:selected').val();

    if (null !== selectedValue && '' !== selectedValue) {
      allSelected.push(selectedValue);
    }
  });
  allSelected = allSelected.filter(function (v, i, a) {
    return a.indexOf(v) === i;
  }); // disable the items that are selected in another select, enable them otherwise.

  $('option', select).removeProp('disabled');
  $('option', select).prop('disabled', false);
  $.each(allSelected, function (key, value) {
    $('option[value=' + value + ']:not(:selected)', select).prop('disabled', true);
  }); // reinitialize select2 if it's active.

  if (jQuery.fn.select2) {
    $('.column-' + system + '_field select').select2();
  }
}
/**
 * Handle click event for the Add another field mapping button.
 * It duplicates the fields for a new row in the fieldmap options screen.
 */


$(document).on('click', '#add-field-mapping', function () {
  addFieldMappingRow($(this));
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
 * When the plugin loads:
 * Disable fields that are already selected
 * Select2 on select fields
 */

$(document).ready(function () {
  // disable the option values for fields that have already been mapped.
  disableAlreadyMappedFields('salesforce');
  disableAlreadyMappedFields('wordpress'); // setup the select2 fields if the library is present

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
 * Delete the deprecated value for Salesforce REST API version from the options table.
 */


function deleteRestApiVersionOption() {
  $('#salesforce-delete-rest-api-version').click(function () {
    var data = {
      'action': 'delete_salesforce_api_version'
    };
    var that = $(this);
    $.post(ajaxurl, data, function (response) {
      if (true === response.success && true === response.data.success) {
        that.parent().html(response.data.message).fadeIn();
      } else {
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
  clearSfwpCacheLink(); // delete legacy option value.

  deleteRestApiVersionOption(); // Handle manual push and pull of objects

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJmaWVsZExhYmVsIiwibGFiZWwiLCJuYW1lIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImJ1dHRvbiIsInNhbGVzZm9yY2VPYmplY3QiLCJ3b3JkcHJlc3NPYmplY3QiLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJhdHRyIiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicHJlcGVuZCIsIm5leHRSb3ciLCJlbmQiLCJjbG9uZSIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsImRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzIiwic2VsZWN0IiwiYWxsU2VsZWN0ZWQiLCJmaWVsZENob2ljZSIsInNlbGVjdGVkVmFsdWUiLCJwdXNoIiwiZmlsdGVyIiwidiIsImEiLCJpbmRleE9mIiwicmVtb3ZlUHJvcCIsInByb3AiLCJwdXNoT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJwdWxsT2JqZWN0cyIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJjbGljayIsIm1lc3NhZ2UiLCJkZWxldGVSZXN0QXBpVmVyc2lvbk9wdGlvbiIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVNBLHNCQUFULEdBQWtDO0FBRWpDLE1BQUlDLEtBQUssR0FBSyxZQUFXO0FBQ3hCLFFBQUlDLEtBQUssR0FBRyxDQUFaO0FBQ0EsV0FBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtBQUMvQkMsTUFBQUEsWUFBWSxDQUFHSCxLQUFILENBQVo7QUFDQUEsTUFBQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtBQUNBLEtBSEQ7QUFJQSxHQU5hLEVBQWQ7O0FBUUEsTUFBSyxNQUFNRyxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0Q0MsTUFBdkQsRUFBZ0U7QUFDL0RELElBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDRSxJQUF4QztBQUNBOztBQUVELE1BQUssTUFBTUYsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkND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NEI7QUFDM0IsTUFBSyxJQUFJcEcsQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NDLE1BQXhELEVBQWlFO0FBQ2hFLFFBQUtELENBQUMsQ0FBRSwrQ0FBRixDQUFELENBQXFEcUcsRUFBckQsQ0FBeUQsVUFBekQsQ0FBTCxFQUE2RTtBQUM1RXJHLE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEc0IsSUFBbEQ7QUFDQSxLQUZELE1BRU87QUFDTnRCLE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtERSxJQUFsRDtBQUNBO0FBQ0Q7QUFDRCxDLENBRUQ7OztBQUNBRixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY3ZCLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0NBQTVCLEVBQTZFLFlBQVc7QUFDdkZpRyxFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FGRDtBQUlBcEcsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNDLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBeUUsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBSkQiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG4gKiBUaGlzIGFsc28gZ2VuZXJhdGVzIG90aGVyIHF1ZXJ5IGZpZWxkcyB0aGF0IGFyZSBvYmplY3Qtc3BlY2lmaWMsIGxpa2UgZGF0ZSBmaWVsZHMsIHJlY29yZCB0eXBlcyBhbGxvd2VkLCBldGMuXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0fTtcblx0fSgpICk7XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHR9XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0fVxuXHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHR9XG5cblx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JzogdGhhdC52YWx1ZVxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXHRcdFx0XHR2YXIgZGF0ZU1hcmt1cCA9ICcnO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHR2YXIgZmllbGRMYWJlbCA9ICcnO1xuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbHVlLmxhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubGFiZWw7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubmFtZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgZmllbGRMYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9LCBkZWxheVRpbWUgKTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXNwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBnZXQgdGhlIGF2YWlsYWJsZSBTYWxlc2ZvcmNlIG9iamVjdCBjaG9pY2VzXG5cdHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKTtcbn0gKTtcbiIsIi8qKlxuICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuICogQHBhcmFtIHtzdHJpbmd9IHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuICogQHBhcmFtIHtzdHJpbmd9IG9iamVjdE5hbWUgdGhlIHZhbHVlIGZvciB0aGUgb2JqZWN0IG5hbWUgZnJvbSB0aGUgdGhlIDxzZWxlY3Q+XG4gKi9cbmZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0TmFtZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcydcblx0fTtcblx0dmFyIHNlbGVjdEZpZWxkID0gJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0Jztcblx0dmFyIGZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RGaWVsZCA9ICQoIHNlbGVjdEZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdEZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdEZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZmllbGRzO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0dmFyIGZpZWxkTGFiZWwgPSAnJztcblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUubGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubGFiZWw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgZmllbGRMYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHQkKCBzZWxlY3RGaWVsZCApLmh0bWwoIGZpZWxkcyApO1xuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9XG5cdH0gKTtcbn1cblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgd29yZHByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzIHdoZW4gdGhlIHBhZ2UgbG9hZHNcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS52YWwoKSApO1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdyggYnV0dG9uICkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHR2YXIgb2xkS2V5ID0gbGFzdFJvdy5hdHRyKCAnZGF0YS1rZXknICk7XG5cdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRidXR0b24ucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRidXR0b24udGV4dCggYnV0dG9uLmRhdGEoICdhZGQtbW9yZScgKSApO1xuXHR9IGVsc2Uge1xuXHRcdGJ1dHRvbi50ZXh0KCBidXR0b24uZGF0YSggJ2FkZC1maXJzdCcgKSApO1xuXHRcdGJ1dHRvbi5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+JyArIGJ1dHRvbi5kYXRhKCAnZXJyb3ItbWlzc2luZy1vYmplY3QnICkgKyAnPC9zcGFuPjwvZGl2PicgKTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoICdkZXN0cm95JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fVxuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdH0gKTtcblx0fSApO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBXb3JkUHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JywgZnVuY3Rpb24oKSB7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnd29yZHByZXNzJyApO1xufSApO1xuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgU2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JywgZnVuY3Rpb24oKSB7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnc2FsZXNmb3JjZScgKTtcbn0gKTtcblxuLyoqXG4gKiBEaXNhYmxlIGZpZWxkcyB0aGF0IGFyZSBhbHJlYWR5IG1hcHBlZCBmcm9tIGJlaW5nIG1hcHBlZCBhZ2Fpbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqL1xuZnVuY3Rpb24gZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoIHN5c3RlbSApIHtcblx0Ly8gbG9hZCB0aGUgc2VsZWN0IHN0YXRlbWVudHMgZm9yIFNhbGVzZm9yY2Ugb3IgV29yZFByZXNzLlxuXHR2YXIgc2VsZWN0ID0gJCggJy5maWVsZG1hcC1kaXNhYmxlLW1hcHBlZC1maWVsZHMgLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnICk7XG5cdHZhciBhbGxTZWxlY3RlZCA9IFtdO1xuXHQvLyBhZGQgZWFjaCBjdXJyZW50bHkgc2VsZWN0ZWQgdmFsdWUgdG8gYW4gYXJyYXksIHRoZW4gbWFrZSBpdCB1bmlxdWUuXG5cdHNlbGVjdC5lYWNoKCBmdW5jdGlvbiggaSwgZmllbGRDaG9pY2UgKSB7XG5cdFx0dmFyIHNlbGVjdGVkVmFsdWUgPSAkKCBmaWVsZENob2ljZSApLmZpbmQoICdvcHRpb246c2VsZWN0ZWQnICkudmFsKCk7XG5cdFx0aWYgKCBudWxsICE9PSBzZWxlY3RlZFZhbHVlICYmICcnICE9PSBzZWxlY3RlZFZhbHVlICkge1xuXHRcdFx0YWxsU2VsZWN0ZWQucHVzaCggc2VsZWN0ZWRWYWx1ZSApO1xuXHRcdH1cblx0fSk7XG5cdGFsbFNlbGVjdGVkID0gYWxsU2VsZWN0ZWQuZmlsdGVyKCh2LCBpLCBhKSA9PiBhLmluZGV4T2YodikgPT09IGkpO1xuXHQvLyBkaXNhYmxlIHRoZSBpdGVtcyB0aGF0IGFyZSBzZWxlY3RlZCBpbiBhbm90aGVyIHNlbGVjdCwgZW5hYmxlIHRoZW0gb3RoZXJ3aXNlLlxuXHQkKCAnb3B0aW9uJywgc2VsZWN0ICkucmVtb3ZlUHJvcCggJ2Rpc2FibGVkJyApO1xuXHQkKCAnb3B0aW9uJywgc2VsZWN0ICkucHJvcCggJ2Rpc2FibGVkJywgZmFsc2UgKTtcblx0JC5lYWNoKCBhbGxTZWxlY3RlZCwgZnVuY3Rpb24oIGtleSwgdmFsdWUgKSB7XG5cdFx0JCggJ29wdGlvblt2YWx1ZT0nICsgdmFsdWUgKyAnXTpub3QoOnNlbGVjdGVkKScsIHNlbGVjdCApLnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0fSApO1xuXHQvLyByZWluaXRpYWxpemUgc2VsZWN0MiBpZiBpdCdzIGFjdGl2ZS5cblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHQkKCAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIGNsaWNrIGV2ZW50IGZvciB0aGUgQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZyBidXR0b24uXG4gKiBJdCBkdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKi9cbiAkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnI2FkZC1maWVsZC1tYXBwaW5nJywgZnVuY3Rpb24oKSB7XG5cdGFkZEZpZWxkTWFwcGluZ1JvdyggJCggdGhpcyApICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogRGlzYWJsZSBmaWVsZHMgdGhhdCBhcmUgYWxyZWFkeSBzZWxlY3RlZFxuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGRpc2FibGUgdGhlIG9wdGlvbiB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIG1hcHBlZC5cblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICdzYWxlc2ZvcmNlJyApO1xuXHRkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggJ3dvcmRwcmVzcycgKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0gKTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIG9mIG9iamVjdHMgdG8gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdXNoT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzIGZyb20gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdWxsT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdH07XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIERlbGV0ZSB0aGUgZGVwcmVjYXRlZCB2YWx1ZSBmb3IgU2FsZXNmb3JjZSBSRVNUIEFQSSB2ZXJzaW9uIGZyb20gdGhlIG9wdGlvbnMgdGFibGUuXG4gKi9cbmZ1bmN0aW9uIGRlbGV0ZVJlc3RBcGlWZXJzaW9uT3B0aW9uKCkge1xuXHQkKCAnI3NhbGVzZm9yY2UtZGVsZXRlLXJlc3QtYXBpLXZlcnNpb24nICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdkZWxldGVfc2FsZXNmb3JjZV9hcGlfdmVyc2lvbidcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIHBsdWdpbiBjYWNoZSBidXR0b25cbiAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cblx0Ly8gZGVsZXRlIGxlZ2FjeSBvcHRpb24gdmFsdWUuXG5cdGRlbGV0ZVJlc3RBcGlWZXJzaW9uT3B0aW9uKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0cHVzaE9iamVjdHMoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdWxsT2JqZWN0cygpO1xufSApO1xuIiwiLyoqXG4gKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuICovXG5mdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuIl19
}(jQuery));
