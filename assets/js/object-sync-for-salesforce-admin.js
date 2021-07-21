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
  // add the postbox JavaScript from Core.
  postboxes.add_postbox_toggles(pagenow); // disable the option values for fields that have already been mapped.

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJidXR0b24iLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImVuZCIsImNsb25lIiwiY29uc29sZSIsImxvZyIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsImRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzIiwic2VsZWN0IiwiYWxsU2VsZWN0ZWQiLCJmaWVsZENob2ljZSIsInNlbGVjdGVkVmFsdWUiLCJwdXNoIiwiZmlsdGVyIiwidiIsImEiLCJpbmRleE9mIiwicmVtb3ZlUHJvcCIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJ0b2dnbGVDbGFzcyIsInBvc3Rib3hlcyIsImFkZF9wb3N0Ym94X3RvZ2dsZXMiLCJwYWdlbm93IiwicHVzaE9iamVjdHMiLCJoaWRlIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJwb3N0IiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJkZWxheSIsInB1bGxPYmplY3RzIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsImNsaWNrIiwidGhhdCIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiLCJzaG93Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVNBLDZCQUFULENBQXdDQyxlQUF4QyxFQUF5REMsTUFBekQsRUFBa0U7QUFDakUsTUFBSUMsSUFBSSxHQUFHO0FBQ1YsY0FBVSxrQ0FEQTtBQUVWLGVBQVcsQ0FBRSxVQUFGLEVBQWMsUUFBZCxDQUZEO0FBR1Ysd0JBQW9CRjtBQUhWLEdBQVgsQ0FEaUUsQ0FPakU7O0FBQ0EsTUFBSUcsdUJBQXVCLEdBQUksNEJBQS9CO0FBQ0EsTUFBSUMsaUJBQWlCLEdBQUcsc0JBQXhCO0FBQ0EsTUFBSUMsa0JBQWtCLEdBQUcsRUFBekI7QUFDQSxNQUFJQyxpQkFBaUIsR0FBR0MsQ0FBQyxDQUFFSCxpQkFBaUIsR0FBRyxTQUF0QixDQUFELENBQW1DSSxLQUFuQyxHQUEyQ0MsSUFBM0MsRUFBeEIsQ0FYaUUsQ0FhakU7O0FBQ0EsTUFBSUMsY0FBYyxHQUFHLHlCQUFyQjtBQUNBLE1BQUlDLGVBQWUsR0FBR0QsY0FBYyxHQUFHQSxjQUFqQixHQUFrQyxHQUFsQyxHQUF3Q1YsZUFBeEMsR0FBMEQsNEJBQWhGO0FBQ0EsTUFBSVksWUFBWSxHQUFHLEVBQW5CO0FBQ0EsTUFBSUMsV0FBVyxHQUFHLEVBQWxCLENBakJpRSxDQW1CakU7O0FBQ0FOLEVBQUFBLENBQUMsQ0FBRUosdUJBQUYsQ0FBRCxDQUE2QlcsUUFBN0IsQ0FBdUMsNkJBQXZDO0FBQ0FQLEVBQUFBLENBQUMsQ0FBRSxNQUFNRyxjQUFSLENBQUQsQ0FBMEJJLFFBQTFCLENBQW9DLHdCQUFwQztBQUNBUCxFQUFBQSxDQUFDLENBQUUsTUFBTUcsY0FBUixDQUFELENBQTBCSSxRQUExQixDQUFvQ0osY0FBcEM7O0FBQ0Es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LFdBQVcsR0FOb0IsQ0FRL0I7O0FBQ0FTLEVBQUFBLFdBQVc7QUFDWCxDQVZEOzs7QUNqR0E7QUFDQTtBQUNBO0FBQ0EsU0FBU1UsZ0JBQVQsR0FBNEI7QUFDM0IsTUFBSyxJQUFJOUgsQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NXLE1BQXhELEVBQWlFO0FBQ2hFLFFBQUtYLENBQUMsQ0FBRSwrQ0FBRixDQUFELENBQXFEK0gsRUFBckQsQ0FBeUQsVUFBekQsQ0FBTCxFQUE2RTtBQUM1RS9ILE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEZ0ksSUFBbEQ7QUFDQSxLQUZELE1BRU87QUFDTmhJLE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtENEcsSUFBbEQ7QUFDQTtBQUNEO0FBQ0QsQyxDQUVEOzs7QUFDQTVHLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLFFBQWxCLEVBQTRCLCtDQUE1QixFQUE2RSxZQUFXO0FBQ3ZGbUcsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBRkQ7QUFJQTlILENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjRSxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQWtHLEVBQUFBLGdCQUFnQjtBQUNoQixDQUpEIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHZW5lcmF0ZSByZWNvcmQgdHlwZSBjaG9pY2VzIGZvciB0aGUgV29yZFByZXNzIG9iamVjdFxuICogVGhpcyBpbmNsdWRlcyBwb3NzaWJsZSBzdGF0dXNlcyB0byBjaG9vc2UgZnJvbSwgYW5kIHdoZXRoZXIgb3Igbm90IHRoZXJlIGFyZSBkcmFmdHNcbiAqIEBwYXJhbSB7c3RyaW5nfSB3b3JkcHJlc3NPYmplY3QgdGhlIFdvcmRQcmVzcyBvYmplY3QgbmFtZVxuICogQHBhcmFtIHtib29sfSBjaGFuZ2UgaXMgdGhpcyBhIGNoYW5nZSBvciBhIHBhZ2Vsb2FkXG4gKi9cbmZ1bmN0aW9uIHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCB3b3JkcHJlc3NPYmplY3QsIGNoYW5nZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfd29yZHByZXNzX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0J2luY2x1ZGUnOiBbICdzdGF0dXNlcycsICdkcmFmdHMnIF0sXG5cdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0fTtcblxuXHQvLyBmb3IgZGVmYXVsdCBzdGF0dXMgcGlja2VyXG5cdHZhciBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciAgPSAnLnNmd3AtbS13b3JkcHJlc3Mtc3RhdHVzZXMnO1xuXHR2YXIgc2VsZWN0U3RhdHVzRmllbGQgPSAnI3Nmd3AtZGVmYXVsdC1zdGF0dXMnO1xuXHR2YXIgc3RhdHVzRmllbGRPcHRpb25zID0gJyc7XG5cdHZhciBmaXJzdFN0YXR1c09wdGlvbiA9ICQoIHNlbGVjdFN0YXR1c0ZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cblx0Ly8gZm9yIGRyYWZ0IHNldHRpbmdzXG5cdHZhciBkcmFmdENvbnRhaW5lciA9ICdzZndwLW0td29yZHByZXNzLWRyYWZ0cyc7XG5cdHZhciBkcmFmdEZpZWxkR3JvdXAgPSBkcmFmdENvbnRhaW5lciArIGRyYWZ0Q29udGFpbmVyICsgJy0nICsgd29yZHByZXNzT2JqZWN0ICsgJyAuc2Z3cC1tLXNpbmdsZS1jaGVja2JveGVzJztcblx0dmFyIGRyYWZ0T3B0aW9ucyA9ICcnO1xuXHR2YXIgZHJhZnRNYXJrdXAgPSAnJztcblxuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLmFkZENsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLmFkZENsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5hZGRDbGFzcyggZHJhZnRDb250YWluZXIgKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggZHJhZnRGaWVsZEdyb3VwICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9XG5cblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0U3RhdHVzRmllbGQgKS52YWwoKSApIHtcblx0XHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdGZpcnN0U3RhdHVzT3B0aW9uID0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RTdGF0dXNPcHRpb24gKyAnPC9vcHRpb24+Jztcblx0XHRzdGF0dXNGaWVsZE9wdGlvbnMgKz0gZmlyc3RTdGF0dXNPcHRpb247XG5cdH1cblxuXHRpZiAoIDAgPCAkKCBkcmFmdEZpZWxkR3JvdXAgKyAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItd29yZHByZXNzJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5zdGF0dXNlcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdHN0YXR1c0ZpZWxkT3B0aW9ucyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0XHQkKCBzZWxlY3RTdGF0dXNGaWVsZCApLmh0bWwoIHN0YXR1c0ZpZWxkT3B0aW9ucyApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5kcmFmdHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXdvcmRwcmVzcycgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHRcdGlmICggZmlyc3RTdGF0dXNPcHRpb24gIT09IHN0YXR1c0ZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JCggc2VsZWN0U3RhdHVzZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3dvcmRwcmVzcy1zdGF0dXNlcy10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLy8gbG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBpZiB0aGUgV29yZFByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHdvcmRwcmVzc09iamVjdCA9IHRoaXMudmFsdWU7XG5cdHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCB3b3JkcHJlc3NPYmplY3QsIHRydWUgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFdvcmRQcmVzcyByZWNvcmQgdHlwZSBzZXR0aW5nc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBMb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGZvciB0aGUgV29yZFByZXNzIG9iamVjdFxuXHR3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyggJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCksIGZhbHNlICk7XG59ICk7XG4iLCIvKipcbiAqIEdlbmVyYXRlIHJlY29yZCB0eXBlIGNob2ljZXMgZm9yIHRoZSBTYWxlc2ZvcmNlIG9iamVjdFxuICogVGhpcyBpbmNsdWRlcyByZWNvcmQgdHlwZXMgYWxsb3dlZCBhbmQgZGF0ZSBmaWVsZHMuXG4gKiBAcGFyYW0ge3N0cmluZ30gc2FsZXNmb3JjZU9iamVjdCB0aGUgU2FsZXNmb3JjZSBvYmplY3QgbmFtZVxuICogQHBhcmFtIHtib29sfSBjaGFuZ2UgaXMgdGhpcyBhIGNoYW5nZSBvciBhIHBhZ2Vsb2FkXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggc2FsZXNmb3JjZU9iamVjdCwgY2hhbmdlICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0J2luY2x1ZGUnOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHQnc2FsZXNmb3JjZV9vYmplY3QnOiBzYWxlc2ZvcmNlT2JqZWN0XG5cdH07XG5cblx0Ly8gZm9yIGFsbG93ZWQgdHlwZXMgYW5kIGRlZmF1bHQgdHlwZVxuXHR2YXIgYWxsb3dlZFR5cGVzQ29udGFpbmVyID0gJ3Nmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkJztcblx0dmFyIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgPSAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICsgJyAuY2hlY2tib3hlcyc7XG5cdHZhciBhbGxvd2VkVHlwZU9wdGlvbnMgPSAnJztcblx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnO1xuXHR2YXIgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJztcblxuXHQvLyBmb3IgZGF0ZSBmaWVsZHNcblx0dmFyIHNlbGVjdERhdGVDb250YWluZXIgPSAnLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHR2YXIgc2VsZWN0RGF0ZUZpZWxkID0gJyNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdC8vdmFyIHNlbGVjdERhdGVGaWVsZCA9ICcuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZC5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICsgJyAjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHR2YXIgZGF0ZUZpZWxkT3B0aW9ucyA9ICcnO1xuXHR2YXIgZmlyc3REYXRlT3B0aW9uID0gJCggc2VsZWN0RGF0ZUZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cblx0Ly8gYWRkIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCB3ZSdyZSBsb29raW5nIGF0IHRvIHRoZSBhbGxvd2VkIHR5cGVzIGNvbnRhaW5lclxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hdHRyKCAnY2xhc3MnLCAnc2Z3cC1tLWZpZWxkbWFwLXN1Ymdyb3VwICcgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hZGRDbGFzcyggYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJy0nICsgc2FsZXNmb3JjZU9iamVjdCApO1xuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hZGRDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkuYWRkQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHQkKCBzZWxlY3REYXRlRmllbGQgKS52YWwoICcnICk7XG5cdFx0aWYgKCAwIDwgJCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCArICdpbnB1dDpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdH1cblx0XG5cdFxuXG5cdGlmICggJycgIT09ICQoIHNlbGVjdERhdGVGaWVsZCApLnZhbCgpICkge1xuXHRcdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRmaXJzdERhdGVPcHRpb24gPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdERhdGVPcHRpb24gKyAnPC9vcHRpb24+Jztcblx0XHRkYXRlRmllbGRPcHRpb25zICs9IGZpcnN0RGF0ZU9wdGlvbjtcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci1zYWxlc2ZvcmNlJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0YWxsb3dlZFR5cGVPcHRpb25zICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXHRcdFx0JCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCApLmh0bWwoIGFsbG93ZWRUeXBlT3B0aW9ucyApO1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggJiYgJycgIT09IGRhdGVGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0ZGF0ZUZpZWxkT3B0aW9ucyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoIHNlbGVjdERhdGVGaWVsZCApLmh0bWwoIGRhdGVGaWVsZE9wdGlvbnMgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci1zYWxlc2ZvcmNlJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdFx0aWYgKCAnJyAhPT0gYWxsb3dlZFR5cGVPcHRpb25zICkge1xuXHRcdFx0XHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBmaXJzdERhdGVPcHRpb24gIT09IGRhdGVGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBBbGxvdyBmb3IgcGlja2luZyB0aGUgZGVmYXVsdCByZWNvcmQgdHlwZSwgd2hlbiBhIFNhbGVzZm9yY2Ugb2JqZWN0IGhhcyByZWNvcmQgdHlwZXMuXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApIHtcblx0dmFyIHNlbGVjdENvbnRhaW5lciA9ICQoICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKTtcblx0dmFyIHNlbGVjdERlZmF1bHRGaWVsZCA9ICcjc2Z3cC1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnO1xuXHR2YXIgcmVjb3JkVHlwZUZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RSZWNvcmRUeXBlRmllbGQgPSAkKCBzZWxlY3REZWZhdWx0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0dmFyIHNlbGVjdGVkID0gJyc7XG5cdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RSZWNvcmRUeXBlRmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAwID09PSAkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRzZWxlY3RDb250YWluZXIuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xuXHRcdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLnByb3AoICdyZXF1aXJlZCcsIGZhbHNlICk7XG5cdFx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkudmFsKCcnKTtcblx0XHRyZXR1cm47XG5cdH1cblx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5lYWNoKCBmdW5jdGlvbiggaW5kZXggKSB7XG5cdFx0aWYgKCAxID09PSAkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRcdHNlbGVjdGVkID0gJyBzZWxlY3RlZCc7XG5cdFx0XHRzZWxlY3RDb250YWluZXIuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xuXHRcdH1cblx0XHRyZWNvcmRUeXBlRmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArICQoIHRoaXMgKS52YWwoKSArICdcIicgKyBzZWxlY3RlZCArJz4nICsgJCggdGhpcyApLmNsb3Nlc3QoICdsYWJlbCcgKS50ZXh0KCkgKyAnPC9vcHRpb24+Jztcblx0fSApO1xuXHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS5odG1sKCByZWNvcmRUeXBlRmllbGRzICk7XG5cdGlmICggMSA8ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdHNlbGVjdENvbnRhaW5lci5yZW1vdmVDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkucHJvcCggJ3JlcXVpcmVkJywgdHJ1ZSApO1xuXHR9XG59O1xuXG4vLyBsb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGlmIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gdGhpcy52YWx1ZTtcblx0c2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCBzYWxlc2ZvcmNlT2JqZWN0LCB0cnVlICk7XG59ICk7XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgZGVmYXVsdCBjaG9pY2VzIGlmIHRoZSBhbGxvd2VkIHJlY29yZCB0eXBlcyBjaGFuZ2VcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLnNmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsIGZ1bmN0aW9uKCkge1xuXHRkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzKCAnc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQnICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIHJlY29yZCB0eXBlIHNldHRpbmdzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIExvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgZm9yIHRoZSBTYWxlc2ZvcmNlIG9iamVjdFxuXHRzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoICQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS52YWwoKSwgZmFsc2UgKTtcbn0gKTtcbiIsIi8qKlxuICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuICogQHBhcmFtIHtzdHJpbmd9IHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuICogQHBhcmFtIHtzdHJpbmd9IG9iamVjdE5hbWUgdGhlIHZhbHVlIGZvciB0aGUgb2JqZWN0IG5hbWUgZnJvbSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0U3lzdGVtRmllbGQgPSAnLnNmd3AtZmllbGRtYXAtJyArIHN5c3RlbSArICctZmllbGQgc2VsZWN0Jztcblx0dmFyIHN5c3RlbUZpZWxkQ2hvaWNlcyA9ICcnO1xuXHR2YXIgZmlyc3RGaWVsZCA9ICQoIHNlbGVjdFN5c3RlbUZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdFN5c3RlbUZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdEZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gc3lzdGVtRmllbGRDaG9pY2VzO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdCQoIHNlbGVjdFN5c3RlbUZpZWxkICkuaHRtbCggc3lzdGVtRmllbGRDaG9pY2VzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzIHdoZW4gdGhlIHBhZ2UgbG9hZHNcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coIGJ1dHRvbiApIHtcblx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHR2YXIgbmV3S2V5ID0gbmV3IERhdGUoKS5nZXRVVENNaWxsaXNlY29uZHMoKTtcblx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0YnV0dG9uLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0YnV0dG9uLnRleHQoIGJ1dHRvbi5kYXRhKCAnYWRkLW1vcmUnICkgKTtcblx0fSBlbHNlIHtcblx0XHRidXR0b24udGV4dCggYnV0dG9uLmRhdGEoICdhZGQtZmlyc3QnICkgKTtcblx0XHRidXR0b24ucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPicgKyBidXR0b24uZGF0YSggJ2Vycm9yLW1pc3Npbmctb2JqZWN0JyApICsgJzwvc3Bhbj48L2Rpdj4nICk7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENsb25lcyB0aGUgZmllbGRzZXQgbWFya3VwIHByb3ZpZGVkIGJ5IHRoZSBzZXJ2ZXItc2lkZSB0ZW1wbGF0ZSBhbmQgYXBwZW5kcyBpdCBhdCB0aGUgZW5kLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKiBAcGFyYW0ge3N0cmluZ30gb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHtzdHJpbmd9IG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIHtvYmplY3R9IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuICovXG5mdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdHZhciBuZXh0Um93ID0gJyc7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCAnZGVzdHJveScgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH1cblx0Y29uc29sZS5sb2coJ25leHRSb3cgaXMgJyArIG5leHRSb3cpO1xuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdH0gKTtcblx0fSApO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBXb3JkUHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JywgZnVuY3Rpb24oKSB7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnd29yZHByZXNzJyApO1xufSApO1xuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgU2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JywgZnVuY3Rpb24oKSB7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnc2FsZXNmb3JjZScgKTtcbn0gKTtcblxuLyoqXG4gKiBEaXNhYmxlIGZpZWxkcyB0aGF0IGFyZSBhbHJlYWR5IG1hcHBlZCBmcm9tIGJlaW5nIG1hcHBlZCBhZ2Fpbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqL1xuZnVuY3Rpb24gZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoIHN5c3RlbSApIHtcblx0Ly8gbG9hZCB0aGUgc2VsZWN0IHN0YXRlbWVudHMgZm9yIFNhbGVzZm9yY2Ugb3IgV29yZFByZXNzLlxuXHR2YXIgc2VsZWN0ID0gJCggJy5maWVsZG1hcC1kaXNhYmxlLW1hcHBlZC1maWVsZHMgLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnICk7XG5cdHZhciBhbGxTZWxlY3RlZCA9IFtdO1xuXHQvLyBhZGQgZWFjaCBjdXJyZW50bHkgc2VsZWN0ZWQgdmFsdWUgdG8gYW4gYXJyYXksIHRoZW4gbWFrZSBpdCB1bmlxdWUuXG5cdHNlbGVjdC5lYWNoKCBmdW5jdGlvbiggaSwgZmllbGRDaG9pY2UgKSB7XG5cdFx0dmFyIHNlbGVjdGVkVmFsdWUgPSAkKCBmaWVsZENob2ljZSApLmZpbmQoICdvcHRpb246c2VsZWN0ZWQnICkudmFsKCk7XG5cdFx0aWYgKCBudWxsICE9PSBzZWxlY3RlZFZhbHVlICYmICcnICE9PSBzZWxlY3RlZFZhbHVlICkge1xuXHRcdFx0YWxsU2VsZWN0ZWQucHVzaCggc2VsZWN0ZWRWYWx1ZSApO1xuXHRcdH1cblx0fSk7XG5cdGFsbFNlbGVjdGVkID0gYWxsU2VsZWN0ZWQuZmlsdGVyKCh2LCBpLCBhKSA9PiBhLmluZGV4T2YodikgPT09IGkpO1xuXHQvLyBkaXNhYmxlIHRoZSBpdGVtcyB0aGF0IGFyZSBzZWxlY3RlZCBpbiBhbm90aGVyIHNlbGVjdCwgZW5hYmxlIHRoZW0gb3RoZXJ3aXNlLlxuXHQkKCAnb3B0aW9uJywgc2VsZWN0ICkucmVtb3ZlUHJvcCggJ2Rpc2FibGVkJyApO1xuXHQkKCAnb3B0aW9uJywgc2VsZWN0ICkucHJvcCggJ2Rpc2FibGVkJywgZmFsc2UgKTtcblx0JC5lYWNoKCBhbGxTZWxlY3RlZCwgZnVuY3Rpb24oIGtleSwgdmFsdWUgKSB7XG5cdFx0JCggJ29wdGlvblt2YWx1ZT0nICsgdmFsdWUgKyAnXTpub3QoOnNlbGVjdGVkKScsIHNlbGVjdCApLnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0fSApO1xuXHQvLyByZWluaXRpYWxpemUgc2VsZWN0MiBpZiBpdCdzIGFjdGl2ZS5cblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHQkKCAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIGNsaWNrIGV2ZW50IGZvciB0aGUgQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZyBidXR0b24uXG4gKiBJdCBkdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKi9cbiAkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnI2FkZC1maWVsZC1tYXBwaW5nJywgZnVuY3Rpb24oKSB7XG5cdGFkZEZpZWxkTWFwcGluZ1JvdyggJCggdGhpcyApICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBhIGZpZWxkIGFjdGlvbiwgZG9uJ3QgdXNlIHRoZSBkZWZhdWx0XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbicsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGVkaXQgb24gYSBmaWVsZCwgdG9nZ2xlIGl0cyBleHBhbmRlZCBzdGF0dXNcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWVkaXQnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdCQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWV4cGFuZGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgZGVsZXRlIG9uIGEgZmllbGQsIG9mZmVyIHRvIGRlbGV0ZSBpdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24tZGVsZXRlJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHQvLyQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWRlbGV0ZWQnICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogRGlzYWJsZSBmaWVsZHMgdGhhdCBhcmUgYWxyZWFkeSBzZWxlY3RlZFxuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHQvLyBhZGQgdGhlIHBvc3Rib3ggSmF2YVNjcmlwdCBmcm9tIENvcmUuXG5cdHBvc3Rib3hlcy5hZGRfcG9zdGJveF90b2dnbGVzKHBhZ2Vub3cpO1xuXG5cdC8vIGRpc2FibGUgdGhlIG9wdGlvbiB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIG1hcHBlZC5cblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICdzYWxlc2ZvcmNlJyApO1xuXHRkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggJ3dvcmRwcmVzcycgKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3AtZGVmYXVsdC1zdGF0dXMnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLXdvcmRwcmVzcy1maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuc2Z3cC1maWVsZG1hcC1zYWxlc2ZvcmNlLWZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0gKTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIG9mIG9iamVjdHMgdG8gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdXNoT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzIGZyb20gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdWxsT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdH07XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIHBsdWdpbiBjYWNoZSBidXR0b25cbiAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0cHVzaE9iamVjdHMoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdWxsT2JqZWN0cygpO1xufSApO1xuIiwiLyoqXG4gKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuICovXG5mdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuIl19
}(jQuery));
