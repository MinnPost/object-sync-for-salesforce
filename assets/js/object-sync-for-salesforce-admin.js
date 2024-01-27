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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJmaWVsZExhYmVsIiwibGFiZWwiLCJuYW1lIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImJ1dHRvbiIsInNhbGVzZm9yY2VPYmplY3QiLCJ3b3JkcHJlc3NPYmplY3QiLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJhdHRyIiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicHJlcGVuZCIsIm5leHRSb3ciLCJlbmQiLCJjbG9uZSIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsImRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzIiwic2VsZWN0IiwiYWxsU2VsZWN0ZWQiLCJmaWVsZENob2ljZSIsInNlbGVjdGVkVmFsdWUiLCJwdXNoIiwiZmlsdGVyIiwidiIsImEiLCJpbmRleE9mIiwicmVtb3ZlUHJvcCIsInByb3AiLCJwdXNoT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJwdWxsT2JqZWN0cyIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJjbGljayIsIm1lc3NhZ2UiLCJkZWxldGVSZXN0QXBpVmVyc2lvbk9wdGlvbiIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVNBLHNCQUFzQkEsQ0FBQSxFQUFHO0VBRWpDLElBQUlDLEtBQUssR0FBSyxZQUFXO0lBQ3hCLElBQUlDLEtBQUssR0FBRyxDQUFDO0lBQ2IsT0FBTyxVQUFVQyxRQUFRLEVBQUVDLEVBQUUsRUFBRztNQUMvQkMsWUFBWSxDQUFHSCxLQUFNLENBQUM7TUFDdEJBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFRLEVBQUVDLEVBQUcsQ0FBQztJQUNuQyxDQUFDO0VBQ0YsQ0FBQyxDQUFDLENBQUc7RUFFTCxJQUFLLENBQUMsS0FBS0csQ0FBQyxDQUFFLHNDQUF1QyxDQUFDLENBQUNDLE1BQU0sRUFBRztJQUMvREQsQ0FBQyxDQUFFLGtDQUFtQyxDQUFDLENBQUNFLElBQUksQ0FBQyxDQUFDO0VBQy9DO0VBRUEsSUFBSyxDQUFDLEtBQUtGLENBQUMsQ0FBRSxxQ0FBc0MsQ0FB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Q0FHLDBCQUEwQixDQUFDLENBQUM7O0VBRTVCO0VBQ0FmLFdBQVcsQ0FBQyxDQUFDOztFQUViO0VBQ0FNLFdBQVcsQ0FBQyxDQUFDO0FBQ2QsQ0FBRSxDQUFDOzs7QUNwSUg7QUFDQTtBQUNBO0FBQ0EsU0FBU1UsZ0JBQWdCQSxDQUFBLEVBQUc7RUFDM0IsSUFBSyxDQUFDLEdBQUdwRyxDQUFDLENBQUUseUNBQTBDLENBQUMsQ0FBQ0MsTUFBTSxFQUFHO0lBQ2hFLElBQUtELENBQUMsQ0FBRSwrQ0FBZ0QsQ0FBQyxDQUFDcUcsRUFBRSxDQUFFLFVBQVcsQ0FBQyxFQUFHO01BQzVFckcsQ0FBQyxDQUFFLDRDQUE2QyxDQUFDLENBQUNzQixJQUFJLENBQUMsQ0FBQztJQUN6RCxDQUFDLE1BQU07TUFDTnRCLENBQUMsQ0FBRSw0Q0FBNkMsQ0FBQyxDQUFDRSxJQUFJLENBQUMsQ0FBQztJQUN6RDtFQUNEO0FBQ0Q7O0FBRUE7QUFDQUYsQ0FBQyxDQUFFMEIsUUFBUyxDQUFDLENBQUN2QixFQUFFLENBQUUsUUFBUSxFQUFFLCtDQUErQyxFQUFFLFlBQVc7RUFDdkZpRyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ25CLENBQUUsQ0FBQztBQUVIcEcsQ0FBQyxDQUFFMEIsUUFBUyxDQUFDLENBQUNDLEtBQUssQ0FBRSxZQUFXO0VBRS9CO0VBQ0F5RSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ25CLENBQUUsQ0FBQyIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cbiAqIFRoaXMgYWxzbyBnZW5lcmF0ZXMgb3RoZXIgcXVlcnkgZmllbGRzIHRoYXQgYXJlIG9iamVjdC1zcGVjaWZpYywgbGlrZSBkYXRlIGZpZWxkcywgcmVjb3JkIHR5cGVzIGFsbG93ZWQsIGV0Yy5cbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aW1lciA9IDA7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHR9O1xuXHR9KCkgKTtcblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdH1cblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHR9XG5cdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdH1cblxuXHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0J2ZpZWxkX3R5cGUnOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnOiB0aGF0LnZhbHVlXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJztcblx0XHRcdFx0dmFyIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciBkYXRlTWFya3VwID0gJyc7XG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHZhciBmaWVsZExhYmVsID0gJyc7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUubGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5sYWJlbDtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5uYW1lO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyBmaWVsZExhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0sIGRlbGF5VGltZSApO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlc3BvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0RmllbGQgPSAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnO1xuXHR2YXIgZmllbGRzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmaWVsZHM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHR2YXIgZmllbGRMYWJlbCA9ICcnO1xuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZS5sYWJlbCApIHtcblx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5sYWJlbDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLm5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyBmaWVsZExhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdCQoIHNlbGVjdEZpZWxkICkuaHRtbCggZmllbGRzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKSApO1xufSApO1xuIiwiXG4vKipcbiAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICovXG4gZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCBidXR0b24gKSB7XG5cdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdGJ1dHRvbi5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdGJ1dHRvbi50ZXh0KCBidXR0b24uZGF0YSggJ2FkZC1tb3JlJyApICk7XG5cdH0gZWxzZSB7XG5cdFx0YnV0dG9uLnRleHQoIGJ1dHRvbi5kYXRhKCAnYWRkLWZpcnN0JyApICk7XG5cdFx0YnV0dG9uLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj4nICsgYnV0dG9uLmRhdGEoICdlcnJvci1taXNzaW5nLW9iamVjdCcgKSArICc8L3NwYW4+PC9kaXY+JyApO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgdGhlIGZpZWxkc2V0IG1hcmt1cCBwcm92aWRlZCBieSB0aGUgc2VydmVyLXNpZGUgdGVtcGxhdGUgYW5kIGFwcGVuZHMgaXQgYXQgdGhlIGVuZC5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICogQHBhcmFtIHtzdHJpbmd9IG9sZEtleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIG9mIHRoZSBzZXQgdGhhdCBpcyBiZWluZyBjbG9uZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBuZXdLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBmb3IgdGhlIG9uZSB3ZSdyZSBhcHBlbmRpbmdcbiAqIEBwYXJhbSB7b2JqZWN0fSBsYXN0Um93IHRoZSBsYXN0IHNldCBvZiB0aGUgZmllbGRtYXBcbiAqL1xuZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHR2YXIgbmV4dFJvdyA9ICcnO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MiggJ2Rlc3Ryb3knICkuZW5kKCkuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuZW5kKCkuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuXHR9XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIFdvcmRQcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnLCBmdW5jdGlvbigpIHtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICd3b3JkcHJlc3MnICk7XG59ICk7XG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnLCBmdW5jdGlvbigpIHtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICdzYWxlc2ZvcmNlJyApO1xufSApO1xuXG4vKipcbiAqIERpc2FibGUgZmllbGRzIHRoYXQgYXJlIGFscmVhZHkgbWFwcGVkIGZyb20gYmVpbmcgbWFwcGVkIGFnYWluLlxuICogQHBhcmFtIHtzdHJpbmd9IHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuICovXG5mdW5jdGlvbiBkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggc3lzdGVtICkge1xuXHQvLyBsb2FkIHRoZSBzZWxlY3Qgc3RhdGVtZW50cyBmb3IgU2FsZXNmb3JjZSBvciBXb3JkUHJlc3MuXG5cdHZhciBzZWxlY3QgPSAkKCAnLmZpZWxkbWFwLWRpc2FibGUtbWFwcGVkLWZpZWxkcyAuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCcgKTtcblx0dmFyIGFsbFNlbGVjdGVkID0gW107XG5cdC8vIGFkZCBlYWNoIGN1cnJlbnRseSBzZWxlY3RlZCB2YWx1ZSB0byBhbiBhcnJheSwgdGhlbiBtYWtlIGl0IHVuaXF1ZS5cblx0c2VsZWN0LmVhY2goIGZ1bmN0aW9uKCBpLCBmaWVsZENob2ljZSApIHtcblx0XHR2YXIgc2VsZWN0ZWRWYWx1ZSA9ICQoIGZpZWxkQ2hvaWNlICkuZmluZCggJ29wdGlvbjpzZWxlY3RlZCcgKS52YWwoKTtcblx0XHRpZiAoIG51bGwgIT09IHNlbGVjdGVkVmFsdWUgJiYgJycgIT09IHNlbGVjdGVkVmFsdWUgKSB7XG5cdFx0XHRhbGxTZWxlY3RlZC5wdXNoKCBzZWxlY3RlZFZhbHVlICk7XG5cdFx0fVxuXHR9KTtcblx0YWxsU2VsZWN0ZWQgPSBhbGxTZWxlY3RlZC5maWx0ZXIoKHYsIGksIGEpID0+IGEuaW5kZXhPZih2KSA9PT0gaSk7XG5cdC8vIGRpc2FibGUgdGhlIGl0ZW1zIHRoYXQgYXJlIHNlbGVjdGVkIGluIGFub3RoZXIgc2VsZWN0LCBlbmFibGUgdGhlbSBvdGhlcndpc2UuXG5cdCQoICdvcHRpb24nLCBzZWxlY3QgKS5yZW1vdmVQcm9wKCAnZGlzYWJsZWQnICk7XG5cdCQoICdvcHRpb24nLCBzZWxlY3QgKS5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHQkLmVhY2goIGFsbFNlbGVjdGVkLCBmdW5jdGlvbigga2V5LCB2YWx1ZSApIHtcblx0XHQkKCAnb3B0aW9uW3ZhbHVlPScgKyB2YWx1ZSArICddOm5vdCg6c2VsZWN0ZWQpJywgc2VsZWN0ICkucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHR9ICk7XG5cdC8vIHJlaW5pdGlhbGl6ZSBzZWxlY3QyIGlmIGl0J3MgYWN0aXZlLlxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICcuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nIGJ1dHRvbi5cbiAqIEl0IGR1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cbiAqL1xuICQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcjYWRkLWZpZWxkLW1hcHBpbmcnLCBmdW5jdGlvbigpIHtcblx0YWRkRmllbGRNYXBwaW5nUm93KCAkKCB0aGlzICkgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBEaXNhYmxlIGZpZWxkcyB0aGF0IGFyZSBhbHJlYWR5IHNlbGVjdGVkXG4gKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gZGlzYWJsZSB0aGUgb3B0aW9uIHZhbHVlcyBmb3IgZmllbGRzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gbWFwcGVkLlxuXHRkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggJ3NhbGVzZm9yY2UnICk7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnd29yZHByZXNzJyApO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdlcnJvcicgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogRGVsZXRlIHRoZSBkZXByZWNhdGVkIHZhbHVlIGZvciBTYWxlc2ZvcmNlIFJFU1QgQVBJIHZlcnNpb24gZnJvbSB0aGUgb3B0aW9ucyB0YWJsZS5cbiAqL1xuZnVuY3Rpb24gZGVsZXRlUmVzdEFwaVZlcnNpb25PcHRpb24oKSB7XG5cdCQoICcjc2FsZXNmb3JjZS1kZWxldGUtcmVzdC1hcGktdmVyc2lvbicgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2RlbGV0ZV9zYWxlc2ZvcmNlX2FwaV92ZXJzaW9uJ1xuXHRcdH07XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBkZWxldGUgbGVnYWN5IG9wdGlvbiB2YWx1ZS5cblx0ZGVsZXRlUmVzdEFwaVZlcnNpb25PcHRpb24oKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
}(jQuery));
