;(function($) {
"use strict";

/**
 * Generate record type choices for the WordPress object
 * This includes possible statuses to choose from, and whether or not there are drafts
 * @param {string} wordpressObject the WordPress object name
 * @param {bool} change is this a change or a pageload
 */
function wordpressObjectRecordSettings(wordpressObject, change) {
  var data = {
    'action': 'get_wordpress_object_description',
    'include': ['statuses'],
    //'field_type': 'datetime',
    'wordpress_object': wordpressObject
  }; // for default status picker

  var statusesContainer = '.sfwp-m-wordpress-statuses';
  var statusesFieldGroup = '.' + statusesContainer + '.' + statusesContainer + '-' + wordpressObject + ' #sfwp-default-status';
  var statusOptions = '';
  var statusesMarkup = ''; // for draft settings

  var draftContainer = '.sfwp-m-wordpress-drafts';
  var draftFieldGroup = '.' + draftContainer + '.' + draftContainer + '-' + wordpressObject + ' .checkbox';
  var draftOption = '';
  var draftMarkup = ''; // add the WordPress object we're looking at to the status container

  $(statusesContainer).attr('class', 'sfwp-m-fieldmap-group-fields select ' + statusesContainer).addClass(statusesContainer + '-' + wordpressObject); // hide the containers first in case they're empty

  $(statusesContainer).addClass('wordpress-statuses-template');
  $(draftContainer).addClass('sfwp-m-drafts-template');

  if (true === change) {
    $(statusesFieldGroup + ' input[type="checkbox"]').prop('checked', false);
    $(draftFieldGroup + ' input[type="checkbox"]').prop('checked', false);
  }

  if (0 < $(statusesFieldGroup + 'input:checked').length) {
    $(statusesContainer).removeClass('wordpress-statuses-template');
  }

  if (0 < $(draftFieldGroup + 'input:checked').length) {
    $(draftContainer).removeClass('sfwp-m-drafts-template');
  }

  $.ajax({
    type: 'POST',
    url: ajaxurl,
    data: data,
    beforeSend: function beforeSend() {
      $('.spinner-wordpress').addClass('is-active');
    },
    success: function success(response) {
      if (0 < $(response.data.statuses).length) {
        $.each(response.data.statuses, function (index, value) {
          allowedTypeOptions += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
        });
      }

      $(allowedTypesFieldGroup).html(allowedTypeOptions); // hold onto this

      array1.filter(function (value) {
        return -1 !== array2.indexOf(value);
      });
    },
    complete: function complete() {
      $('.spinner-wordpress').removeClass('is-active');

      if ('' !== allowedTypeOptions) {
        $(allowedTypesContainer).removeClass('record-types-allowed-template');
      }

      if (firstDateOption !== dateFieldOptions) {
        $(selectDateContainer).removeClass('pull-trigger-field-template');
      }
    }
  });
}
/**
 * When the plugin loads:
 * Manage the display for WordPress record type settings
 */


$(document).ready(function () {
  // Load record type settings for the WordPress object
  wordpressObjectRecordSettings($('select#sfwp-wordpress-object').val(), false);
});
"use strict";

/**
 * Generate record type choices for the Salesforce object
 * This includes record types allowed and date fields.
 * @param {string} salesforceObject the Salesforce object name
 * @param {bool} change is this a change or a pageload
 */
function salesforceObjectRecordSettings(salesforceObject, change) {
  var data = {
    'action': 'get_salesforce_object_description',
    'include': ['fields', 'recordTypeInfos'],
    'field_type': 'datetime',
    'salesforce_object': salesforceObject
  }; // for allowed types and default type

  var allowedTypesContainer = '.sfwp-m-salesforce-record-types-allowed';
  var allowedTypesFieldGroup = '.sfwp-m-salesforce-record-types-allowed.sfwp-m-salesforce-record-types-allowed-' + salesforceObject + ' .checkboxes';
  var allowedTypeOptions = '';
  var recordTypesAllowedMarkup = '';
  var recordTypeDefaultMarkup = ''; // for date fields

  var selectDateContainer = '.sfwp-m-pull-trigger-field';
  var selectDateField = '#sfwp-pull-trigger-field'; //var selectDateField = '.sfwp-m-pull-trigger-field.sfwp-m-pull-trigger-field-' + salesforceObject + ' #sfwp-pull-trigger-field';

  var dateFieldOptions = '';
  var firstDateOption = $(selectDateField + ' option').first().text(); // add the Salesforce object we're looking at to the allowed types container

  $(allowedTypesContainer).attr('class', 'sfwp-m-fieldmap-subgroup sfwp-m-salesforce-record-types-allowed').addClass('sfwp-m-salesforce-record-types-allowed-' + salesforceObject); // hide the containers first in case they're empty

  $(allowedTypesContainer).addClass('record-types-allowed-template');
  $(selectDateContainer).addClass('pull-trigger-field-template');
  defaultRecordTypeSettings();

  if (true === change) {
    $(allowedTypesFieldGroup + ' input[type="checkbox"]').prop('checked', false);
    $(selectDateField).val('');
  }

  if (0 < $(allowedTypesFieldGroup + 'input:checked').length) {
    $(allowedTypesContainer).removeClass('record-types-allowed-template');
  }

  if ('' !== $(selectDateField).val()) {
    $(selectDateContainer).removeClass('pull-trigger-field-template');
  } else {
    dateFieldOptions += '<option value="">' + firstDateOption + '</option>';
  }

  $.ajax({
    type: 'POST',
    url: ajaxurl,
    data: data,
    beforeSend: function beforeSend() {
      $('.spinner-salesforce').addClass('is-active');
    },
    success: function success(response) {
      if (0 < $(response.data.recordTypeInfos).length) {
        $.each(response.data.recordTypeInfos, function (index, value) {
          allowedTypeOptions += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
        });
      }

      $(allowedTypesFieldGroup).html(allowedTypeOptions);

      if (0 < $(response.data.fields).length && '' !== dateFieldOptions) {
        $.each(response.data.fields, function (index, value) {
          dateFieldOptions += '<option value="' + value.name + '">' + value.label + '</option>';
        });
        $(selectDateField).html(dateFieldOptions);
      }
    },
    complete: function complete() {
      $('.spinner-salesforce').removeClass('is-active');

      if ('' !== allowedTypeOptions) {
        $(allowedTypesContainer).removeClass('record-types-allowed-template');
      }

      if (firstDateOption !== dateFieldOptions) {
        $(selectDateContainer).removeClass('pull-trigger-field-template');
      }
    }
  });
}
/**
 * Allow for picking the default record type, when a Salesforce object has record types.
 */


function defaultRecordTypeSettings() {
  var selectContainer = $('.sfwp-m-salesforce-record-type-default');
  var selectDefaultField = '#sfwp-salesforce-record-type-default';
  var recordTypeFields = '';
  var firstRecordTypeField = $(selectDefaultField + ' option').first().text();
  var selected = '';
  recordTypeFields += '<option value="">' + firstRecordTypeField + '</option>';

  if (0 === $('.sfwp-m-salesforce-record-types-allowed input[type="checkbox"]:checked').length) {
    selectContainer.addClass('record-type-default-template');
    return;
  }

  $('.sfwp-m-salesforce-record-types-allowed input[type="checkbox"]:checked').each(function (index) {
    if (1 === $('.sfwp-m-salesforce-record-types-allowed input[type="checkbox"]:checked').length) {
      selected = ' selected';
    }

    recordTypeFields += '<option value="' + $(this).val() + '"' + selected + '>' + $(this).closest('label').text() + '</option>';
  });
  $(selectDefaultField).html(recordTypeFields);
  selectContainer.removeClass('record-type-default-template');
}

; // load record type settings if the Salesforce object changes

$(document).on('change', 'select#sfwp-salesforce-object', function () {
  var salesforceObject = this.value;
  salesforceObjectRecordSettings(salesforceObject, true);
}); // load record type default choices if the allowed record types change

$(document).on('change', '.sfwp-m-salesforce-record-types-allowed input[type="checkbox"]', function () {
  defaultRecordTypeSettings();
});
/**
 * When the plugin loads:
 * Manage the display for Salesforce record type settings
 */

$(document).ready(function () {
  // Load record type settings for the Salesforce object
  salesforceObjectRecordSettings($('select#sfwp-salesforce-object').val(), false);
});
"use strict";

/**
 * Gets the WordPress and Salesforce field results via an Ajax call
 * @param {string} system whether we want WordPress or Salesforce data
 * @param {string} objectName the value for the object name from the <select>
 */
function loadFieldOptions(system, objectName) {
  var data = {
    'action': 'get_' + system + '_object_fields'
  };
  var selectSystemField = '.column-' + system + '_field select';
  var systemFieldChoices = '';
  var firstField = $(selectSystemField + ' option').first().text();

  if ('' !== $(selectSystemField).val()) {
    return;
  }

  systemFieldChoices += '<option value="">' + firstField + '</option>';

  if ('wordpress' === system) {
    data['wordpress_object'] = objectName;
  } else if ('salesforce' === system) {
    data['salesforce_object'] = objectName;
  } else {
    return systemFieldChoices;
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
          systemFieldChoices += '<option value="' + value.key + '">' + value.key + '</option>';
        } else if ('salesforce' === system) {
          systemFieldChoices += '<option value="' + value.name + '">' + value.label + '</option>';
        }
      });
      $(selectSystemField).html(systemFieldChoices);
    },
    complete: function complete() {
      $('.spinner-' + system).removeClass('is-active');
    }
  });
} // load available options if the wordpress object changes


$(document).on('change', 'select#sfwp-wordpress-object', function () {
  var timeout;
  loadFieldOptions('wordpress', $(this).val());
  clearTimeout(timeout);
  timeout = setTimeout(function () {
    $('table.fields tbody tr').fadeOut();
    $('table.fields tbody tr').not('.fieldmap-template').remove();
  }, 1000);
}); // load available options if the salesforce object changes

$(document).on('change', 'select#sfwp-salesforce-object', function () {
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
  loadFieldOptions('wordpress', $('select#sfwp-wordpress-object').val());
  loadFieldOptions('salesforce', $('select#sfwp-salesforce-object').val());
});
"use strict";

/**
 * Duplicates the fields for a new row in the fieldmap options screen.
 * this appears not to work with data() instead of attr()
 */
function addFieldMappingRow() {
  $('#add-field-mapping').click(function () {
    var salesforceObject = $('#sfwp-salesforce-object').val();
    var wordpressObject = $('#sfwp-wordpress-object').val();
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
 * When clicking a field action, don't use the default
 */

$(document).on('click', '.sfwp-a-fieldmap-field-action', function (event) {
  event.preventDefault();
});
/**
 * When clicking edit on a field, toggle its expanded status
 */

$(document).on('click', '.sfwp-a-fieldmap-field-action-edit', function (event) {
  $(this).closest('.sfwp-a-fieldmap-values').toggleClass('sfwp-a-fieldmap-values-expanded');
});
/**
 * When clicking delete on a field, offer to delete it
 */

$(document).on('click', '.sfwp-a-fieldmap-field-action-delete', function (event) {//$( this ).closest( '.sfwp-a-fieldmap-values' ).toggleClass( 'sfwp-a-fieldmap-values-deleted' );
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
    $('select#sfwp-wordpress-object').select2();
    $('select#sfwp-salesforce-object').select2();
    $('select#sfwp-salesforce-record-type-default').select2();
    $('select#sfwp-pull-trigger-field').select2();
    $('.sfwp-fieldmap-form-field select').select2();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInN0YXR1c2VzQ29udGFpbmVyIiwic3RhdHVzZXNGaWVsZEdyb3VwIiwic3RhdHVzT3B0aW9ucyIsInN0YXR1c2VzTWFya3VwIiwiZHJhZnRDb250YWluZXIiLCJkcmFmdEZpZWxkR3JvdXAiLCJkcmFmdE9wdGlvbiIsImRyYWZ0TWFya3VwIiwiJCIsImF0dHIiLCJhZGRDbGFzcyIsInByb3AiLCJsZW5ndGgiLCJyZW1vdmVDbGFzcyIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYWpheHVybCIsImJlZm9yZVNlbmQiLCJzdWNjZXNzIiwicmVzcG9uc2UiLCJzdGF0dXNlcyIsImVhY2giLCJpbmRleCIsInZhbHVlIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwiYWxsb3dlZFR5cGVzRmllbGRHcm91cCIsImh0bWwiLCJhcnJheTEiLCJmaWx0ZXIiLCJhcnJheTIiLCJpbmRleE9mIiwiY29tcGxldGUiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJmaXJzdERhdGVPcHRpb24iLCJkYXRlRmllbGRPcHRpb25zIiwic2VsZWN0RGF0ZUNvbnRhaW5lciIsImRvY3VtZW50IiwicmVhZHkiLCJ2YWwiLCJzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MiLCJzYWxlc2ZvcmNlT2JqZWN0IiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlRmllbGQiLCJmaXJzdCIsInRleHQiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0Iiwib24iLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdFN5c3RlbUZpZWxkIiwic3lzdGVtRmllbGRDaG9pY2VzIiwiZmlyc3RGaWVsZCIsImtleSIsInRpbWVvdXQiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicHJlcGVuZCIsIm5leHRSb3ciLCJqUXVlcnkiLCJmbiIsInNlbGVjdDIiLCJlbmQiLCJjbG9uZSIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJ0b2dnbGVDbGFzcyIsInB1c2hPYmplY3RzIiwiaGlkZSIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwicG9zdCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZGVsYXkiLCJwdWxsT2JqZWN0cyIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJ0aGF0IiwibWVzc2FnZSIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyIsInNob3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztBQU1BLFNBQVNBLDZCQUFULENBQXdDQyxlQUF4QyxFQUF5REMsTUFBekQsRUFBa0U7QUFDakUsTUFBSUMsSUFBSSxHQUFHO0FBQ1YsY0FBVSxrQ0FEQTtBQUVWLGVBQVcsQ0FBRSxVQUFGLENBRkQ7QUFHVjtBQUNBLHdCQUFvQkY7QUFKVixHQUFYLENBRGlFLENBUWpFOztBQUNBLE1BQUlHLGlCQUFpQixHQUFHLDRCQUF4QjtBQUNBLE1BQUlDLGtCQUFrQixHQUFHLE1BQU1ELGlCQUFOLEdBQTBCLEdBQTFCLEdBQWdDQSxpQkFBaEMsR0FBb0QsR0FBcEQsR0FBMERILGVBQTFELEdBQTRFLHVCQUFyRztBQUNBLE1BQUlLLGFBQWEsR0FBRyxFQUFwQjtBQUNBLE1BQUlDLGNBQWMsR0FBRyxFQUFyQixDQVppRSxDQWNqRTs7QUFDQSxNQUFJQyxjQUFjLEdBQUcsMEJBQXJCO0FBQ0EsTUFBSUMsZUFBZSxHQUFHLE1BQU1ELGNBQU4sR0FBdUIsR0FBdkIsR0FBNkJBLGNBQTdCLEdBQThDLEdBQTlDLEdBQW9EUCxlQUFwRCxHQUFzRSxZQUE1RjtBQUNBLE1BQUlTLFdBQVcsR0FBRyxFQUFsQjtBQUNBLE1BQUlDLFdBQVcsR0FBRyxFQUFsQixDQWxCaUUsQ0FvQmpFOztBQUNBQyxFQUFBQSxDQUFDLENBQUVSLGlCQUFGLENBQUQsQ0FBdUJTLElBQXZCLENBQTZCLE9BQTdCLEVBQXNDLHlDQUF5Q1QsaUJBQS9FLEVBQW1HVSxRQUFuRyxDQUE2R1YsaUJBQWlCLEdBQUcsR0FBcEIsR0FBMEJILGVBQXZJLEVBckJpRSxDQXNCakU7O0FBQ0FXLEVBQUFBLENBQUMsQ0FBRVIsaUJBQUYsQ0FBRCxDQUF1QlUsUUFBdkIsQ0FBaUMsNkJBQWpDO0FBQ0FGLEVBQUFBLENBQUMsQ0FBRUosY0FBRixDQUFELENBQW9CTSxRQUFwQixDQUE4Qix3QkFBOUI7O0FBQ0EsTUFBSyxTQUFTWixNQUFkLEVBQXVCO0FBQ3RCVSxJQUFBQSxDQUFDLENBQUVQLGtCQUFrQixHQUFHLHlCQUF2QixDQUFELENBQW9EVSxJQUFwRCxDQUEwRCxTQUExRCxFQUFxRSxLQUFyRTtBQUNBSCxJQUFBQSxDQUFDLENBQUVILGVBQWUsR0FBRyx5QkFBcEIsQ0FBRCxDQUFpRE0sSUFBakQsQ0FBdUQsU0FBdkQsRUFBa0UsS0FBbEU7QUFDQTs7QUFFRCxNQUFLLElBQUlILENBQUMsQ0FBRVAsa0JBQWtCLEdBQUcsZUFBdkIsQ0FBRCxDQUEwQ1csTUFBbkQsRUFBNEQ7QUFDM0RKLElBQUFBLENBQUMsQ0FBRVIsaUJBQUYsQ0FBRCxDQUF1QmEsV0FBdkIsQ0FBb0MsNkJBQXBDO0FBQ0E7O0FBRUQsTUFBSyxJQUFJTCxDQUFDLENBQUVILGVBQWUsR0FBRyxlQUFwQixDQUFELENBQXVDTyxNQUFoRCxFQUF5RDtBQUN4REosSUFBQUEsQ0FBQyxDQUFFSixjQUFGLENBQUQsQ0FBb0JTLFdBQXBCLENBQWlDLHdCQUFqQztBQUNBOztBQUVETCxFQUFBQSxDQUFDLENBQUNNLElBQUYsQ0FBUTtBQUNQQyxJQUFBQSxJQUFJLEVBQUUsTUFEQztBQUVQQyxJQUFBQSxHQUFHLEVBQUVDLE9BRkU7QUFHUGxCLElBQUFBLElBQUksRUFBRUEsSUFIQztBQUlQbUIsSUFBQUEsVUFBVSxFQUFFLHNCQUFXO0FBQ3RCVixNQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQkUsUUFBMUIsQ0FBb0MsV0FBcEM7QUFDQSxLQU5NO0FBT1BTLElBQUFBLE9BQU8sRUFBRSxpQkFBVUMsUUFBVixFQUFxQjtBQUM3QixVQUFLLElBQUlaLENBQUMsQ0FBRVksUUFBUSxDQUFDckIsSUFBVCxDQUFjc0IsUUFBaEIsQ0FBRCxDQUE0QlQsTUFBckMsRUFBOEM7QUFDN0NKLFFBQUFBLENBQUMsQ0FBQ2MsSUFBRixDQUFRRixRQUFRLENBQUNyQixJQUFULENBQWNzQixRQUF0QixFQUFnQyxVQUFVRSxLQUFWLEVBQWlCQyxLQUFqQixFQUF5QjtBQUN4REMsVUFBQUEsa0JBQWtCLElBQUksZ0VBQWdFRixLQUFoRSxHQUF3RSwwQ0FBeEUsR0FBcUhBLEtBQXJILEdBQTZILHlDQUE3SCxHQUF5S0EsS0FBekssR0FBaUwsS0FBakwsR0FBeUxDLEtBQXpMLEdBQWlNLFVBQXZOO0FBQ0EsU0FGRDtBQUdBOztBQUNEaEIsTUFBQUEsQ0FBQyxDQUFFa0Isc0JBQUYsQ0FBRCxDQUE0QkMsSUFBNUIsQ0FBa0NGLGtCQUFsQyxFQU42QixDQVE3Qjs7QUFDQUcsTUFBQUEsTUFBTSxDQUFDQyxNQUFQLENBQWMsVUFBQUwsS0FBSztBQUFBLGVBQUksQ0FBQyxDQUFELEtBQU9NLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlUCxLQUFmLENBQVg7QUFBQSxPQUFuQjtBQUVBLEtBbEJNO0FBbUJQUSxJQUFBQSxRQUFRLEVBQUUsb0JBQVc7QUFDcEJ4QixNQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQkssV0FBMUIsQ0FBdUMsV0FBdkM7O0FBQ0EsVUFBSyxPQUFPWSxrQkFBWixFQUFpQztBQUNoQ2pCLFFBQUFBLENBQUMsQ0FBRXlCLHFCQUFGLENBQUQsQ0FBMkJwQixXQUEzQixDQUF3QywrQkFBeEM7QUFDQTs7QUFDRCxVQUFLcUIsZUFBZSxLQUFLQyxnQkFBekIsRUFBNEM7QUFDM0MzQixRQUFBQSxDQUFDLENBQUU0QixtQkFBRixDQUFELENBQXlCdkIsV0FBekIsQ0FBc0MsNkJBQXRDO0FBQ0E7QUFDRDtBQTNCTSxHQUFSO0FBNkJBO0FBRUQ7Ozs7OztBQUlBTCxDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0ExQyxFQUFBQSw2QkFBNkIsQ0FBRVksQ0FBQyxDQUFFLDhCQUFGLENBQUQsQ0FBb0MrQixHQUFwQyxFQUFGLEVBQTZDLEtBQTdDLENBQTdCO0FBQ0EsQ0FKRDs7O0FDL0VBOzs7Ozs7QUFNQSxTQUFTQyw4QkFBVCxDQUF5Q0MsZ0JBQXpDLEVBQTJEM0MsTUFBM0QsRUFBb0U7QUFDbkUsTUFBSUMsSUFBSSxHQUFHO0FBQ1YsY0FBVSxtQ0FEQTtBQUVWLGVBQVcsQ0FBRSxRQUFGLEVBQVksaUJBQVosQ0FGRDtBQUdWLGtCQUFjLFVBSEo7QUFJVix5QkFBcUIwQztBQUpYLEdBQVgsQ0FEbUUsQ0FRbkU7O0FBQ0EsTUFBSVIscUJBQXFCLEdBQUcseUNBQTVCO0FBQ0EsTUFBSVAsc0JBQXNCLEdBQUcsb0ZBQW9GZSxnQkFBcEYsR0FBdUcsY0FBcEk7QUFDQSxNQUFJaEIsa0JBQWtCLEdBQUcsRUFBekI7QUFDQSxNQUFJaUIsd0JBQXdCLEdBQUcsRUFBL0I7QUFDQSxNQUFJQyx1QkFBdUIsR0FBRyxFQUE5QixDQWJtRSxDQWVuRTs7QUFDQSxNQUFJUCxtQkFBbUIsR0FBRyw0QkFBMUI7QUFDQSxNQUFJUSxlQUFlLEdBQUcsMEJBQXRCLENBakJtRSxDQWtCbkU7O0FBQ0EsTUFBSVQsZ0JBQWdCLEdBQUcsRUFBdkI7QUFDQSxNQUFJRCxlQUFlLEdBQUcxQixDQUFDLENBQUVvQyxlQUFlLEdBQUcsU0FBcEIsQ0FBRCxDQUFpQ0MsS0FBakMsR0FBeUNDLElBQXpDLEVBQXRCLENBcEJtRSxDQXNCbkU7O0FBQ0F0QyxFQUFBQSxDQUFDLENBQUV5QixxQkFBRixDQUFELENBQTJCeEIsSUFBM0IsQ0FBaUMsT0FBakMsRUFBMEMsaUVBQTFDLEVBQThHQyxRQUE5RyxDQUF3SCw0Q0FBNEMrQixnQkFBcEssRUF2Qm1FLENBd0JuRTs7QUFDQWpDLEVBQUFBLENBQUMsQ0FBRXlCLHFCQUFGLENBQUQsQ0FBMkJ2QixRQUEzQixDQUFxQywrQkFBckM7QUFDQUYsRUFBQUEsQ0FBQyxDQUFFNEIsbUJBQUYsQ0FBRCxDQUF5QjFCLFFBQXpCLENBQW1DLDZCQUFuQztBQUNBcUMsRUFBQUEseUJBQXlCOztBQUN6QixNQUFLLFNBQVNqRCxNQUFkLEVBQXVCO0FBQ3RCVSxJQUFBQSxDQUFDLENBQUVrQixzQkFBc0IsR0FBRyx5QkFBM0IsQ0FBRCxDQUF3RGYsSUFBeEQsQ0FBOEQsU0FBOUQsRUFBeUUsS0FBekU7QUFDQUgsSUFBQUEsQ0FBQyxDQUFFb0MsZUFBRixDQUFELENBQXFCTCxHQUFyQixDQUEwQixFQUExQjtBQUNBOztBQUVELE1BQUssSUFBSS9CLENBQUMsQ0FBRWtCLHNCQUFzQixHQUFHLGVBQTNCLENBQUQsQ0FBOENkLE1BQXZELEVBQWdFO0FBQy9ESixJQUFBQSxDQUFDLENBQUV5QixxQkFBRixDQUFELENBQTJCcEIsV0FBM0IsQ0FBd0MsK0JBQXhDO0FBQ0E7O0FBRUQsTUFBSyxPQUFPTCxDQUFDLENBQUVvQyxlQUFGLENBQUQsQ0FBcUJMLEdBQXJCLEVBQVosRUFBeUM7QUFDeEMvQixJQUFBQSxDQUFDLENBQUU0QixtQkFBRixDQUFELENBQXlCdkIsV0FBekIsQ0FBc0MsNkJBQXRDO0FBQ0EsR0FGRCxNQUVPO0FBQ05zQixJQUFBQSxnQkFBZ0IsSUFBSSxzQkFBc0JELGVBQXRCLEdBQXdDLFdBQTVEO0FBQ0E7O0FBRUQxQixFQUFBQSxDQUFDLENBQUNNLElBQUYsQ0FBUTtBQUNQQyxJQUFBQSxJQUFJLEVBQUUsTUFEQztBQUVQQyxJQUFBQSxHQUFHLEVBQUVDLE9BRkU7QUFHUGxCLElBQUFBLElBQUksRUFBRUEsSUFIQztBQUlQbUIsSUFBQUEsVUFBVSxFQUFFLHNCQUFXO0FBQ3RCVixNQUFBQSxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQkUsUUFBM0IsQ0FBcUMsV0FBckM7QUFDQSxLQU5NO0FBT1BTLElBQUFBLE9BQU8sRUFBRSxpQkFBVUMsUUFBVixFQUFxQjtBQUM3QixVQUFLLElBQUlaLENBQUMsQ0FBRVksUUFBUSxDQUFDckIsSUFBVCxDQUFjaUQsZUFBaEIsQ0FBRCxDQUFtQ3BDLE1BQTVDLEVBQXFEO0FBQ3BESixRQUFBQSxDQUFDLENBQUNjLElBQUYsQ0FBUUYsUUFBUSxDQUFDckIsSUFBVCxDQUFjaUQsZUFBdEIsRUFBdUMsVUFBVXpCLEtBQVYsRUFBaUJDLEtBQWpCLEVBQXlCO0FBQy9EQyxVQUFBQSxrQkFBa0IsSUFBSSxnRUFBZ0VGLEtBQWhFLEdBQXdFLDBDQUF4RSxHQUFxSEEsS0FBckgsR0FBNkgseUNBQTdILEdBQXlLQSxLQUF6SyxHQUFpTCxLQUFqTCxHQUF5TEMsS0FBekwsR0FBaU0sVUFBdk47QUFDQSxTQUZEO0FBR0E7O0FBQ0RoQixNQUFBQSxDQUFDLENBQUVrQixzQkFBRixDQUFELENBQTRCQyxJQUE1QixDQUFrQ0Ysa0JBQWxDOztBQUNBLFVBQUssSUFBSWpCLENBQUMsQ0FBRVksUUFBUSxDQUFDckIsSUFBVCxDQUFja0QsTUFBaEIsQ0FBRCxDQUEwQnJDLE1BQTlCLElBQXdDLE9BQU91QixnQkFBcEQsRUFBdUU7QUFDdEUzQixRQUFBQSxDQUFDLENBQUNjLElBQUYsQ0FBUUYsUUFBUSxDQUFDckIsSUFBVCxDQUFja0QsTUFBdEIsRUFBOEIsVUFBVTFCLEtBQVYsRUFBaUJDLEtBQWpCLEVBQXlCO0FBQ3REVyxVQUFBQSxnQkFBZ0IsSUFBSSxvQkFBb0JYLEtBQUssQ0FBQzBCLElBQTFCLEdBQWlDLElBQWpDLEdBQXdDMUIsS0FBSyxDQUFDMkIsS0FBOUMsR0FBc0QsV0FBMUU7QUFDQSxTQUZEO0FBR0EzQyxRQUFBQSxDQUFDLENBQUVvQyxlQUFGLENBQUQsQ0FBcUJqQixJQUFyQixDQUEyQlEsZ0JBQTNCO0FBQ0E7QUFDRCxLQXBCTTtBQXFCUEgsSUFBQUEsUUFBUSxFQUFFLG9CQUFXO0FBQ3BCeEIsTUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJLLFdBQTNCLENBQXdDLFdBQXhDOztBQUNBLFVBQUssT0FBT1ksa0JBQVosRUFBaUM7QUFDaENqQixRQUFBQSxDQUFDLENBQUV5QixxQkFBRixDQUFELENBQTJCcEIsV0FBM0IsQ0FBd0MsK0JBQXhDO0FBQ0E7O0FBQ0QsVUFBS3FCLGVBQWUsS0FBS0MsZ0JBQXpCLEVBQTRDO0FBQzNDM0IsUUFBQUEsQ0FBQyxDQUFFNEIsbUJBQUYsQ0FBRCxDQUF5QnZCLFdBQXpCLENBQXNDLDZCQUF0QztBQUNBO0FBQ0Q7QUE3Qk0sR0FBUjtBQStCQTtBQUVEOzs7OztBQUdBLFNBQVNrQyx5QkFBVCxHQUFxQztBQUNwQyxNQUFJSyxlQUFlLEdBQUc1QyxDQUFDLENBQUUsd0NBQUYsQ0FBdkI7QUFDQSxNQUFJNkMsa0JBQWtCLEdBQUcsc0NBQXpCO0FBQ0EsTUFBSUMsZ0JBQWdCLEdBQUcsRUFBdkI7QUFDQSxNQUFJQyxvQkFBb0IsR0FBRy9DLENBQUMsQ0FBRTZDLGtCQUFrQixHQUFHLFNBQXZCLENBQUQsQ0FBb0NSLEtBQXBDLEdBQTRDQyxJQUE1QyxFQUEzQjtBQUNBLE1BQUlVLFFBQVEsR0FBRyxFQUFmO0FBQ0FGLEVBQUFBLGdCQUFnQixJQUFJLHNCQUFzQkMsb0JBQXRCLEdBQTZDLFdBQWpFOztBQUNBLE1BQUssTUFBTS9DLENBQUMsQ0FBRSx3RUFBRixDQUFELENBQThFSSxNQUF6RixFQUFrRztBQUNqR3dDLElBQUFBLGVBQWUsQ0FBQzFDLFFBQWhCLENBQTBCLDhCQUExQjtBQUNBO0FBQ0E7O0FBQ0RGLEVBQUFBLENBQUMsQ0FBRSx3RUFBRixDQUFELENBQThFYyxJQUE5RSxDQUFvRixVQUFVQyxLQUFWLEVBQWtCO0FBQ3JHLFFBQUssTUFBTWYsQ0FBQyxDQUFFLHdFQUFGLENBQUQsQ0FBOEVJLE1BQXpGLEVBQWtHO0FBQ2pHNEMsTUFBQUEsUUFBUSxHQUFHLFdBQVg7QUFDQTs7QUFDREYsSUFBQUEsZ0JBQWdCLElBQUksb0JBQW9COUMsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVK0IsR0FBVixFQUFwQixHQUFzQyxHQUF0QyxHQUE0Q2lCLFFBQTVDLEdBQXNELEdBQXRELEdBQTREaEQsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVaUQsT0FBVixDQUFtQixPQUFuQixFQUE2QlgsSUFBN0IsRUFBNUQsR0FBa0csV0FBdEg7QUFDQSxHQUxEO0FBTUF0QyxFQUFBQSxDQUFDLENBQUU2QyxrQkFBRixDQUFELENBQXdCMUIsSUFBeEIsQ0FBOEIyQixnQkFBOUI7QUFDQUYsRUFBQUEsZUFBZSxDQUFDdkMsV0FBaEIsQ0FBNkIsOEJBQTdCO0FBQ0E7O0FBQUEsQyxDQUVEOztBQUNBTCxDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY3FCLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0JBQTVCLEVBQTZELFlBQVc7QUFDdkUsTUFBSWpCLGdCQUFnQixHQUFHLEtBQUtqQixLQUE1QjtBQUNBZ0IsRUFBQUEsOEJBQThCLENBQUVDLGdCQUFGLEVBQW9CLElBQXBCLENBQTlCO0FBQ0EsQ0FIRCxFLENBS0E7O0FBQ0FqQyxDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY3FCLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsZ0VBQTVCLEVBQThGLFlBQVc7QUFDeEdYLEVBQUFBLHlCQUF5QjtBQUN6QixDQUZEO0FBSUE7Ozs7O0FBSUF2QyxDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0FFLEVBQUFBLDhCQUE4QixDQUFFaEMsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUMrQixHQUFyQyxFQUFGLEVBQThDLEtBQTlDLENBQTlCO0FBQ0EsQ0FKRDs7O0FDekhBOzs7OztBQUtBLFNBQVNvQixnQkFBVCxDQUEyQkMsTUFBM0IsRUFBbUNDLFVBQW5DLEVBQWdEO0FBQy9DLE1BQUk5RCxJQUFJLEdBQUc7QUFDVixjQUFVLFNBQVM2RCxNQUFULEdBQWtCO0FBRGxCLEdBQVg7QUFHQSxNQUFJRSxpQkFBaUIsR0FBRyxhQUFhRixNQUFiLEdBQXNCLGVBQTlDO0FBQ0EsTUFBSUcsa0JBQWtCLEdBQUcsRUFBekI7QUFDQSxNQUFJQyxVQUFVLEdBQUd4RCxDQUFDLENBQUVzRCxpQkFBaUIsR0FBRyxTQUF0QixDQUFELENBQW1DakIsS0FBbkMsR0FBMkNDLElBQTNDLEVBQWpCOztBQUNBLE1BQUssT0FBT3RDLENBQUMsQ0FBRXNELGlCQUFGLENBQUQsQ0FBdUJ2QixHQUF2QixFQUFaLEVBQTJDO0FBQzFDO0FBQ0E7O0FBQ0R3QixFQUFBQSxrQkFBa0IsSUFBSSxzQkFBc0JDLFVBQXRCLEdBQW1DLFdBQXpEOztBQUNBLE1BQUssZ0JBQWdCSixNQUFyQixFQUE4QjtBQUM3QjdELElBQUFBLElBQUksQ0FBQyxrQkFBRCxDQUFKLEdBQTJCOEQsVUFBM0I7QUFDQSxHQUZELE1BRU8sSUFBSyxpQkFBaUJELE1BQXRCLEVBQStCO0FBQ3JDN0QsSUFBQUEsSUFBSSxDQUFDLG1CQUFELENBQUosR0FBNEI4RCxVQUE1QjtBQUNBLEdBRk0sTUFFQTtBQUNOLFdBQU9FLGtCQUFQO0FBQ0E7O0FBRUR2RCxFQUFBQSxDQUFDLENBQUNNLElBQUYsQ0FBUTtBQUNQQyxJQUFBQSxJQUFJLEVBQUUsTUFEQztBQUVQQyxJQUFBQSxHQUFHLEVBQUVDLE9BRkU7QUFHUGxCLElBQUFBLElBQUksRUFBRUEsSUFIQztBQUlQbUIsSUFBQUEsVUFBVSxFQUFFLHNCQUFXO0FBQ3RCVixNQUFBQSxDQUFDLENBQUUsY0FBY29ELE1BQWhCLENBQUQsQ0FBMEJsRCxRQUExQixDQUFvQyxXQUFwQztBQUNBLEtBTk07QUFPUFMsSUFBQUEsT0FBTyxFQUFFLGlCQUFVQyxRQUFWLEVBQXFCO0FBQzdCWixNQUFBQSxDQUFDLENBQUNjLElBQUYsQ0FBUUYsUUFBUSxDQUFDckIsSUFBVCxDQUFja0QsTUFBdEIsRUFBOEIsVUFBVTFCLEtBQVYsRUFBaUJDLEtBQWpCLEVBQXlCO0FBQ3RELFlBQUssZ0JBQWdCb0MsTUFBckIsRUFBOEI7QUFDN0JHLFVBQUFBLGtCQUFrQixJQUFJLG9CQUFvQnZDLEtBQUssQ0FBQ3lDLEdBQTFCLEdBQWdDLElBQWhDLEdBQXVDekMsS0FBSyxDQUFDeUMsR0FBN0MsR0FBbUQsV0FBekU7QUFDQSxTQUZELE1BRU8sSUFBSyxpQkFBaUJMLE1BQXRCLEVBQStCO0FBQ3JDRyxVQUFBQSxrQkFBa0IsSUFBSSxvQkFBb0J2QyxLQUFLLENBQUMwQixJQUExQixHQUFpQyxJQUFqQyxHQUF3QzFCLEtBQUssQ0FBQzJCLEtBQTlDLEdBQXNELFdBQTVFO0FBQ0E7QUFDRCxPQU5EO0FBT0EzQyxNQUFBQSxDQUFDLENBQUVzRCxpQkFBRixDQUFELENBQXVCbkMsSUFBdkIsQ0FBNkJvQyxrQkFBN0I7QUFDQSxLQWhCTTtBQWlCUC9CLElBQUFBLFFBQVEsRUFBRSxvQkFBVztBQUNwQnhCLE1BQUFBLENBQUMsQ0FBRSxjQUFjb0QsTUFBaEIsQ0FBRCxDQUEwQi9DLFdBQTFCLENBQXVDLFdBQXZDO0FBQ0E7QUFuQk0sR0FBUjtBQXFCQSxDLENBRUQ7OztBQUNBTCxDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY3FCLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsOEJBQTVCLEVBQTRELFlBQVc7QUFDdEUsTUFBSVEsT0FBSjtBQUNBUCxFQUFBQSxnQkFBZ0IsQ0FBRSxXQUFGLEVBQWVuRCxDQUFDLENBQUUsSUFBRixDQUFELENBQVUrQixHQUFWLEVBQWYsQ0FBaEI7QUFDQTRCLEVBQUFBLFlBQVksQ0FBRUQsT0FBRixDQUFaO0FBQ0FBLEVBQUFBLE9BQU8sR0FBR0UsVUFBVSxDQUFFLFlBQVc7QUFDaEM1RCxJQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjZELE9BQTdCO0FBQ0E3RCxJQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjhELEdBQTdCLENBQWtDLG9CQUFsQyxFQUF5REMsTUFBekQ7QUFDQSxHQUhtQixFQUdqQixJQUhpQixDQUFwQjtBQUlBLENBUkQsRSxDQVVBOztBQUNBL0QsQ0FBQyxDQUFFNkIsUUFBRixDQUFELENBQWNxQixFQUFkLENBQWtCLFFBQWxCLEVBQTRCLCtCQUE1QixFQUE2RCxZQUFXO0FBQ3ZFLE1BQUlRLE9BQUo7QUFDQVAsRUFBQUEsZ0JBQWdCLENBQUUsWUFBRixFQUFnQm5ELENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVStCLEdBQVYsRUFBaEIsQ0FBaEI7QUFDQTRCLEVBQUFBLFlBQVksQ0FBRUQsT0FBRixDQUFaO0FBQ0FBLEVBQUFBLE9BQU8sR0FBR0UsVUFBVSxDQUFFLFlBQVc7QUFDaEM1RCxJQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjZELE9BQTdCO0FBQ0E3RCxJQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjhELEdBQTdCLENBQWtDLG9CQUFsQyxFQUF5REMsTUFBekQ7QUFDQSxHQUhtQixFQUdqQixJQUhpQixDQUFwQjtBQUlBLENBUkQ7QUFVQTs7Ozs7O0FBS0EvRCxDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0FxQixFQUFBQSxnQkFBZ0IsQ0FBRSxXQUFGLEVBQWVuRCxDQUFDLENBQUUsOEJBQUYsQ0FBRCxDQUFvQytCLEdBQXBDLEVBQWYsQ0FBaEI7QUFDQW9CLEVBQUFBLGdCQUFnQixDQUFFLFlBQUYsRUFBZ0JuRCxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQytCLEdBQXJDLEVBQWhCLENBQWhCO0FBQ0EsQ0FMRDs7O0FDekVBOzs7O0FBSUMsU0FBU2lDLGtCQUFULEdBQThCO0FBQzlCaEUsRUFBQUEsQ0FBQyxDQUFFLG9CQUFGLENBQUQsQ0FBMEJpRSxLQUExQixDQUFpQyxZQUFXO0FBQzNDLFFBQUloQyxnQkFBZ0IsR0FBR2pDLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCK0IsR0FBL0IsRUFBdkI7QUFDQSxRQUFJMUMsZUFBZSxHQUFHVyxDQUFDLENBQUUsd0JBQUYsQ0FBRCxDQUE4QitCLEdBQTlCLEVBQXRCO0FBQ0EsUUFBSW1DLE1BQU0sR0FBRyxJQUFJQyxJQUFKLEdBQVdDLGtCQUFYLEVBQWI7QUFDQSxRQUFJQyxPQUFPLEdBQUdyRSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QnNFLElBQTdCLEVBQWQ7QUFDQSxRQUFJQyxNQUFNLEdBQUdGLE9BQU8sQ0FBQ3BFLElBQVIsQ0FBYyxVQUFkLENBQWI7QUFDQXNFLElBQUFBLE1BQU0sR0FBRyxJQUFJQyxNQUFKLENBQVlELE1BQVosRUFBb0IsR0FBcEIsQ0FBVDtBQUNBdkUsSUFBQUEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVc0MsSUFBVixDQUFnQiwyQkFBaEI7O0FBQ0EsUUFBSyxPQUFPakQsZUFBUCxJQUEwQixPQUFPNEMsZ0JBQXRDLEVBQXlEO0FBQ3hEd0MsTUFBQUEsY0FBYyxDQUFFRixNQUFGLEVBQVVMLE1BQVYsRUFBa0JHLE9BQWxCLENBQWQ7QUFDQXJFLE1BQUFBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVTBFLE1BQVYsR0FBbUJDLElBQW5CLENBQXlCLGlCQUF6QixFQUE2Q1osTUFBN0M7QUFDQSxLQUhELE1BR087QUFDTi9ELE1BQUFBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVTBFLE1BQVYsR0FBbUJFLE9BQW5CLENBQTRCLHdJQUE1QjtBQUNBOztBQUNELFdBQU8sS0FBUDtBQUNBLEdBZkQ7QUFnQkE7QUFFRDs7Ozs7Ozs7O0FBT0EsU0FBU0gsY0FBVCxDQUF5QkYsTUFBekIsRUFBaUNMLE1BQWpDLEVBQXlDRyxPQUF6QyxFQUFtRDtBQUNsRCxNQUFJUSxPQUFPLEdBQUcsRUFBZDs7QUFDQSxNQUFLQyxNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4QkgsSUFBQUEsT0FBTyxHQUFHUixPQUFPLENBQUNNLElBQVIsQ0FBYyxRQUFkLEVBQXlCSyxPQUF6QixDQUFrQyxTQUFsQyxFQUE4Q0MsR0FBOUMsR0FBb0RDLEtBQXBELENBQTJELElBQTNELEVBQWtFN0UsV0FBbEUsQ0FBK0UsbUJBQS9FLENBQVY7QUFDQSxHQUZELE1BRU87QUFDTndFLElBQUFBLE9BQU8sR0FBR1IsT0FBTyxDQUFDYSxLQUFSLENBQWUsSUFBZixDQUFWO0FBQ0E7O0FBQ0RsRixFQUFBQSxDQUFDLENBQUU2RSxPQUFGLENBQUQsQ0FBYTVFLElBQWIsQ0FBbUIsVUFBbkIsRUFBK0JpRSxNQUEvQjtBQUNBbEUsRUFBQUEsQ0FBQyxDQUFFNkUsT0FBRixDQUFELENBQWEvRCxJQUFiLENBQW1CLFlBQVc7QUFDN0JkLElBQUFBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVW1CLElBQVYsQ0FBZ0IsVUFBVWdFLENBQVYsRUFBYUMsQ0FBYixFQUFpQjtBQUNoQyxhQUFPQSxDQUFDLENBQUNDLE9BQUYsQ0FBV2QsTUFBWCxFQUFtQkwsTUFBbkIsQ0FBUDtBQUNBLEtBRkQ7QUFHQSxHQUpEO0FBS0FsRSxFQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQnNGLE1BQTFCLENBQWtDVCxPQUFsQzs7QUFDQSxNQUFLQyxNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4QlgsSUFBQUEsT0FBTyxDQUFDTSxJQUFSLENBQWMsUUFBZCxFQUF5QkssT0FBekI7QUFDQUgsSUFBQUEsT0FBTyxDQUFDRixJQUFSLENBQWMsUUFBZCxFQUF5QkssT0FBekI7QUFDQTtBQUNEO0FBRUQ7Ozs7O0FBR0FoRixDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY3FCLEVBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsMkJBQTNCLEVBQXdELFlBQVc7QUFDbEVsRCxFQUFBQSxDQUFDLENBQUUsMkJBQUYsQ0FBRCxDQUFpQzhELEdBQWpDLENBQXNDLElBQXRDLEVBQTZDM0QsSUFBN0MsQ0FBbUQsU0FBbkQsRUFBOEQsS0FBOUQ7QUFDQSxDQUZEO0FBSUE7Ozs7QUFHQUgsQ0FBQyxDQUFFNkIsUUFBRixDQUFELENBQWNxQixFQUFkLENBQWtCLE9BQWxCLEVBQTJCLHNCQUEzQixFQUFtRCxZQUFXO0FBQzdEbEQsRUFBQUEsQ0FBQyxDQUFFLHNCQUFGLENBQUQsQ0FBNEI4RCxHQUE1QixDQUFpQyxJQUFqQyxFQUF3QzNELElBQXhDLENBQThDLFNBQTlDLEVBQXlELEtBQXpEO0FBQ0EsQ0FGRDtBQUlBOzs7O0FBR0FILENBQUMsQ0FBRTZCLFFBQUYsQ0FBRCxDQUFjcUIsRUFBZCxDQUFrQixPQUFsQixFQUEyQiwrQkFBM0IsRUFBNEQsVUFBVXFDLEtBQVYsRUFBa0I7QUFDN0VBLEVBQUFBLEtBQUssQ0FBQ0MsY0FBTjtBQUNBLENBRkQ7QUFJQTs7OztBQUdBeEYsQ0FBQyxDQUFFNkIsUUFBRixDQUFELENBQWNxQixFQUFkLENBQWtCLE9BQWxCLEVBQTJCLG9DQUEzQixFQUFpRSxVQUFVcUMsS0FBVixFQUFrQjtBQUNsRnZGLEVBQUFBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVWlELE9BQVYsQ0FBbUIseUJBQW5CLEVBQStDd0MsV0FBL0MsQ0FBNEQsaUNBQTVEO0FBQ0EsQ0FGRDtBQUlBOzs7O0FBR0F6RixDQUFDLENBQUU2QixRQUFGLENBQUQsQ0FBY3FCLEVBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsc0NBQTNCLEVBQW1FLFVBQVVxQyxLQUFWLEVBQWtCLENBQ3BGO0FBQ0EsQ0FGRDtBQUlBOzs7Ozs7QUFLQXZGLENBQUMsQ0FBRTZCLFFBQUYsQ0FBRCxDQUFjQyxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQWtDLEVBQUFBLGtCQUFrQixHQUhhLENBSy9COztBQUNBLE1BQUtjLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVQyxPQUFmLEVBQXlCO0FBQ3hCaEYsSUFBQUEsQ0FBQyxDQUFFLDhCQUFGLENBQUQsQ0FBb0NnRixPQUFwQztBQUNBaEYsSUFBQUEsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUNnRixPQUFyQztBQUNBaEYsSUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0RnRixPQUFsRDtBQUNBaEYsSUFBQUEsQ0FBQyxDQUFFLGdDQUFGLENBQUQsQ0FBc0NnRixPQUF0QztBQUNBaEYsSUFBQUEsQ0FBQyxDQUFFLGtDQUFGLENBQUQsQ0FBd0NnRixPQUF4QztBQUNBO0FBQ0QsQ0FiRDs7O0FDM0ZBOzs7QUFHQSxTQUFTVSxXQUFULEdBQXVCO0FBQ3RCMUYsRUFBQUEsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUMyRixJQUFyQzs7QUFDQSxNQUFLLElBQUkzRixDQUFDLENBQUUsd0JBQUYsQ0FBRCxDQUE4QkksTUFBdkMsRUFBZ0Q7QUFDL0NKLElBQUFBLENBQUMsQ0FBRSw0QkFBRixDQUFELENBQWtDa0QsRUFBbEMsQ0FBc0MsT0FBdEMsRUFBK0MsWUFBVztBQUN6RCxVQUFJN0QsZUFBZSxHQUFHVyxDQUFDLENBQUUsd0JBQUYsQ0FBRCxDQUE4QitCLEdBQTlCLEVBQXRCO0FBQ0EsVUFBSTZELFdBQVcsR0FBRzVGLENBQUMsQ0FBRSxvQkFBRixDQUFELENBQTBCK0IsR0FBMUIsRUFBbEI7QUFDQSxVQUFJOEQsWUFBWSxHQUFHN0YsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkIrQixHQUEzQixFQUFuQjtBQUNBLFVBQUl4QyxJQUFJLEdBQUc7QUFDVixrQkFBVSxvQkFEQTtBQUVWLDRCQUFvQkYsZUFGVjtBQUdWLHdCQUFnQnVHLFdBSE47QUFJVix5QkFBaUJDO0FBSlAsT0FBWDtBQU1BN0YsTUFBQUEsQ0FBQyxDQUFDOEYsSUFBRixDQUFRckYsT0FBUixFQUFpQmxCLElBQWpCLEVBQXVCLFVBQVVxQixRQUFWLEVBQXFCO0FBQzNDLFlBQUssU0FBU0EsUUFBUSxDQUFDRCxPQUF2QixFQUFpQztBQUNoQ29GLFVBQUFBLDJCQUEyQjtBQUMzQi9GLFVBQUFBLENBQUMsQ0FBRSwrQkFBRixDQUFELENBQXFDZ0csS0FBckMsQ0FBNENoRyxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQmdHLEtBQS9CLEtBQXlDLEVBQXJGO0FBQ0FoRyxVQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ21CLElBQXJDLENBQTJDLG1EQUEzQyxFQUFpRzhFLE1BQWpHLEdBQTBHQyxLQUExRyxDQUFpSCxJQUFqSCxFQUF3SHJDLE9BQXhIO0FBQ0E7QUFDRCxPQU5EO0FBT0EsYUFBTyxLQUFQO0FBQ0EsS0FsQkQ7QUFtQkE7QUFDRDtBQUVEOzs7OztBQUdBLFNBQVNzQyxXQUFULEdBQXVCO0FBQ3RCbkcsRUFBQUEsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUMyRixJQUFyQztBQUNBM0YsRUFBQUEsQ0FBQyxDQUFFLDhCQUFGLENBQUQsQ0FBb0NrRCxFQUFwQyxDQUF3QyxPQUF4QyxFQUFpRCxZQUFXO0FBQzNELFFBQUkyQyxZQUFZLEdBQUc3RixDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQitCLEdBQTNCLEVBQW5CO0FBQ0EsUUFBSTFDLGVBQWUsR0FBR1csQ0FBQyxDQUFFLHdCQUFGLENBQUQsQ0FBOEIrQixHQUE5QixFQUF0QjtBQUNBLFFBQUl4QyxJQUFJLEdBQUc7QUFDVixnQkFBVSxzQkFEQTtBQUVWLHVCQUFpQnNHLFlBRlA7QUFHViwwQkFBb0J4RztBQUhWLEtBQVg7QUFLQVcsSUFBQUEsQ0FBQyxDQUFDOEYsSUFBRixDQUFRckYsT0FBUixFQUFpQmxCLElBQWpCLEVBQXVCLFVBQVVxQixRQUFWLEVBQXFCO0FBQzNDLFVBQUssU0FBU0EsUUFBUSxDQUFDRCxPQUF2QixFQUFpQztBQUNoQ29GLFFBQUFBLDJCQUEyQjtBQUMzQi9GLFFBQUFBLENBQUMsQ0FBRSwrQkFBRixDQUFELENBQXFDZ0csS0FBckMsQ0FBNENoRyxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQmdHLEtBQS9CLEtBQXlDLEVBQXJGO0FBQ0FoRyxRQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ21CLElBQXJDLENBQTJDLHFEQUEzQyxFQUFtRzhFLE1BQW5HLEdBQTRHQyxLQUE1RyxDQUFtSCxJQUFuSCxFQUEwSHJDLE9BQTFIO0FBQ0E7QUFDRCxLQU5EO0FBT0EsV0FBTyxLQUFQO0FBQ0EsR0FoQkQ7QUFpQkE7QUFFRDs7Ozs7QUFHQSxTQUFTa0MsMkJBQVQsR0FBdUM7QUFDdEMsTUFBSUssU0FBUyxHQUFHcEcsQ0FBQyxDQUFFLGtCQUFGLENBQUQsQ0FBd0IrQixHQUF4QixFQUFoQjtBQUNBLE1BQUl4QyxJQUFJLEdBQUc7QUFDVixjQUFVLHFCQURBO0FBRVYsa0JBQWM2RztBQUZKLEdBQVg7QUFJQXBHLEVBQUFBLENBQUMsQ0FBQzhGLElBQUYsQ0FBUXJGLE9BQVIsRUFBaUJsQixJQUFqQixFQUF1QixVQUFVcUIsUUFBVixFQUFxQjtBQUMzQyxRQUFLLFNBQVNBLFFBQVEsQ0FBQ0QsT0FBdkIsRUFBaUM7QUFDaENYLE1BQUFBLENBQUMsQ0FBRSxzQkFBRixDQUFELENBQTRCc0MsSUFBNUIsQ0FBa0MxQixRQUFRLENBQUNyQixJQUFULENBQWM4RyxpQkFBaEQ7QUFDQXJHLE1BQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCc0MsSUFBM0IsQ0FBaUMxQixRQUFRLENBQUNyQixJQUFULENBQWMrRyxnQkFBL0M7QUFDQXRHLE1BQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCc0MsSUFBM0IsQ0FBaUMxQixRQUFRLENBQUNyQixJQUFULENBQWNnSCxnQkFBL0M7QUFDQXZHLE1BQUFBLENBQUMsQ0FBRSxjQUFGLENBQUQsQ0FBb0JzQyxJQUFwQixDQUEwQjFCLFFBQVEsQ0FBQ3JCLElBQVQsQ0FBY2lILFNBQXhDOztBQUNBLFVBQUssUUFBUTVGLFFBQVEsQ0FBQ3JCLElBQVQsQ0FBY2dILGdCQUEzQixFQUE4QztBQUM3Q3ZHLFFBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCc0MsSUFBM0IsQ0FBaUMsU0FBakM7QUFDQTtBQUNEO0FBQ0QsR0FWRDtBQVdBO0FBRUQ7Ozs7O0FBR0EsU0FBU21FLGtCQUFULEdBQThCO0FBQzdCekcsRUFBQUEsQ0FBQyxDQUFFLG1CQUFGLENBQUQsQ0FBeUJpRSxLQUF6QixDQUFnQyxZQUFXO0FBQzFDLFFBQUkxRSxJQUFJLEdBQUc7QUFDVixnQkFBVTtBQURBLEtBQVg7QUFHQSxRQUFJbUgsSUFBSSxHQUFHMUcsQ0FBQyxDQUFFLElBQUYsQ0FBWjtBQUNBQSxJQUFBQSxDQUFDLENBQUM4RixJQUFGLENBQVFyRixPQUFSLEVBQWlCbEIsSUFBakIsRUFBdUIsVUFBVXFCLFFBQVYsRUFBcUI7QUFDM0MsVUFBSyxTQUFTQSxRQUFRLENBQUNELE9BQWxCLElBQTZCLFNBQVNDLFFBQVEsQ0FBQ3JCLElBQVQsQ0FBY29CLE9BQXpELEVBQW1FO0FBQ2xFK0YsUUFBQUEsSUFBSSxDQUFDaEMsTUFBTCxHQUFjdkQsSUFBZCxDQUFvQlAsUUFBUSxDQUFDckIsSUFBVCxDQUFjb0gsT0FBbEMsRUFBNENWLE1BQTVDO0FBQ0E7QUFDRCxLQUpEO0FBS0EsV0FBTyxLQUFQO0FBQ0EsR0FYRDtBQVlBO0FBRUQ7Ozs7Ozs7QUFLQWpHLENBQUMsQ0FBRTZCLFFBQUYsQ0FBRCxDQUFjQyxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQTJFLEVBQUFBLGtCQUFrQixHQUhhLENBSy9COztBQUNBZixFQUFBQSxXQUFXLEdBTm9CLENBUS9COztBQUNBUyxFQUFBQSxXQUFXO0FBQ1gsQ0FWRDs7O0FDakdBOzs7QUFHQSxTQUFTUyxnQkFBVCxHQUE0QjtBQUMzQixNQUFLLElBQUk1RyxDQUFDLENBQUUseUNBQUYsQ0FBRCxDQUErQ0ksTUFBeEQsRUFBaUU7QUFDaEUsUUFBS0osQ0FBQyxDQUFFLCtDQUFGLENBQUQsQ0FBcUQ2RyxFQUFyRCxDQUF5RCxVQUF6RCxDQUFMLEVBQTZFO0FBQzVFN0csTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0Q4RyxJQUFsRDtBQUNBLEtBRkQsTUFFTztBQUNOOUcsTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0QyRixJQUFsRDtBQUNBO0FBQ0Q7QUFDRCxDLENBRUQ7OztBQUNBM0YsQ0FBQyxDQUFFNkIsUUFBRixDQUFELENBQWNxQixFQUFkLENBQWtCLFFBQWxCLEVBQTRCLCtDQUE1QixFQUE2RSxZQUFXO0FBQ3ZGMEQsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBRkQ7QUFJQTVHLENBQUMsQ0FBRTZCLFFBQUYsQ0FBRCxDQUFjQyxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQThFLEVBQUFBLGdCQUFnQjtBQUNoQixDQUpEIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHZW5lcmF0ZSByZWNvcmQgdHlwZSBjaG9pY2VzIGZvciB0aGUgV29yZFByZXNzIG9iamVjdFxuICogVGhpcyBpbmNsdWRlcyBwb3NzaWJsZSBzdGF0dXNlcyB0byBjaG9vc2UgZnJvbSwgYW5kIHdoZXRoZXIgb3Igbm90IHRoZXJlIGFyZSBkcmFmdHNcbiAqIEBwYXJhbSB7c3RyaW5nfSB3b3JkcHJlc3NPYmplY3QgdGhlIFdvcmRQcmVzcyBvYmplY3QgbmFtZVxuICogQHBhcmFtIHtib29sfSBjaGFuZ2UgaXMgdGhpcyBhIGNoYW5nZSBvciBhIHBhZ2Vsb2FkXG4gKi9cbmZ1bmN0aW9uIHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCB3b3JkcHJlc3NPYmplY3QsIGNoYW5nZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfd29yZHByZXNzX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0J2luY2x1ZGUnOiBbICdzdGF0dXNlcycgXSxcblx0XHQvLydmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHR9O1xuXG5cdC8vIGZvciBkZWZhdWx0IHN0YXR1cyBwaWNrZXJcblx0dmFyIHN0YXR1c2VzQ29udGFpbmVyID0gJy5zZndwLW0td29yZHByZXNzLXN0YXR1c2VzJztcblx0dmFyIHN0YXR1c2VzRmllbGRHcm91cCA9ICcuJyArIHN0YXR1c2VzQ29udGFpbmVyICsgJy4nICsgc3RhdHVzZXNDb250YWluZXIgKyAnLScgKyB3b3JkcHJlc3NPYmplY3QgKyAnICNzZndwLWRlZmF1bHQtc3RhdHVzJztcblx0dmFyIHN0YXR1c09wdGlvbnMgPSAnJztcblx0dmFyIHN0YXR1c2VzTWFya3VwID0gJyc7XG5cblx0Ly8gZm9yIGRyYWZ0IHNldHRpbmdzXG5cdHZhciBkcmFmdENvbnRhaW5lciA9ICcuc2Z3cC1tLXdvcmRwcmVzcy1kcmFmdHMnO1xuXHR2YXIgZHJhZnRGaWVsZEdyb3VwID0gJy4nICsgZHJhZnRDb250YWluZXIgKyAnLicgKyBkcmFmdENvbnRhaW5lciArICctJyArIHdvcmRwcmVzc09iamVjdCArICcgLmNoZWNrYm94Jztcblx0dmFyIGRyYWZ0T3B0aW9uID0gJyc7XG5cdHZhciBkcmFmdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGFkZCB0aGUgV29yZFByZXNzIG9iamVjdCB3ZSdyZSBsb29raW5nIGF0IHRvIHRoZSBzdGF0dXMgY29udGFpbmVyXG5cdCQoIHN0YXR1c2VzQ29udGFpbmVyICkuYXR0ciggJ2NsYXNzJywgJ3Nmd3AtbS1maWVsZG1hcC1ncm91cC1maWVsZHMgc2VsZWN0ICcgKyBzdGF0dXNlc0NvbnRhaW5lciApLmFkZENsYXNzKCBzdGF0dXNlc0NvbnRhaW5lciArICctJyArIHdvcmRwcmVzc09iamVjdCApO1xuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCBzdGF0dXNlc0NvbnRhaW5lciApLmFkZENsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHQkKCBkcmFmdENvbnRhaW5lciApLmFkZENsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggc3RhdHVzZXNGaWVsZEdyb3VwICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdCQoIGRyYWZ0RmllbGRHcm91cCArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fVxuXHRcblx0aWYgKCAwIDwgJCggc3RhdHVzZXNGaWVsZEdyb3VwICsgJ2lucHV0OmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdCQoIHN0YXR1c2VzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdH1cblxuXHRpZiAoIDAgPCAkKCBkcmFmdEZpZWxkR3JvdXAgKyAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0JCggZHJhZnRDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItd29yZHByZXNzJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5zdGF0dXNlcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdGFsbG93ZWRUeXBlT3B0aW9ucyArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHRcdCQoIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgKS5odG1sKCBhbGxvd2VkVHlwZU9wdGlvbnMgKTtcblxuXHRcdFx0Ly8gaG9sZCBvbnRvIHRoaXNcblx0XHRcdGFycmF5MS5maWx0ZXIodmFsdWUgPT4gLTEgIT09IGFycmF5Mi5pbmRleE9mKHZhbHVlKSlcblxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXdvcmRwcmVzcycgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHRcdGlmICggJycgIT09IGFsbG93ZWRUeXBlT3B0aW9ucyApIHtcblx0XHRcdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHRcdGlmICggZmlyc3REYXRlT3B0aW9uICE9PSBkYXRlRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBXb3JkUHJlc3MgcmVjb3JkIHR5cGUgc2V0dGluZ3NcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gTG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBmb3IgdGhlIFdvcmRQcmVzcyBvYmplY3Rcblx0d29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoICQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpLCBmYWxzZSApO1xufSApO1xuIiwiLyoqXG4gKiBHZW5lcmF0ZSByZWNvcmQgdHlwZSBjaG9pY2VzIGZvciB0aGUgU2FsZXNmb3JjZSBvYmplY3RcbiAqIFRoaXMgaW5jbHVkZXMgcmVjb3JkIHR5cGVzIGFsbG93ZWQgYW5kIGRhdGUgZmllbGRzLlxuICogQHBhcmFtIHtzdHJpbmd9IHNhbGVzZm9yY2VPYmplY3QgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IG5hbWVcbiAqIEBwYXJhbSB7Ym9vbH0gY2hhbmdlIGlzIHRoaXMgYSBjaGFuZ2Ugb3IgYSBwYWdlbG9hZFxuICovXG5mdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHNhbGVzZm9yY2VPYmplY3QsIGNoYW5nZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHQnZmllbGRfdHlwZSc6ICdkYXRldGltZScsXG5cdFx0J3NhbGVzZm9yY2Vfb2JqZWN0Jzogc2FsZXNmb3JjZU9iamVjdFxuXHR9O1xuXG5cdC8vIGZvciBhbGxvd2VkIHR5cGVzIGFuZCBkZWZhdWx0IHR5cGVcblx0dmFyIGFsbG93ZWRUeXBlc0NvbnRhaW5lciA9ICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQnO1xuXHR2YXIgYWxsb3dlZFR5cGVzRmllbGRHcm91cCA9ICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQtJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnIC5jaGVja2JveGVzJztcblx0dmFyIGFsbG93ZWRUeXBlT3B0aW9ucyA9ICcnO1xuXHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGZvciBkYXRlIGZpZWxkc1xuXHR2YXIgc2VsZWN0RGF0ZUNvbnRhaW5lciA9ICcuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBzZWxlY3REYXRlRmllbGQgPSAnI3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0Ly92YXIgc2VsZWN0RGF0ZUZpZWxkID0gJy5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQtJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnICNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBkYXRlRmllbGRPcHRpb25zID0gJyc7XG5cdHZhciBmaXJzdERhdGVPcHRpb24gPSAkKCBzZWxlY3REYXRlRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblxuXHQvLyBhZGQgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IHdlJ3JlIGxvb2tpbmcgYXQgdG8gdGhlIGFsbG93ZWQgdHlwZXMgY29udGFpbmVyXG5cdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmF0dHIoICdjbGFzcycsICdzZndwLW0tZmllbGRtYXAtc3ViZ3JvdXAgc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQnICkuYWRkQ2xhc3MoICdzZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZC0nICsgc2FsZXNmb3JjZU9iamVjdCApO1xuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hZGRDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkuYWRkQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHQkKCBzZWxlY3REYXRlRmllbGQgKS52YWwoICcnICk7XG5cdH1cblx0XG5cdGlmICggMCA8ICQoIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgKyAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0fVxuXG5cdGlmICggJycgIT09ICQoIHNlbGVjdERhdGVGaWVsZCApLnZhbCgpICkge1xuXHRcdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRkYXRlRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RGF0ZU9wdGlvbiArICc8L29wdGlvbj4nO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRhbGxvd2VkVHlwZU9wdGlvbnMgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0XHQkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICkuaHRtbCggYWxsb3dlZFR5cGVPcHRpb25zICk7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCAmJiAnJyAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRkYXRlRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUZpZWxkICkuaHRtbCggZGF0ZUZpZWxkT3B0aW9ucyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0XHRpZiAoICcnICE9PSBhbGxvd2VkVHlwZU9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGZpcnN0RGF0ZU9wdGlvbiAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIEFsbG93IGZvciBwaWNraW5nIHRoZSBkZWZhdWx0IHJlY29yZCB0eXBlLCB3aGVuIGEgU2FsZXNmb3JjZSBvYmplY3QgaGFzIHJlY29yZCB0eXBlcy5cbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncygpIHtcblx0dmFyIHNlbGVjdENvbnRhaW5lciA9ICQoICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKTtcblx0dmFyIHNlbGVjdERlZmF1bHRGaWVsZCA9ICcjc2Z3cC1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnO1xuXHR2YXIgcmVjb3JkVHlwZUZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RSZWNvcmRUeXBlRmllbGQgPSAkKCBzZWxlY3REZWZhdWx0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0dmFyIHNlbGVjdGVkID0gJyc7XG5cdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RSZWNvcmRUeXBlRmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAwID09PSAkKCAnLnNmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRzZWxlY3RDb250YWluZXIuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xuXHRcdHJldHVybjtcblx0fVxuXHQkKCAnLnNmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRpZiAoIDEgPT09ICQoICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkJztcblx0XHR9XG5cdFx0cmVjb3JkVHlwZUZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyAkKCB0aGlzICkudmFsKCkgKyAnXCInICsgc2VsZWN0ZWQgKyc+JyArICQoIHRoaXMgKS5jbG9zZXN0KCAnbGFiZWwnICkudGV4dCgpICsgJzwvb3B0aW9uPic7XG5cdH0gKTtcblx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkuaHRtbCggcmVjb3JkVHlwZUZpZWxkcyApO1xuXHRzZWxlY3RDb250YWluZXIucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xufTtcblxuLy8gbG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBpZiB0aGUgU2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9IHRoaXMudmFsdWU7XG5cdHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggc2FsZXNmb3JjZU9iamVjdCwgdHJ1ZSApO1xufSApO1xuXG4vLyBsb2FkIHJlY29yZCB0eXBlIGRlZmF1bHQgY2hvaWNlcyBpZiB0aGUgYWxsb3dlZCByZWNvcmQgdHlwZXMgY2hhbmdlXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5zZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nLCBmdW5jdGlvbigpIHtcblx0ZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncygpO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSByZWNvcmQgdHlwZSBzZXR0aW5nc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBMb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGZvciB0aGUgU2FsZXNmb3JjZSBvYmplY3Rcblx0c2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCksIGZhbHNlICk7XG59ICk7XG4iLCIvKipcbiAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBvYmplY3ROYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIDxzZWxlY3Q+XG4gKi9cbmZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0TmFtZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcydcblx0fTtcblx0dmFyIHNlbGVjdFN5c3RlbUZpZWxkID0gJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0Jztcblx0dmFyIHN5c3RlbUZpZWxkQ2hvaWNlcyA9ICcnO1xuXHR2YXIgZmlyc3RGaWVsZCA9ICQoIHNlbGVjdFN5c3RlbUZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdFN5c3RlbUZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdEZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gc3lzdGVtRmllbGRDaG9pY2VzO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdCQoIHNlbGVjdFN5c3RlbUZpZWxkICkuaHRtbCggc3lzdGVtRmllbGRDaG9pY2VzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzIHdoZW4gdGhlIHBhZ2UgbG9hZHNcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgbmV3S2V5ID0gbmV3IERhdGUoKS5nZXRVVENNaWxsaXNlY29uZHMoKTtcblx0XHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHRcdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0XHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nICk7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIENsb25lcyB0aGUgZmllbGRzZXQgbWFya3VwIHByb3ZpZGVkIGJ5IHRoZSBzZXJ2ZXItc2lkZSB0ZW1wbGF0ZSBhbmQgYXBwZW5kcyBpdCBhdCB0aGUgZW5kLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKiBAcGFyYW0ge3N0cmluZ30gb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHtzdHJpbmd9IG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIHtvYmplY3R9IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuICovXG5mdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdHZhciBuZXh0Um93ID0gJyc7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCAnZGVzdHJveScgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcblx0fVxuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdH0gKTtcblx0fSApO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgYSBmaWVsZCBhY3Rpb24sIGRvbid0IHVzZSB0aGUgZGVmYXVsdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24nLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBlZGl0IG9uIGEgZmllbGQsIHRvZ2dsZSBpdHMgZXhwYW5kZWQgc3RhdHVzXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbi1lZGl0JywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHQkKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLnRvZ2dsZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1leHBhbmRlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGRlbGV0ZSBvbiBhIGZpZWxkLCBvZmZlciB0byBkZWxldGUgaXRcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWRlbGV0ZScsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0Ly8kKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLnRvZ2dsZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1kZWxldGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIEFkZCBuZXcgZmllbGRtYXAgcm93c1xuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuc2Z3cC1maWVsZG1hcC1mb3JtLWZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0gKTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIG9mIG9iamVjdHMgdG8gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdXNoT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzIGZyb20gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdWxsT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdH07XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIHBsdWdpbiBjYWNoZSBidXR0b25cbiAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0cHVzaE9iamVjdHMoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdWxsT2JqZWN0cygpO1xufSApO1xuIiwiLyoqXG4gKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuICovXG5mdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuIl19
}(jQuery));
