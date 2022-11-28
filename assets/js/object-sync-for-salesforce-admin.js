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
    beforeSend: function () {
      $('.spinner-' + system).addClass('is-active');
    },
    success: function (response) {
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
    complete: function () {
      $('.spinner-' + system).removeClass('is-active');
    }
  });
}

// load available options if the wordpress object changes
$(document).on('change', 'select#wordpress_object', function () {
  var timeout;
  loadFieldOptions('wordpress', $(this).val());
  clearTimeout(timeout);
  timeout = setTimeout(function () {
    $('table.fields tbody tr').fadeOut();
    $('table.fields tbody tr').not('.fieldmap-template').remove();
  }, 1000);
});

// load available options if the salesforce object changes
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
}

// load available options if the WordPress object changes
$(document).on('change', '.column-wordpress_field select', function () {
  disableAlreadyMappedFields('wordpress');
});
// load available options if the Salesforce object changes
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
  var allSelected = [];
  // add each currently selected value to an array, then make it unique.
  select.each(function (i, fieldChoice) {
    var selectedValue = $(fieldChoice).find('option:selected').val();
    if (null !== selectedValue && '' !== selectedValue) {
      allSelected.push(selectedValue);
    }
  });
  allSelected = allSelected.filter((v, i, a) => a.indexOf(v) === i);
  // disable the items that are selected in another select, enable them otherwise.
  $('option', select).removeProp('disabled');
  $('option', select).prop('disabled', false);
  $.each(allSelected, function (key, value) {
    $('option[value=' + value + ']:not(:selected)', select).prop('disabled', true);
  });
  // reinitialize select2 if it's active.
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
  disableAlreadyMappedFields('wordpress');

  // setup the select2 fields if the library is present
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
      } else {
        $('td.last_sync_status').text('error');
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
  clearSfwpCacheLink();

  // delete legacy option value.
  deleteRestApiVersionOption();

  // Handle manual push and pull of objects
  pushObjects();

  // Handle manual pull of objects
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
}

// Don't show the WSDL file field unless SOAP is enabled
$(document).on('change', '.object-sync-for-salesforce-enable-soap input', function () {
  toggleSoapFields();
});
$(document).ready(function () {
  // Don't show the WSDL file field unless SOAP is enabled
  toggleSoapFields();
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJmaWVsZExhYmVsIiwibGFiZWwiLCJuYW1lIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImJ1dHRvbiIsInNhbGVzZm9yY2VPYmplY3QiLCJ3b3JkcHJlc3NPYmplY3QiLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJhdHRyIiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicHJlcGVuZCIsIm5leHRSb3ciLCJlbmQiLCJjbG9uZSIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsImRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzIiwic2VsZWN0IiwiYWxsU2VsZWN0ZWQiLCJmaWVsZENob2ljZSIsInNlbGVjdGVkVmFsdWUiLCJwdXNoIiwiZmlsdGVyIiwidiIsImEiLCJpbmRleE9mIiwicmVtb3ZlUHJvcCIsInByb3AiLCJwdXNoT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJwdWxsT2JqZWN0cyIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJjbGljayIsIm1lc3NhZ2UiLCJkZWxldGVSZXN0QXBpVmVyc2lvbk9wdGlvbiIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVNBLHNCQUFzQixHQUFHO0VBRWpDLElBQUlDLEtBQUssR0FBSyxZQUFXO0lBQ3hCLElBQUlDLEtBQUssR0FBRyxDQUFDO0lBQ2IsT0FBTyxVQUFVQyxRQUFRLEVBQUVDLEVBQUUsRUFBRztNQUMvQkMsWUFBWSxDQUFHSCxLQUFLLENBQUU7TUFDdEJBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFRLEVBQUVDLEVBQUUsQ0FBRTtJQUNuQyxDQUFDO0VBQ0YsQ0FBQyxFQUFJO0VBRUwsSUFBSyxDQUFDLEtBQUtHLENBQUMsQ0FBRSxzQ0FBc0MsQ0FBRSxDQUFDQyxNQUFNLEVBQUc7SUFDL0RELENBQUMsQ0FBRSxrQ0FBa0MsQ0FBRSxDQUFDRSxJQUFJLEVBQUU7RUFDL0M7RUFFQSxJQUFLLENBQUMsS0FBS0YsQ0FBQyxDQUFFLHFDQUFxQyxDQUFFLENBQUNDLE1BQU0sRUFB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QixFQUFFLENBQUUsUUFBUSxFQUFFLCtDQUErQyxFQUFFLFlBQVc7RUFDdkZpRyxnQkFBZ0IsRUFBRTtBQUNuQixDQUFDLENBQUU7QUFFSHBHLENBQUMsQ0FBRTBCLFFBQVEsQ0FBRSxDQUFDQyxLQUFLLENBQUUsWUFBVztFQUUvQjtFQUNBeUUsZ0JBQWdCLEVBQUU7QUFDbkIsQ0FBQyxDQUFFIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHZW5lcmF0ZXMgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiB0aGUgZHJvcGRvd24gYWN0aXZpdHkgYW5kIEFQSSByZXN1bHRzLlxuICogVGhpcyBhbHNvIGdlbmVyYXRlcyBvdGhlciBxdWVyeSBmaWVsZHMgdGhhdCBhcmUgb2JqZWN0LXNwZWNpZmljLCBsaWtlIGRhdGUgZmllbGRzLCByZWNvcmQgdHlwZXMgYWxsb3dlZCwgZXRjLlxuICovXG5mdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVyID0gMDtcblx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdH07XG5cdH0oKSApO1xuXG5cdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0fVxuXG5cdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdH1cblx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0fVxuXG5cdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0J2luY2x1ZGUnOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdFx0XHQnZmllbGRfdHlwZSc6ICdkYXRldGltZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCc6IHRoYXQudmFsdWVcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnO1xuXHRcdFx0XHR2YXIgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJztcblx0XHRcdFx0dmFyIGRhdGVNYXJrdXAgPSAnJztcblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj5EZWZhdWx0IFJlY29yZCBUeXBlOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmh0bWwoIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICk7XG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0dmFyIGZpZWxkTGFiZWwgPSAnJztcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZS5sYWJlbCApIHtcblx0XHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLmxhYmVsO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLm5hbWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIGZpZWxkTGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+Jztcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSwgZGVsYXlUaW1lICk7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVzcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gZ2V0IHRoZSBhdmFpbGFibGUgU2FsZXNmb3JjZSBvYmplY3QgY2hvaWNlc1xuXHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG59ICk7XG4iLCIvKipcbiAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBvYmplY3ROYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdE5hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnXG5cdH07XG5cdHZhciBzZWxlY3RGaWVsZCA9ICcuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCc7XG5cdHZhciBmaWVsZHMgPSAnJztcblx0dmFyIGZpcnN0RmllbGQgPSAkKCBzZWxlY3RGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXHRpZiAoICcnICE9PSAkKCBzZWxlY3RGaWVsZCApLnZhbCgpICkge1xuXHRcdHJldHVybjtcblx0fVxuXHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RGaWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnc2FsZXNmb3JjZV9vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZpZWxkcztcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdHZhciBmaWVsZExhYmVsID0gJyc7XG5cdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbHVlLmxhYmVsICkge1xuXHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLmxhYmVsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIGZpZWxkTGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0RmllbGQgKS5odG1sKCBmaWVsZHMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkcyB3aGVuIHRoZSBwYWdlIGxvYWRzXG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coIGJ1dHRvbiApIHtcblx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHR2YXIgbmV3S2V5ID0gbmV3IERhdGUoKS5nZXRVVENNaWxsaXNlY29uZHMoKTtcblx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0YnV0dG9uLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0YnV0dG9uLnRleHQoIGJ1dHRvbi5kYXRhKCAnYWRkLW1vcmUnICkgKTtcblx0fSBlbHNlIHtcblx0XHRidXR0b24udGV4dCggYnV0dG9uLmRhdGEoICdhZGQtZmlyc3QnICkgKTtcblx0XHRidXR0b24ucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPicgKyBidXR0b24uZGF0YSggJ2Vycm9yLW1pc3Npbmctb2JqZWN0JyApICsgJzwvc3Bhbj48L2Rpdj4nICk7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENsb25lcyB0aGUgZmllbGRzZXQgbWFya3VwIHByb3ZpZGVkIGJ5IHRoZSBzZXJ2ZXItc2lkZSB0ZW1wbGF0ZSBhbmQgYXBwZW5kcyBpdCBhdCB0aGUgZW5kLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKiBAcGFyYW0ge3N0cmluZ30gb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHtzdHJpbmd9IG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIHtvYmplY3R9IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuICovXG5mdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdHZhciBuZXh0Um93ID0gJyc7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCAnZGVzdHJveScgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH1cblx0JCggbmV4dFJvdyApLmF0dHIoICdkYXRhLWtleScsIG5ld0tleSApO1xuXHQkKCBuZXh0Um93ICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0JCggdGhpcyApLmh0bWwoIGZ1bmN0aW9uKCBpLCBoICkge1xuXHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHR9ICk7XG5cdH0gKTtcblx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG5leHRSb3cgKTtcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdG5leHRSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn1cblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgV29yZFByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcsIGZ1bmN0aW9uKCkge1xuXHRkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggJ3dvcmRwcmVzcycgKTtcbn0gKTtcbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcsIGZ1bmN0aW9uKCkge1xuXHRkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggJ3NhbGVzZm9yY2UnICk7XG59ICk7XG5cbi8qKlxuICogRGlzYWJsZSBmaWVsZHMgdGhhdCBhcmUgYWxyZWFkeSBtYXBwZWQgZnJvbSBiZWluZyBtYXBwZWQgYWdhaW4uXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCBzeXN0ZW0gKSB7XG5cdC8vIGxvYWQgdGhlIHNlbGVjdCBzdGF0ZW1lbnRzIGZvciBTYWxlc2ZvcmNlIG9yIFdvcmRQcmVzcy5cblx0dmFyIHNlbGVjdCA9ICQoICcuZmllbGRtYXAtZGlzYWJsZS1tYXBwZWQtZmllbGRzIC5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0JyApO1xuXHR2YXIgYWxsU2VsZWN0ZWQgPSBbXTtcblx0Ly8gYWRkIGVhY2ggY3VycmVudGx5IHNlbGVjdGVkIHZhbHVlIHRvIGFuIGFycmF5LCB0aGVuIG1ha2UgaXQgdW5pcXVlLlxuXHRzZWxlY3QuZWFjaCggZnVuY3Rpb24oIGksIGZpZWxkQ2hvaWNlICkge1xuXHRcdHZhciBzZWxlY3RlZFZhbHVlID0gJCggZmllbGRDaG9pY2UgKS5maW5kKCAnb3B0aW9uOnNlbGVjdGVkJyApLnZhbCgpO1xuXHRcdGlmICggbnVsbCAhPT0gc2VsZWN0ZWRWYWx1ZSAmJiAnJyAhPT0gc2VsZWN0ZWRWYWx1ZSApIHtcblx0XHRcdGFsbFNlbGVjdGVkLnB1c2goIHNlbGVjdGVkVmFsdWUgKTtcblx0XHR9XG5cdH0pO1xuXHRhbGxTZWxlY3RlZCA9IGFsbFNlbGVjdGVkLmZpbHRlcigodiwgaSwgYSkgPT4gYS5pbmRleE9mKHYpID09PSBpKTtcblx0Ly8gZGlzYWJsZSB0aGUgaXRlbXMgdGhhdCBhcmUgc2VsZWN0ZWQgaW4gYW5vdGhlciBzZWxlY3QsIGVuYWJsZSB0aGVtIG90aGVyd2lzZS5cblx0JCggJ29wdGlvbicsIHNlbGVjdCApLnJlbW92ZVByb3AoICdkaXNhYmxlZCcgKTtcblx0JCggJ29wdGlvbicsIHNlbGVjdCApLnByb3AoICdkaXNhYmxlZCcsIGZhbHNlICk7XG5cdCQuZWFjaCggYWxsU2VsZWN0ZWQsIGZ1bmN0aW9uKCBrZXksIHZhbHVlICkge1xuXHRcdCQoICdvcHRpb25bdmFsdWU9JyArIHZhbHVlICsgJ106bm90KDpzZWxlY3RlZCknLCBzZWxlY3QgKS5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdH0gKTtcblx0Ly8gcmVpbml0aWFsaXplIHNlbGVjdDIgaWYgaXQncyBhY3RpdmUuXG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBjbGljayBldmVudCBmb3IgdGhlIEFkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcgYnV0dG9uLlxuICogSXQgZHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICovXG4gJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJyNhZGQtZmllbGQtbWFwcGluZycsIGZ1bmN0aW9uKCkge1xuXHRhZGRGaWVsZE1hcHBpbmdSb3coICQoIHRoaXMgKSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIERpc2FibGUgZmllbGRzIHRoYXQgYXJlIGFscmVhZHkgc2VsZWN0ZWRcbiAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBkaXNhYmxlIHRoZSBvcHRpb24gdmFsdWVzIGZvciBmaWVsZHMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBtYXBwZWQuXG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnc2FsZXNmb3JjZScgKTtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICd3b3JkcHJlc3MnICk7XG5cblx0Ly8gc2V0dXAgdGhlIHNlbGVjdDIgZmllbGRzIGlmIHRoZSBsaWJyYXJ5IGlzIHByZXNlbnRcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHQkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59ICk7XG4iLCIvKipcbiAqIEhhbmRsZSBtYW51YWwgcHVzaCBvZiBvYmplY3RzIHRvIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVzaE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHQnd29yZHByZXNzX2lkJzogd29yZHByZXNzSWQsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9ICk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0cyBmcm9tIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVsbE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZCxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdFx0fTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuICovXG5mdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHQnbWFwcGluZ19pZCc6IG1hcHBpbmdJZFxuXHR9O1xuXHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ2Vycm9yJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cbiAqL1xuZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdH07XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBEZWxldGUgdGhlIGRlcHJlY2F0ZWQgdmFsdWUgZm9yIFNhbGVzZm9yY2UgUkVTVCBBUEkgdmVyc2lvbiBmcm9tIHRoZSBvcHRpb25zIHRhYmxlLlxuICovXG5mdW5jdGlvbiBkZWxldGVSZXN0QXBpVmVyc2lvbk9wdGlvbigpIHtcblx0JCggJyNzYWxlc2ZvcmNlLWRlbGV0ZS1yZXN0LWFwaS12ZXJzaW9uJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnZGVsZXRlX3NhbGVzZm9yY2VfYXBpX3ZlcnNpb24nXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBwbHVnaW4gY2FjaGUgYnV0dG9uXG4gKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXG5cdC8vIGRlbGV0ZSBsZWdhY3kgb3B0aW9uIHZhbHVlLlxuXHRkZWxldGVSZXN0QXBpVmVyc2lvbk9wdGlvbigpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdHB1c2hPYmplY3RzKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHNcblx0cHVsbE9iamVjdHMoKTtcbn0gKTtcbiIsIi8qKlxuICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiAqL1xuZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0fVxuXHR9XG59XG5cbi8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG5cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcbiJdfQ==
}(jQuery));
