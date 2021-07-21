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
    'include': ['statuses', 'drafts'],
    'wordpress_object': wordpressObject
  }; // for default status picker

  var selectStatusesContainer = '.sfwp-m-wordpress-statuses';
  var selectStatusField = '#sfwp-default-status';
  var statusFieldOptions = '';
  var firstStatusOption = $(selectStatusField + ' option').first().text(); // for draft settings

  var draftContainer = 'sfwp-m-wordpress-drafts';
  var draftFieldGroup = draftContainer + draftContainer + '-' + wordpressObject + ' .sfwp-m-single-checkboxes';
  var draftOptions = '';
  var draftMarkup = ''; // hide the containers first in case they're empty

  $(selectStatusesContainer).addClass('wordpress-statuses-template');
  $('.' + draftContainer).addClass('sfwp-m-drafts-template');
  $('.' + draftContainer).addClass(draftContainer);

  if (true === change) {
    $(draftFieldGroup + ' input[type="checkbox"]').prop('checked', false);
  }

  if ('' !== $(selectStatusField).val()) {
    $(selectStatusesContainer).removeClass('wordpress-statuses-template');
  } else {
    firstStatusOption = '<option value="">' + firstStatusOption + '</option>';
    statusFieldOptions += firstStatusOption;
  }

  if (0 < $(draftFieldGroup + 'input:checked').length) {
    $('.' + draftContainer).removeClass('sfwp-m-drafts-template');
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
          statusFieldOptions += '<option value="' + index + '">' + value + '</option>';
        });
        $(selectStatusField).html(statusFieldOptions);
      }

      if (0 < $(response.data.drafts).length) {
        $('.' + draftContainer).removeClass('sfwp-m-drafts-template');
      }
    },
    complete: function complete() {
      $('.spinner-wordpress').removeClass('is-active');

      if (firstStatusOption !== statusFieldOptions) {
        $(selectStatusesContainer).removeClass('wordpress-statuses-template');
      }
    }
  });
} // load record type settings if the WordPress object changes


$(document).on('change', 'select#sfwp-wordpress-object', function () {
  var wordpressObject = this.value;
  wordpressObjectRecordSettings(wordpressObject, true);
});
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

  var allowedTypesContainer = 'sfwp-m-salesforce-record-types-allowed';
  var allowedTypesFieldGroup = '.' + allowedTypesContainer + '.' + allowedTypesContainer + '-' + salesforceObject + ' .checkboxes';
  var allowedTypeOptions = '';
  var recordTypesAllowedMarkup = '';
  var recordTypeDefaultMarkup = ''; // for date fields

  var selectDateContainer = '.sfwp-m-pull-trigger-field';
  var selectDateField = '#sfwp-pull-trigger-field'; //var selectDateField = '.sfwp-m-pull-trigger-field.sfwp-m-pull-trigger-field-' + salesforceObject + ' #sfwp-pull-trigger-field';

  var dateFieldOptions = '';
  var firstDateOption = $(selectDateField + ' option').first().text(); // add the Salesforce object we're looking at to the allowed types container

  $('.' + allowedTypesContainer).attr('class', 'sfwp-m-fieldmap-subgroup ' + allowedTypesContainer).addClass(allowedTypesContainer + '-' + salesforceObject); // hide the containers first in case they're empty

  $('.' + allowedTypesContainer).addClass('record-types-allowed-template');
  $(selectDateContainer).addClass('pull-trigger-field-template');
  defaultRecordTypeSettings();

  if (true === change) {
    $(allowedTypesFieldGroup + ' input[type="checkbox"]').prop('checked', false);
    $(selectDateField).val('');

    if (0 < $(allowedTypesFieldGroup + 'input:checked').length) {
      $(allowedTypesContainer).removeClass('record-types-allowed-template');
    }
  } else {
    $(allowedTypesContainer).removeClass('record-types-allowed-template');
  }

  if ('' !== $(selectDateField).val()) {
    $(selectDateContainer).removeClass('pull-trigger-field-template');
  } else {
    firstDateOption = '<option value="">' + firstDateOption + '</option>';
    dateFieldOptions += firstDateOption;
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
        $('.' + allowedTypesContainer).removeClass('record-types-allowed-template');
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


function defaultRecordTypeSettings(allowedTypesContainer) {
  var selectContainer = $('.sfwp-m-salesforce-record-type-default');
  var selectDefaultField = '#sfwp-salesforce-record-type-default';
  var recordTypeFields = '';
  var firstRecordTypeField = $(selectDefaultField + ' option').first().text();
  var selected = '';
  recordTypeFields += '<option value="">' + firstRecordTypeField + '</option>';

  if (0 === $('.' + allowedTypesContainer + ' input[type="checkbox"]:checked').length) {
    selectContainer.addClass('record-type-default-template');
    $(selectDefaultField).prop('required', false);
    $(selectDefaultField).val('');
    return;
  }

  $('.' + allowedTypesContainer + ' input[type="checkbox"]:checked').each(function (index) {
    if (1 === $('.' + allowedTypesContainer + ' input[type="checkbox"]:checked').length) {
      selected = ' selected';
      selectContainer.addClass('record-type-default-template');
    }

    recordTypeFields += '<option value="' + $(this).val() + '"' + selected + '>' + $(this).closest('label').text() + '</option>';
  });
  $(selectDefaultField).html(recordTypeFields);

  if (1 < $('.' + allowedTypesContainer + ' input[type="checkbox"]:checked').length) {
    selectContainer.removeClass('record-type-default-template');
    $(selectDefaultField).prop('required', true);
  }
}

; // load record type settings if the Salesforce object changes

$(document).on('change', 'select#sfwp-salesforce-object', function () {
  var salesforceObject = this.value;
  salesforceObjectRecordSettings(salesforceObject, true);
}); // load record type default choices if the allowed record types change

$(document).on('change', '.sfwp-m-salesforce-record-types-allowed input[type="checkbox"]', function () {
  defaultRecordTypeSettings('sfwp-m-salesforce-record-types-allowed');
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
  var selectSystemField = '.sfwp-fieldmap-' + system + '-field select';
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

  console.log('nextRow is ' + nextRow);
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
 * Disable fields that are already selected
 * Select2 on select fields
 */

$(document).ready(function () {
  // disable the option values for fields that have already been mapped.
  disableAlreadyMappedFields('salesforce');
  disableAlreadyMappedFields('wordpress'); // setup the select2 fields if the library is present

  if (jQuery.fn.select2) {
    $('select#sfwp-wordpress-object').select2();
    $('select#sfwp-default-status').select2();
    $('select#sfwp-salesforce-object').select2();
    $('select#sfwp-salesforce-record-type-default').select2();
    $('select#sfwp-pull-trigger-field').select2();
    $('.sfwp-fieldmap-wordpress-field select').select2();
    $('.sfwp-fieldmap-salesforce-field select').select2();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJidXR0b24iLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImVuZCIsImNsb25lIiwiY29uc29sZSIsImxvZyIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsImRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzIiwic2VsZWN0IiwiYWxsU2VsZWN0ZWQiLCJmaWVsZENob2ljZSIsInNlbGVjdGVkVmFsdWUiLCJwdXNoIiwiZmlsdGVyIiwidiIsImEiLCJpbmRleE9mIiwicmVtb3ZlUHJvcCIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJ0b2dnbGVDbGFzcyIsInB1c2hPYmplY3RzIiwiaGlkZSIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwicG9zdCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZGVsYXkiLCJwdWxsT2JqZWN0cyIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJjbGljayIsInRoYXQiLCJtZXNzYWdlIiwidG9nZ2xlU29hcEZpZWxkcyIsImlzIiwic2hvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTQSw2QkFBVCxDQUF3Q0MsZUFBeEMsRUFBeURDLE1BQXpELEVBQWtFO0FBQ2pFLE1BQUlDLElBQUksR0FBRztBQUNWLGNBQVUsa0NBREE7QUFFVixlQUFXLENBQUUsVUFBRixFQUFjLFFBQWQsQ0FGRDtBQUdWLHdCQUFvQkY7QUFIVixHQUFYLENBRGlFLENBT2pFOztBQUNBLE1BQUlHLHVCQUF1QixHQUFJLDRCQUEvQjtBQUNBLE1BQUlDLGlCQUFpQixHQUFHLHNCQUF4QjtBQUNBLE1BQUlDLGtCQUFrQixHQUFHLEVBQXpCO0FBQ0EsTUFBSUMsaUJBQWlCLEdBQUdDLENBQUMsQ0FBRUgsaUJBQWlCLEdBQUcsU0FBdEIsQ0FBRCxDQUFtQ0ksS0FBbkMsR0FBMkNDLElBQTNDLEVBQXhCLENBWGlFLENBYWpFOztBQUNBLE1BQUlDLGNBQWMsR0FBRyx5QkFBckI7QUFDQSxNQUFJQyxlQUFlLEdBQUdELGNBQWMsR0FBR0EsY0FBakIsR0FBa0MsR0FBbEMsR0FBd0NWLGVBQXhDLEdBQTBELDRCQUFoRjtBQUNBLE1BQUlZLFlBQVksR0FBRyxFQUFuQjtBQUNBLE1BQUlDLFdBQVcsR0FBRyxFQUFsQixDQWpCaUUsQ0FtQmpFOztBQUNBTixFQUFBQSxDQUFDLENBQUVKLHVCQUFGLENBQUQsQ0FBNkJXLFFBQTdCLENBQXVDLDZCQUF2QztBQUNBUCxFQUFBQSxDQUFDLENBQUUsTUFBTUcsY0FBUixDQUFELENBQTBCSSxRQUExQixDQUFvQyx3QkFBcEM7QUFDQVAsRUFBQUEsQ0FBQyxDQUFFLE1BQU1HLGNBQVIsQ0FBRCxDQUEwQkksUUFBMUIsQ0FBb0NKLGNBQXBDOztBQUNBLE1BQUssU0FBU1QsTUFBZCxFQUF1QjtBQUN0Qk0sSUFBQUEsQ0FBQyxDQUFF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QUkzSCxDQUFDLENBQUUseUNBQUYsQ0FBRCxDQUErQ1csTUFBeEQsRUFBaUU7QUFDaEUsUUFBS1gsQ0FBQyxDQUFFLCtDQUFGLENBQUQsQ0FBcUQ0SCxFQUFyRCxDQUF5RCxVQUF6RCxDQUFMLEVBQTZFO0FBQzVFNUgsTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0Q2SCxJQUFsRDtBQUNBLEtBRkQsTUFFTztBQUNON0gsTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0R5RyxJQUFsRDtBQUNBO0FBQ0Q7QUFDRCxDLENBRUQ7OztBQUNBekcsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNDLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0NBQTVCLEVBQTZFLFlBQVc7QUFDdkZnRyxFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FGRDtBQUlBM0gsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNFLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBK0YsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBSkQiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlIHJlY29yZCB0eXBlIGNob2ljZXMgZm9yIHRoZSBXb3JkUHJlc3Mgb2JqZWN0XG4gKiBUaGlzIGluY2x1ZGVzIHBvc3NpYmxlIHN0YXR1c2VzIHRvIGNob29zZSBmcm9tLCBhbmQgd2hldGhlciBvciBub3QgdGhlcmUgYXJlIGRyYWZ0c1xuICogQHBhcmFtIHtzdHJpbmd9IHdvcmRwcmVzc09iamVjdCB0aGUgV29yZFByZXNzIG9iamVjdCBuYW1lXG4gKiBAcGFyYW0ge2Jvb2x9IGNoYW5nZSBpcyB0aGlzIGEgY2hhbmdlIG9yIGEgcGFnZWxvYWRcbiAqL1xuZnVuY3Rpb24gd29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHdvcmRwcmVzc09iamVjdCwgY2hhbmdlICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF93b3JkcHJlc3Nfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHQnaW5jbHVkZSc6IFsgJ3N0YXR1c2VzJywgJ2RyYWZ0cycgXSxcblx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHR9O1xuXG5cdC8vIGZvciBkZWZhdWx0IHN0YXR1cyBwaWNrZXJcblx0dmFyIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICA9ICcuc2Z3cC1tLXdvcmRwcmVzcy1zdGF0dXNlcyc7XG5cdHZhciBzZWxlY3RTdGF0dXNGaWVsZCA9ICcjc2Z3cC1kZWZhdWx0LXN0YXR1cyc7XG5cdHZhciBzdGF0dXNGaWVsZE9wdGlvbnMgPSAnJztcblx0dmFyIGZpcnN0U3RhdHVzT3B0aW9uID0gJCggc2VsZWN0U3RhdHVzRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblxuXHQvLyBmb3IgZHJhZnQgc2V0dGluZ3Ncblx0dmFyIGRyYWZ0Q29udGFpbmVyID0gJ3Nmd3AtbS13b3JkcHJlc3MtZHJhZnRzJztcblx0dmFyIGRyYWZ0RmllbGRHcm91cCA9IGRyYWZ0Q29udGFpbmVyICsgZHJhZnRDb250YWluZXIgKyAnLScgKyB3b3JkcHJlc3NPYmplY3QgKyAnIC5zZndwLW0tc2luZ2xlLWNoZWNrYm94ZXMnO1xuXHR2YXIgZHJhZnRPcHRpb25zID0gJyc7XG5cdHZhciBkcmFmdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGhpZGUgdGhlIGNvbnRhaW5lcnMgZmlyc3QgaW4gY2FzZSB0aGV5J3JlIGVtcHR5XG5cdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkuYWRkQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkuYWRkQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLmFkZENsYXNzKCBkcmFmdENvbnRhaW5lciApO1xuXHRpZiAoIHRydWUgPT09IGNoYW5nZSApIHtcblx0XHQkKCBkcmFmdEZpZWxkR3JvdXAgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH1cblxuXHRpZiAoICcnICE9PSAkKCBzZWxlY3RTdGF0dXNGaWVsZCApLnZhbCgpICkge1xuXHRcdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0Zmlyc3RTdGF0dXNPcHRpb24gPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdFN0YXR1c09wdGlvbiArICc8L29wdGlvbj4nO1xuXHRcdHN0YXR1c0ZpZWxkT3B0aW9ucyArPSBmaXJzdFN0YXR1c09wdGlvbjtcblx0fVxuXG5cdGlmICggMCA8ICQoIGRyYWZ0RmllbGRHcm91cCArICdpbnB1dDpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci13b3JkcHJlc3MnICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzICkubGVuZ3RoICkge1xuXHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0c3RhdHVzRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoIHNlbGVjdFN0YXR1c0ZpZWxkICkuaHRtbCggc3RhdHVzRmllbGRPcHRpb25zICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmRyYWZ0cyApLmxlbmd0aCApIHtcblx0XHRcdFx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItd29yZHByZXNzJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdFx0aWYgKCBmaXJzdFN0YXR1c09wdGlvbiAhPT0gc3RhdHVzRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGlmIHRoZSBXb3JkUHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgd29yZHByZXNzT2JqZWN0ID0gdGhpcy52YWx1ZTtcblx0d29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHdvcmRwcmVzc09iamVjdCwgdHJ1ZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgV29yZFByZXNzIHJlY29yZCB0eXBlIHNldHRpbmdzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIExvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgZm9yIHRoZSBXb3JkUHJlc3Mgb2JqZWN0XG5cdHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCAkKCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS52YWwoKSwgZmFsc2UgKTtcbn0gKTtcbiIsIi8qKlxuICogR2VuZXJhdGUgcmVjb3JkIHR5cGUgY2hvaWNlcyBmb3IgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0XG4gKiBUaGlzIGluY2x1ZGVzIHJlY29yZCB0eXBlcyBhbGxvd2VkIGFuZCBkYXRlIGZpZWxkcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzYWxlc2ZvcmNlT2JqZWN0IHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBuYW1lXG4gKiBAcGFyYW0ge2Jvb2x9IGNoYW5nZSBpcyB0aGlzIGEgY2hhbmdlIG9yIGEgcGFnZWxvYWRcbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCBzYWxlc2ZvcmNlT2JqZWN0LCBjaGFuZ2UgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0J2ZpZWxkX3R5cGUnOiAnZGF0ZXRpbWUnLFxuXHRcdCdzYWxlc2ZvcmNlX29iamVjdCc6IHNhbGVzZm9yY2VPYmplY3Rcblx0fTtcblxuXHQvLyBmb3IgYWxsb3dlZCB0eXBlcyBhbmQgZGVmYXVsdCB0eXBlXG5cdHZhciBhbGxvd2VkVHlwZXNDb250YWluZXIgPSAnc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQnO1xuXHR2YXIgYWxsb3dlZFR5cGVzRmllbGRHcm91cCA9ICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICctJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnIC5jaGVja2JveGVzJztcblx0dmFyIGFsbG93ZWRUeXBlT3B0aW9ucyA9ICcnO1xuXHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGZvciBkYXRlIGZpZWxkc1xuXHR2YXIgc2VsZWN0RGF0ZUNvbnRhaW5lciA9ICcuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBzZWxlY3REYXRlRmllbGQgPSAnI3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0Ly92YXIgc2VsZWN0RGF0ZUZpZWxkID0gJy5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQtJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnICNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBkYXRlRmllbGRPcHRpb25zID0gJyc7XG5cdHZhciBmaXJzdERhdGVPcHRpb24gPSAkKCBzZWxlY3REYXRlRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblxuXHQvLyBhZGQgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IHdlJ3JlIGxvb2tpbmcgYXQgdG8gdGhlIGFsbG93ZWQgdHlwZXMgY29udGFpbmVyXG5cdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmF0dHIoICdjbGFzcycsICdzZndwLW0tZmllbGRtYXAtc3ViZ3JvdXAgJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmFkZENsYXNzKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICk7XG5cdC8vIGhpZGUgdGhlIGNvbnRhaW5lcnMgZmlyc3QgaW4gY2FzZSB0aGV5J3JlIGVtcHR5XG5cdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmFkZENsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5hZGRDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0ZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncygpO1xuXHRpZiAoIHRydWUgPT09IGNoYW5nZSApIHtcblx0XHQkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdCQoIHNlbGVjdERhdGVGaWVsZCApLnZhbCggJycgKTtcblx0XHRpZiAoIDAgPCAkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICsgJ2lucHV0OmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0fVxuXHRcblx0XG5cblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RGF0ZUZpZWxkICkudmFsKCkgKSB7XG5cdFx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdGZpcnN0RGF0ZU9wdGlvbiA9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RGF0ZU9wdGlvbiArICc8L29wdGlvbj4nO1xuXHRcdGRhdGVGaWVsZE9wdGlvbnMgKz0gZmlyc3REYXRlT3B0aW9uO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRhbGxvd2VkVHlwZU9wdGlvbnMgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0XHQkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICkuaHRtbCggYWxsb3dlZFR5cGVPcHRpb25zICk7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCAmJiAnJyAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRkYXRlRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUZpZWxkICkuaHRtbCggZGF0ZUZpZWxkT3B0aW9ucyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0XHRpZiAoICcnICE9PSBhbGxvd2VkVHlwZU9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGZpcnN0RGF0ZU9wdGlvbiAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIEFsbG93IGZvciBwaWNraW5nIHRoZSBkZWZhdWx0IHJlY29yZCB0eXBlLCB3aGVuIGEgU2FsZXNmb3JjZSBvYmplY3QgaGFzIHJlY29yZCB0eXBlcy5cbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncyggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkge1xuXHR2YXIgc2VsZWN0Q29udGFpbmVyID0gJCggJy5zZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0JyApO1xuXHR2YXIgc2VsZWN0RGVmYXVsdEZpZWxkID0gJyNzZndwLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCc7XG5cdHZhciByZWNvcmRUeXBlRmllbGRzID0gJyc7XG5cdHZhciBmaXJzdFJlY29yZFR5cGVGaWVsZCA9ICQoIHNlbGVjdERlZmF1bHRGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXHR2YXIgc2VsZWN0ZWQgPSAnJztcblx0cmVjb3JkVHlwZUZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdFJlY29yZFR5cGVGaWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoIDAgPT09ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdHNlbGVjdENvbnRhaW5lci5hZGRDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkucHJvcCggJ3JlcXVpcmVkJywgZmFsc2UgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS52YWwoJycpO1xuXHRcdHJldHVybjtcblx0fVxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRpZiAoIDEgPT09ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkJztcblx0XHRcdHNlbGVjdENvbnRhaW5lci5hZGRDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0fVxuXHRcdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgJCggdGhpcyApLnZhbCgpICsgJ1wiJyArIHNlbGVjdGVkICsnPicgKyAkKCB0aGlzICkuY2xvc2VzdCggJ2xhYmVsJyApLnRleHQoKSArICc8L29wdGlvbj4nO1xuXHR9ICk7XG5cdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLmh0bWwoIHJlY29yZFR5cGVGaWVsZHMgKTtcblx0aWYgKCAxIDwgJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0c2VsZWN0Q29udGFpbmVyLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS5wcm9wKCAncmVxdWlyZWQnLCB0cnVlICk7XG5cdH1cbn07XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgaWYgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSB0aGlzLnZhbHVlO1xuXHRzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHNhbGVzZm9yY2VPYmplY3QsIHRydWUgKTtcbn0gKTtcblxuLy8gbG9hZCByZWNvcmQgdHlwZSBkZWZhdWx0IGNob2ljZXMgaWYgdGhlIGFsbG93ZWQgcmVjb3JkIHR5cGVzIGNoYW5nZVxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJywgZnVuY3Rpb24oKSB7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoICdzZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2UgcmVjb3JkIHR5cGUgc2V0dGluZ3NcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gTG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBmb3IgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0XG5cdHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpLCBmYWxzZSApO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdE5hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnXG5cdH07XG5cdHZhciBzZWxlY3RTeXN0ZW1GaWVsZCA9ICcuc2Z3cC1maWVsZG1hcC0nICsgc3lzdGVtICsgJy1maWVsZCBzZWxlY3QnO1xuXHR2YXIgc3lzdGVtRmllbGRDaG9pY2VzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0U3lzdGVtRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0U3lzdGVtRmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBzeXN0ZW1GaWVsZENob2ljZXM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0U3lzdGVtRmllbGQgKS5odG1sKCBzeXN0ZW1GaWVsZENob2ljZXMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdyggYnV0dG9uICkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHR2YXIgb2xkS2V5ID0gbGFzdFJvdy5hdHRyKCAnZGF0YS1rZXknICk7XG5cdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRidXR0b24ucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRidXR0b24udGV4dCggYnV0dG9uLmRhdGEoICdhZGQtbW9yZScgKSApO1xuXHR9IGVsc2Uge1xuXHRcdGJ1dHRvbi50ZXh0KCBidXR0b24uZGF0YSggJ2FkZC1maXJzdCcgKSApO1xuXHRcdGJ1dHRvbi5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+JyArIGJ1dHRvbi5kYXRhKCAnZXJyb3ItbWlzc2luZy1vYmplY3QnICkgKyAnPC9zcGFuPjwvZGl2PicgKTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoICdkZXN0cm95JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fVxuXHRjb25zb2xlLmxvZygnbmV4dFJvdyBpcyAnICsgbmV4dFJvdyk7XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIFdvcmRQcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnLCBmdW5jdGlvbigpIHtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICd3b3JkcHJlc3MnICk7XG59ICk7XG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnLCBmdW5jdGlvbigpIHtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICdzYWxlc2ZvcmNlJyApO1xufSApO1xuXG4vKipcbiAqIERpc2FibGUgZmllbGRzIHRoYXQgYXJlIGFscmVhZHkgbWFwcGVkIGZyb20gYmVpbmcgbWFwcGVkIGFnYWluLlxuICogQHBhcmFtIHtzdHJpbmd9IHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuICovXG5mdW5jdGlvbiBkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggc3lzdGVtICkge1xuXHQvLyBsb2FkIHRoZSBzZWxlY3Qgc3RhdGVtZW50cyBmb3IgU2FsZXNmb3JjZSBvciBXb3JkUHJlc3MuXG5cdHZhciBzZWxlY3QgPSAkKCAnLmZpZWxkbWFwLWRpc2FibGUtbWFwcGVkLWZpZWxkcyAuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCcgKTtcblx0dmFyIGFsbFNlbGVjdGVkID0gW107XG5cdC8vIGFkZCBlYWNoIGN1cnJlbnRseSBzZWxlY3RlZCB2YWx1ZSB0byBhbiBhcnJheSwgdGhlbiBtYWtlIGl0IHVuaXF1ZS5cblx0c2VsZWN0LmVhY2goIGZ1bmN0aW9uKCBpLCBmaWVsZENob2ljZSApIHtcblx0XHR2YXIgc2VsZWN0ZWRWYWx1ZSA9ICQoIGZpZWxkQ2hvaWNlICkuZmluZCggJ29wdGlvbjpzZWxlY3RlZCcgKS52YWwoKTtcblx0XHRpZiAoIG51bGwgIT09IHNlbGVjdGVkVmFsdWUgJiYgJycgIT09IHNlbGVjdGVkVmFsdWUgKSB7XG5cdFx0XHRhbGxTZWxlY3RlZC5wdXNoKCBzZWxlY3RlZFZhbHVlICk7XG5cdFx0fVxuXHR9KTtcblx0YWxsU2VsZWN0ZWQgPSBhbGxTZWxlY3RlZC5maWx0ZXIoKHYsIGksIGEpID0+IGEuaW5kZXhPZih2KSA9PT0gaSk7XG5cdC8vIGRpc2FibGUgdGhlIGl0ZW1zIHRoYXQgYXJlIHNlbGVjdGVkIGluIGFub3RoZXIgc2VsZWN0LCBlbmFibGUgdGhlbSBvdGhlcndpc2UuXG5cdCQoICdvcHRpb24nLCBzZWxlY3QgKS5yZW1vdmVQcm9wKCAnZGlzYWJsZWQnICk7XG5cdCQoICdvcHRpb24nLCBzZWxlY3QgKS5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHQkLmVhY2goIGFsbFNlbGVjdGVkLCBmdW5jdGlvbigga2V5LCB2YWx1ZSApIHtcblx0XHQkKCAnb3B0aW9uW3ZhbHVlPScgKyB2YWx1ZSArICddOm5vdCg6c2VsZWN0ZWQpJywgc2VsZWN0ICkucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHR9ICk7XG5cdC8vIHJlaW5pdGlhbGl6ZSBzZWxlY3QyIGlmIGl0J3MgYWN0aXZlLlxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICcuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nIGJ1dHRvbi5cbiAqIEl0IGR1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cbiAqL1xuICQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcjYWRkLWZpZWxkLW1hcHBpbmcnLCBmdW5jdGlvbigpIHtcblx0YWRkRmllbGRNYXBwaW5nUm93KCAkKCB0aGlzICkgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGEgZmllbGQgYWN0aW9uLCBkb24ndCB1c2UgdGhlIGRlZmF1bHRcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgZWRpdCBvbiBhIGZpZWxkLCB0b2dnbGUgaXRzIGV4cGFuZGVkIHN0YXR1c1xuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24tZWRpdCcsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0JCggdGhpcyApLmNsb3Nlc3QoICcuc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcycgKS50b2dnbGVDbGFzcyggJ3Nmd3AtYS1maWVsZG1hcC12YWx1ZXMtZXhwYW5kZWQnICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBkZWxldGUgb24gYSBmaWVsZCwgb2ZmZXIgdG8gZGVsZXRlIGl0XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbi1kZWxldGUnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdC8vJCggdGhpcyApLmNsb3Nlc3QoICcuc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcycgKS50b2dnbGVDbGFzcyggJ3Nmd3AtYS1maWVsZG1hcC12YWx1ZXMtZGVsZXRlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBEaXNhYmxlIGZpZWxkcyB0aGF0IGFyZSBhbHJlYWR5IHNlbGVjdGVkXG4gKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gZGlzYWJsZSB0aGUgb3B0aW9uIHZhbHVlcyBmb3IgZmllbGRzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gbWFwcGVkLlxuXHRkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggJ3NhbGVzZm9yY2UnICk7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnd29yZHByZXNzJyApO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1kZWZhdWx0LXN0YXR1cycgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLnNmd3AtZmllbGRtYXAtd29yZHByZXNzLWZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLXNhbGVzZm9yY2UtZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
}(jQuery));
