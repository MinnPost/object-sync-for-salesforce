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
  var salesforceObject = $('#sfwp-salesforce-object').val();
  var wordpressObject = $('#sfwp-salesforce-wordpress').val();
  var newKey = new Date().getUTCMilliseconds();
  var lastRow = $('.sfwp-a-fieldmap-values').last();
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
    nextRow = lastRow.find('select').select2('destroy').end().clone(true).removeClass('sfwp-a-fieldmap-values-template');
  } else {
    nextRow = lastRow.find('select').end().clone(true).removeClass('sfwp-a-fieldmap-values-template');
  }

  console.log('nextRow key is ' + newKey);
  $(nextRow).attr('data-key', newKey);
  $(nextRow).each(function () {
    $(this).html(function (i, h) {
      return h.replace(oldKey, newKey);
    });
  });
  $('.sfwp-m-fieldmap-fields').append(nextRow);

  if (jQuery.fn.select2) {
    lastRow.find('select').select2({
      width: '100%'
    });
    nextRow.find('select').select2({
      width: '100%'
    });
  }
} // load available options if the WordPress object changes


$(document).on('change', '.sfwp-fieldmap-wordpress-field select', function () {
  disableAlreadyMappedFields('wordpress');
}); // load available options if the Salesforce object changes

$(document).on('change', '.sfwp-fieldmap-salesforce-field select', function () {
  disableAlreadyMappedFields('salesforce');
});
/**
 * Disable fields that are already mapped from being mapped again.
 * @param {string} system whether we want WordPress or Salesforce data
 */

function disableAlreadyMappedFields(system) {
  // load the select statements for Salesforce or WordPress.
  var select = $('.fieldmap-disable-mapped-fields .sfwp-fieldmap-' + system + '-field select');
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
    $('.sfwp-fieldmap-' + system + '-field select').select2({
      width: '100%'
    });
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
  var expandedRow = $('.sfwp-a-fieldmap-values-expanded ');

  if (jQuery.fn.select2) {
    expandedRow.find('select').select2({
      width: '100%'
    });
  }
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
<<<<<<< HEAD
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJidXR0b24iLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImVuZCIsImNsb25lIiwiY29uc29sZSIsImxvZyIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsIndpZHRoIiwiZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMiLCJzZWxlY3QiLCJhbGxTZWxlY3RlZCIsImZpZWxkQ2hvaWNlIiwic2VsZWN0ZWRWYWx1ZSIsInB1c2giLCJmaWx0ZXIiLCJ2IiwiYSIsImluZGV4T2YiLCJyZW1vdmVQcm9wIiwiZXZlbnQiLCJwcmV2ZW50RGVmYXVsdCIsInRvZ2dsZUNsYXNzIiwiZXhwYW5kZWRSb3ciLCJwb3N0Ym94ZXMiLCJhZGRfcG9zdGJveF90b2dnbGVzIiwicGFnZW5vdyIsInB1c2hPYmplY3RzIiwiaGlkZSIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwicG9zdCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsImZhZGVJbiIsImRlbGF5IiwicHVsbE9iamVjdHMiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwiY2xpY2siLCJ0aGF0IiwibWVzc2FnZSIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyIsInNob3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBU0EsNkJBQVQsQ0FBd0NDLGVBQXhDLEVBQXlEQyxNQUF6RCxFQUFrRTtBQUNqRSxNQUFJQyxJQUFJLEdBQUc7QUFDVixjQUFVLGtDQURBO0FBRVYsZUFBVyxDQUFFLFVBQUYsRUFBYyxRQUFkLENBRkQ7QUFHVix3QkFBb0JGO0FBSFYsR0FBWCxDQURpRSxDQU9qRTs7QUFDQSxNQUFJRyx1QkFBdUIsR0FBSSw0QkFBL0I7QUFDQSxNQUFJQyxpQkFBaUIsR0FBRyxzQkFBeEI7QUFDQSxNQUFJQyxrQkFBa0IsR0FBRyxFQUF6QjtBQUNBLE1BQUlDLGlCQUFpQixHQUFHQyxDQUFDLENBQUVILGlCQUFpQixHQUFHLFNBQXRCLENBQUQsQ0FBbUNJLEtBQW5DLEdBQTJDQyxJQUEzQyxFQUF4QixDQVhpRSxDQWFqRTs7QUFDQSxNQUFJQyxjQUFjLEdBQUcseUJBQXJCO0FBQ0EsTUFBSUMsZUFBZSxHQUFHRCxjQUFjLEdBQUdBLGNBQWpCLEdBQWtDLEdBQWxDLEdBQXdDVixlQUF4QyxHQUEwRCw0QkFBaEY7QUFDQSxNQUFJWSxZQUFZLEdBQUcsRUFBbkI7QUFDQSxNQUFJQyxXQUFXLEdBQUcsRUFBbEIsQ0FqQmlFLENBbUJqRTs7QUFDQU4sRUFBQUEsQ0FBQyxDQUFFSix1QkFBRixDQUFELENBQTZCVyxRQUE3QixDQUF1Qyw2QkFBdkM7QUFDQVAsRUFBQUEsQ0FBQyxDQUFFLE1BQU1HLGNBQVIsQ0FBRCxDQUEwQkksUUFBMUIsQ0FBb0Msd0JBQXBDO0FBQ0FQLEVBQUFBLENBQUMsQ0FBRSxNQUFNRyxjQUFSLENBQUQsQ0FBMEJJLFFBQTFCLENBQW9D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bGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlIHJlY29yZCB0eXBlIGNob2ljZXMgZm9yIHRoZSBXb3JkUHJlc3Mgb2JqZWN0XG4gKiBUaGlzIGluY2x1ZGVzIHBvc3NpYmxlIHN0YXR1c2VzIHRvIGNob29zZSBmcm9tLCBhbmQgd2hldGhlciBvciBub3QgdGhlcmUgYXJlIGRyYWZ0c1xuICogQHBhcmFtIHtzdHJpbmd9IHdvcmRwcmVzc09iamVjdCB0aGUgV29yZFByZXNzIG9iamVjdCBuYW1lXG4gKiBAcGFyYW0ge2Jvb2x9IGNoYW5nZSBpcyB0aGlzIGEgY2hhbmdlIG9yIGEgcGFnZWxvYWRcbiAqL1xuZnVuY3Rpb24gd29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHdvcmRwcmVzc09iamVjdCwgY2hhbmdlICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF93b3JkcHJlc3Nfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHQnaW5jbHVkZSc6IFsgJ3N0YXR1c2VzJywgJ2RyYWZ0cycgXSxcblx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHR9O1xuXG5cdC8vIGZvciBkZWZhdWx0IHN0YXR1cyBwaWNrZXJcblx0dmFyIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICA9ICcuc2Z3cC1tLXdvcmRwcmVzcy1zdGF0dXNlcyc7XG5cdHZhciBzZWxlY3RTdGF0dXNGaWVsZCA9ICcjc2Z3cC1kZWZhdWx0LXN0YXR1cyc7XG5cdHZhciBzdGF0dXNGaWVsZE9wdGlvbnMgPSAnJztcblx0dmFyIGZpcnN0U3RhdHVzT3B0aW9uID0gJCggc2VsZWN0U3RhdHVzRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblxuXHQvLyBmb3IgZHJhZnQgc2V0dGluZ3Ncblx0dmFyIGRyYWZ0Q29udGFpbmVyID0gJ3Nmd3AtbS13b3JkcHJlc3MtZHJhZnRzJztcblx0dmFyIGRyYWZ0RmllbGRHcm91cCA9IGRyYWZ0Q29udGFpbmVyICsgZHJhZnRDb250YWluZXIgKyAnLScgKyB3b3JkcHJlc3NPYmplY3QgKyAnIC5zZndwLW0tc2luZ2xlLWNoZWNrYm94ZXMnO1xuXHR2YXIgZHJhZnRPcHRpb25zID0gJyc7XG5cdHZhciBkcmFmdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGhpZGUgdGhlIGNvbnRhaW5lcnMgZmlyc3QgaW4gY2FzZSB0aGV5J3JlIGVtcHR5XG5cdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkuYWRkQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkuYWRkQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLmFkZENsYXNzKCBkcmFmdENvbnRhaW5lciApO1xuXHRpZiAoIHRydWUgPT09IGNoYW5nZSApIHtcblx0XHQkKCBkcmFmdEZpZWxkR3JvdXAgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH1cblxuXHRpZiAoICcnICE9PSAkKCBzZWxlY3RTdGF0dXNGaWVsZCApLnZhbCgpICkge1xuXHRcdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0Zmlyc3RTdGF0dXNPcHRpb24gPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdFN0YXR1c09wdGlvbiArICc8L29wdGlvbj4nO1xuXHRcdHN0YXR1c0ZpZWxkT3B0aW9ucyArPSBmaXJzdFN0YXR1c09wdGlvbjtcblx0fVxuXG5cdGlmICggMCA8ICQoIGRyYWZ0RmllbGRHcm91cCArICdpbnB1dDpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci13b3JkcHJlc3MnICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzICkubGVuZ3RoICkge1xuXHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0c3RhdHVzRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoIHNlbGVjdFN0YXR1c0ZpZWxkICkuaHRtbCggc3RhdHVzRmllbGRPcHRpb25zICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmRyYWZ0cyApLmxlbmd0aCApIHtcblx0XHRcdFx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItd29yZHByZXNzJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdFx0aWYgKCBmaXJzdFN0YXR1c09wdGlvbiAhPT0gc3RhdHVzRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGlmIHRoZSBXb3JkUHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgd29yZHByZXNzT2JqZWN0ID0gdGhpcy52YWx1ZTtcblx0d29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHdvcmRwcmVzc09iamVjdCwgdHJ1ZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgV29yZFByZXNzIHJlY29yZCB0eXBlIHNldHRpbmdzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIExvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgZm9yIHRoZSBXb3JkUHJlc3Mgb2JqZWN0XG5cdHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCAkKCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS52YWwoKSwgZmFsc2UgKTtcbn0gKTtcbiIsIi8qKlxuICogR2VuZXJhdGUgcmVjb3JkIHR5cGUgY2hvaWNlcyBmb3IgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0XG4gKiBUaGlzIGluY2x1ZGVzIHJlY29yZCB0eXBlcyBhbGxvd2VkIGFuZCBkYXRlIGZpZWxkcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzYWxlc2ZvcmNlT2JqZWN0IHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBuYW1lXG4gKiBAcGFyYW0ge2Jvb2x9IGNoYW5nZSBpcyB0aGlzIGEgY2hhbmdlIG9yIGEgcGFnZWxvYWRcbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCBzYWxlc2ZvcmNlT2JqZWN0LCBjaGFuZ2UgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0J2ZpZWxkX3R5cGUnOiAnZGF0ZXRpbWUnLFxuXHRcdCdzYWxlc2ZvcmNlX29iamVjdCc6IHNhbGVzZm9yY2VPYmplY3Rcblx0fTtcblxuXHQvLyBmb3IgYWxsb3dlZCB0eXBlcyBhbmQgZGVmYXVsdCB0eXBlXG5cdHZhciBhbGxvd2VkVHlwZXNDb250YWluZXIgPSAnc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQnO1xuXHR2YXIgYWxsb3dlZFR5cGVzRmllbGRHcm91cCA9ICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICctJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnIC5jaGVja2JveGVzJztcblx0dmFyIGFsbG93ZWRUeXBlT3B0aW9ucyA9ICcnO1xuXHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGZvciBkYXRlIGZpZWxkc1xuXHR2YXIgc2VsZWN0RGF0ZUNvbnRhaW5lciA9ICcuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBzZWxlY3REYXRlRmllbGQgPSAnI3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0Ly92YXIgc2VsZWN0RGF0ZUZpZWxkID0gJy5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQtJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnICNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBkYXRlRmllbGRPcHRpb25zID0gJyc7XG5cdHZhciBmaXJzdERhdGVPcHRpb24gPSAkKCBzZWxlY3REYXRlRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblxuXHQvLyBhZGQgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IHdlJ3JlIGxvb2tpbmcgYXQgdG8gdGhlIGFsbG93ZWQgdHlwZXMgY29udGFpbmVyXG5cdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmF0dHIoICdjbGFzcycsICdzZndwLW0tZmllbGRtYXAtc3ViZ3JvdXAgJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmFkZENsYXNzKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICk7XG5cdC8vIGhpZGUgdGhlIGNvbnRhaW5lcnMgZmlyc3QgaW4gY2FzZSB0aGV5J3JlIGVtcHR5XG5cdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmFkZENsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5hZGRDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0ZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncygpO1xuXHRpZiAoIHRydWUgPT09IGNoYW5nZSApIHtcblx0XHQkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdCQoIHNlbGVjdERhdGVGaWVsZCApLnZhbCggJycgKTtcblx0XHRpZiAoIDAgPCAkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICsgJ2lucHV0OmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0fVxuXHRcblx0XG5cblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RGF0ZUZpZWxkICkudmFsKCkgKSB7XG5cdFx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdGZpcnN0RGF0ZU9wdGlvbiA9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RGF0ZU9wdGlvbiArICc8L29wdGlvbj4nO1xuXHRcdGRhdGVGaWVsZE9wdGlvbnMgKz0gZmlyc3REYXRlT3B0aW9uO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRhbGxvd2VkVHlwZU9wdGlvbnMgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0XHQkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICkuaHRtbCggYWxsb3dlZFR5cGVPcHRpb25zICk7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCAmJiAnJyAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRkYXRlRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUZpZWxkICkuaHRtbCggZGF0ZUZpZWxkT3B0aW9ucyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0XHRpZiAoICcnICE9PSBhbGxvd2VkVHlwZU9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGZpcnN0RGF0ZU9wdGlvbiAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIEFsbG93IGZvciBwaWNraW5nIHRoZSBkZWZhdWx0IHJlY29yZCB0eXBlLCB3aGVuIGEgU2FsZXNmb3JjZSBvYmplY3QgaGFzIHJlY29yZCB0eXBlcy5cbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncyggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkge1xuXHR2YXIgc2VsZWN0Q29udGFpbmVyID0gJCggJy5zZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0JyApO1xuXHR2YXIgc2VsZWN0RGVmYXVsdEZpZWxkID0gJyNzZndwLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCc7XG5cdHZhciByZWNvcmRUeXBlRmllbGRzID0gJyc7XG5cdHZhciBmaXJzdFJlY29yZFR5cGVGaWVsZCA9ICQoIHNlbGVjdERlZmF1bHRGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXHR2YXIgc2VsZWN0ZWQgPSAnJztcblx0cmVjb3JkVHlwZUZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdFJlY29yZFR5cGVGaWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoIDAgPT09ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdHNlbGVjdENvbnRhaW5lci5hZGRDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkucHJvcCggJ3JlcXVpcmVkJywgZmFsc2UgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS52YWwoJycpO1xuXHRcdHJldHVybjtcblx0fVxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRpZiAoIDEgPT09ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkJztcblx0XHRcdHNlbGVjdENvbnRhaW5lci5hZGRDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0fVxuXHRcdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgJCggdGhpcyApLnZhbCgpICsgJ1wiJyArIHNlbGVjdGVkICsnPicgKyAkKCB0aGlzICkuY2xvc2VzdCggJ2xhYmVsJyApLnRleHQoKSArICc8L29wdGlvbj4nO1xuXHR9ICk7XG5cdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLmh0bWwoIHJlY29yZFR5cGVGaWVsZHMgKTtcblx0aWYgKCAxIDwgJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0c2VsZWN0Q29udGFpbmVyLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS5wcm9wKCAncmVxdWlyZWQnLCB0cnVlICk7XG5cdH1cbn07XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgaWYgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSB0aGlzLnZhbHVlO1xuXHRzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHNhbGVzZm9yY2VPYmplY3QsIHRydWUgKTtcbn0gKTtcblxuLy8gbG9hZCByZWNvcmQgdHlwZSBkZWZhdWx0IGNob2ljZXMgaWYgdGhlIGFsbG93ZWQgcmVjb3JkIHR5cGVzIGNoYW5nZVxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJywgZnVuY3Rpb24oKSB7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoICdzZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2UgcmVjb3JkIHR5cGUgc2V0dGluZ3NcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gTG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBmb3IgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0XG5cdHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpLCBmYWxzZSApO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdE5hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnXG5cdH07XG5cdHZhciBzZWxlY3RTeXN0ZW1GaWVsZCA9ICcuc2Z3cC1maWVsZG1hcC0nICsgc3lzdGVtICsgJy1maWVsZCBzZWxlY3QnO1xuXHR2YXIgc3lzdGVtRmllbGRDaG9pY2VzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0U3lzdGVtRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0U3lzdGVtRmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBzeXN0ZW1GaWVsZENob2ljZXM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0U3lzdGVtRmllbGQgKS5odG1sKCBzeXN0ZW1GaWVsZENob2ljZXMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdyggYnV0dG9uICkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS52YWwoKTtcblx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjc2Z3cC1zYWxlc2ZvcmNlLXdvcmRwcmVzcycgKS52YWwoKTtcblx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdHZhciBsYXN0Um93ID0gJCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLmxhc3QoKTtcblx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0YnV0dG9uLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0YnV0dG9uLnRleHQoIGJ1dHRvbi5kYXRhKCAnYWRkLW1vcmUnICkgKTtcblx0fSBlbHNlIHtcblx0XHRidXR0b24udGV4dCggYnV0dG9uLmRhdGEoICdhZGQtZmlyc3QnICkgKTtcblx0XHRidXR0b24ucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPicgKyBidXR0b24uZGF0YSggJ2Vycm9yLW1pc3Npbmctb2JqZWN0JyApICsgJzwvc3Bhbj48L2Rpdj4nICk7XG5cdH1cblx0cmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENsb25lcyB0aGUgZmllbGRzZXQgbWFya3VwIHByb3ZpZGVkIGJ5IHRoZSBzZXJ2ZXItc2lkZSB0ZW1wbGF0ZSBhbmQgYXBwZW5kcyBpdCBhdCB0aGUgZW5kLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKiBAcGFyYW0ge3N0cmluZ30gb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHtzdHJpbmd9IG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIHtvYmplY3R9IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuICovXG5mdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdHZhciBuZXh0Um93ID0gJyc7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCAnZGVzdHJveScgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLXRlbXBsYXRlJyApO1xuXHR9XG5cdGNvbnNvbGUubG9nKCduZXh0Um93IGtleSBpcyAnICsgbmV3S2V5KTtcblx0JCggbmV4dFJvdyApLmF0dHIoICdkYXRhLWtleScsIG5ld0tleSApO1xuXHQkKCBuZXh0Um93ICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0JCggdGhpcyApLmh0bWwoIGZ1bmN0aW9uKCBpLCBoICkge1xuXHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHR9ICk7XG5cdH0gKTtcblx0JCggJy5zZndwLW0tZmllbGRtYXAtZmllbGRzJyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKHsgd2lkdGg6ICcxMDAlJyB9KTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0Mih7IHdpZHRoOiAnMTAwJScgfSk7XG5cdH1cbn1cblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgV29yZFByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5zZndwLWZpZWxkbWFwLXdvcmRwcmVzcy1maWVsZCBzZWxlY3QnLCBmdW5jdGlvbigpIHtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICd3b3JkcHJlc3MnICk7XG59ICk7XG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5zZndwLWZpZWxkbWFwLXNhbGVzZm9yY2UtZmllbGQgc2VsZWN0JywgZnVuY3Rpb24oKSB7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnc2FsZXNmb3JjZScgKTtcbn0gKTtcblxuLyoqXG4gKiBEaXNhYmxlIGZpZWxkcyB0aGF0IGFyZSBhbHJlYWR5IG1hcHBlZCBmcm9tIGJlaW5nIG1hcHBlZCBhZ2Fpbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqL1xuZnVuY3Rpb24gZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoIHN5c3RlbSApIHtcblx0Ly8gbG9hZCB0aGUgc2VsZWN0IHN0YXRlbWVudHMgZm9yIFNhbGVzZm9yY2Ugb3IgV29yZFByZXNzLlxuXHR2YXIgc2VsZWN0ID0gJCggJy5maWVsZG1hcC1kaXNhYmxlLW1hcHBlZC1maWVsZHMgLnNmd3AtZmllbGRtYXAtJyArIHN5c3RlbSArICctZmllbGQgc2VsZWN0JyApO1xuXHR2YXIgYWxsU2VsZWN0ZWQgPSBbXTtcblx0Ly8gYWRkIGVhY2ggY3VycmVudGx5IHNlbGVjdGVkIHZhbHVlIHRvIGFuIGFycmF5LCB0aGVuIG1ha2UgaXQgdW5pcXVlLlxuXHRzZWxlY3QuZWFjaCggZnVuY3Rpb24oIGksIGZpZWxkQ2hvaWNlICkge1xuXHRcdHZhciBzZWxlY3RlZFZhbHVlID0gJCggZmllbGRDaG9pY2UgKS5maW5kKCAnb3B0aW9uOnNlbGVjdGVkJyApLnZhbCgpO1xuXHRcdGlmICggbnVsbCAhPT0gc2VsZWN0ZWRWYWx1ZSAmJiAnJyAhPT0gc2VsZWN0ZWRWYWx1ZSApIHtcblx0XHRcdGFsbFNlbGVjdGVkLnB1c2goIHNlbGVjdGVkVmFsdWUgKTtcblx0XHR9XG5cdH0pO1xuXHRhbGxTZWxlY3RlZCA9IGFsbFNlbGVjdGVkLmZpbHRlcigodiwgaSwgYSkgPT4gYS5pbmRleE9mKHYpID09PSBpKTtcblx0Ly8gZGlzYWJsZSB0aGUgaXRlbXMgdGhhdCBhcmUgc2VsZWN0ZWQgaW4gYW5vdGhlciBzZWxlY3QsIGVuYWJsZSB0aGVtIG90aGVyd2lzZS5cblx0JCggJ29wdGlvbicsIHNlbGVjdCApLnJlbW92ZVByb3AoICdkaXNhYmxlZCcgKTtcblx0JCggJ29wdGlvbicsIHNlbGVjdCApLnByb3AoICdkaXNhYmxlZCcsIGZhbHNlICk7XG5cdCQuZWFjaCggYWxsU2VsZWN0ZWQsIGZ1bmN0aW9uKCBrZXksIHZhbHVlICkge1xuXHRcdCQoICdvcHRpb25bdmFsdWU9JyArIHZhbHVlICsgJ106bm90KDpzZWxlY3RlZCknLCBzZWxlY3QgKS5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdH0gKTtcblx0Ly8gcmVpbml0aWFsaXplIHNlbGVjdDIgaWYgaXQncyBhY3RpdmUuXG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLScgKyBzeXN0ZW0gKyAnLWZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKHsgd2lkdGg6ICcxMDAlJyB9KTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBjbGljayBldmVudCBmb3IgdGhlIEFkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcgYnV0dG9uLlxuICogSXQgZHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICovXG4gJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJyNhZGQtZmllbGQtbWFwcGluZycsIGZ1bmN0aW9uKCkge1xuXHRhZGRGaWVsZE1hcHBpbmdSb3coICQoIHRoaXMgKSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgYSBmaWVsZCBhY3Rpb24sIGRvbid0IHVzZSB0aGUgZGVmYXVsdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24nLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBlZGl0IG9uIGEgZmllbGQsIHRvZ2dsZSBpdHMgZXhwYW5kZWQgc3RhdHVzXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbi1lZGl0JywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHQkKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLnRvZ2dsZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1leHBhbmRlZCcgKTtcblx0dmFyIGV4cGFuZGVkUm93ID0gJCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzLWV4cGFuZGVkICcpO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGV4cGFuZGVkUm93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0Mih7IHdpZHRoOiAnMTAwJScgfSk7XG5cdH1cbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGRlbGV0ZSBvbiBhIGZpZWxkLCBvZmZlciB0byBkZWxldGUgaXRcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWRlbGV0ZScsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0Ly8kKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLnRvZ2dsZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1kZWxldGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIERpc2FibGUgZmllbGRzIHRoYXQgYXJlIGFscmVhZHkgc2VsZWN0ZWRcbiAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0Ly8gYWRkIHRoZSBwb3N0Ym94IEphdmFTY3JpcHQgZnJvbSBDb3JlLlxuXHRwb3N0Ym94ZXMuYWRkX3Bvc3Rib3hfdG9nZ2xlcyhwYWdlbm93KTtcblxuXHQvLyBkaXNhYmxlIHRoZSBvcHRpb24gdmFsdWVzIGZvciBmaWVsZHMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBtYXBwZWQuXG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnc2FsZXNmb3JjZScgKTtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICd3b3JkcHJlc3MnICk7XG5cblx0Ly8gc2V0dXAgdGhlIHNlbGVjdDIgZmllbGRzIGlmIHRoZSBsaWJyYXJ5IGlzIHByZXNlbnRcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLWRlZmF1bHQtc3RhdHVzJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuc2Z3cC1maWVsZG1hcC13b3JkcHJlc3MtZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLnNmd3AtZmllbGRtYXAtc2FsZXNmb3JjZS1maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59ICk7XG4iLCIvKipcbiAqIEhhbmRsZSBtYW51YWwgcHVzaCBvZiBvYmplY3RzIHRvIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVzaE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHQnd29yZHByZXNzX2lkJzogd29yZHByZXNzSWQsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9ICk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0cyBmcm9tIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVsbE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZCxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdFx0fTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuICovXG5mdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHQnbWFwcGluZ19pZCc6IG1hcHBpbmdJZFxuXHR9O1xuXHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cbiAqL1xuZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdH07XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBwbHVnaW4gY2FjaGUgYnV0dG9uXG4gKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdHB1c2hPYmplY3RzKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHNcblx0cHVsbE9iamVjdHMoKTtcbn0gKTtcbiIsIi8qKlxuICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiAqL1xuZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0fVxuXHR9XG59XG5cbi8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG5cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcbiJdfQ==
=======
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJmaWVsZExhYmVsIiwibGFiZWwiLCJuYW1lIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImJ1dHRvbiIsInNhbGVzZm9yY2VPYmplY3QiLCJ3b3JkcHJlc3NPYmplY3QiLCJuZXdLZXkiLCJEYXRlIiwiZ2V0VVRDTWlsbGlzZWNvbmRzIiwibGFzdFJvdyIsImxhc3QiLCJvbGRLZXkiLCJhdHRyIiwiUmVnRXhwIiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicHJlcGVuZCIsIm5leHRSb3ciLCJlbmQiLCJjbG9uZSIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsImRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzIiwic2VsZWN0IiwiYWxsU2VsZWN0ZWQiLCJmaWVsZENob2ljZSIsInNlbGVjdGVkVmFsdWUiLCJwdXNoIiwiZmlsdGVyIiwidiIsImEiLCJpbmRleE9mIiwicmVtb3ZlUHJvcCIsInByb3AiLCJwdXNoT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJwdWxsT2JqZWN0cyIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJjbGljayIsIm1lc3NhZ2UiLCJkZWxldGVSZXN0QXBpVmVyc2lvbk9wdGlvbiIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVNBLHNCQUFULEdBQWtDO0VBRWpDLElBQUlDLEtBQUssR0FBSyxZQUFXO0lBQ3hCLElBQUlDLEtBQUssR0FBRyxDQUFaO0lBQ0EsT0FBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtNQUMvQkMsWUFBWSxDQUFHSCxLQUFILENBQVo7TUFDQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtJQUNBLENBSEQ7RUFJQSxDQU5hLEVBQWQ7O0VBUUEsSUFBSyxNQUFNRyxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0Q0MsTUFBdkQsRUFBZ0U7SUFDL0RELENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDRSxJQUF4QztFQUNBOztFQUVELElBQUssTUFBTUYsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkNDLE1BQXRELEVBQStEO0lBQzlE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Q0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxLQUFkLENBQXFCLFlBQVc7RUFFL0I7RUFDQXFFLGtCQUFrQixHQUhhLENBSy9COztFQUNBRywwQkFBMEIsR0FOSyxDQVEvQjs7RUFDQWYsV0FBVyxHQVRvQixDQVcvQjs7RUFDQU0sV0FBVztBQUNYLENBYkQ7OztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQSxTQUFTVSxnQkFBVCxHQUE0QjtFQUMzQixJQUFLLElBQUlwRyxDQUFDLENBQUUseUNBQUYsQ0FBRCxDQUErQ0MsTUFBeEQsRUFBaUU7SUFDaEUsSUFBS0QsQ0FBQyxDQUFFLCtDQUFGLENBQUQsQ0FBcURxRyxFQUFyRCxDQUF5RCxVQUF6RCxDQUFMLEVBQTZFO01BQzVFckcsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0RzQixJQUFsRDtJQUNBLENBRkQsTUFFTztNQUNOdEIsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0RFLElBQWxEO0lBQ0E7RUFDRDtBQUNELEMsQ0FFRDs7O0FBQ0FGLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjdkIsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQ0FBNUIsRUFBNkUsWUFBVztFQUN2RmlHLGdCQUFnQjtBQUNoQixDQUZEO0FBSUFwRyxDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0VBRS9CO0VBQ0F5RSxnQkFBZ0I7QUFDaEIsQ0FKRCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cbiAqIFRoaXMgYWxzbyBnZW5lcmF0ZXMgb3RoZXIgcXVlcnkgZmllbGRzIHRoYXQgYXJlIG9iamVjdC1zcGVjaWZpYywgbGlrZSBkYXRlIGZpZWxkcywgcmVjb3JkIHR5cGVzIGFsbG93ZWQsIGV0Yy5cbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aW1lciA9IDA7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHR9O1xuXHR9KCkgKTtcblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdH1cblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHR9XG5cdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdH1cblxuXHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0J2ZpZWxkX3R5cGUnOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnOiB0aGF0LnZhbHVlXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJztcblx0XHRcdFx0dmFyIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciBkYXRlTWFya3VwID0gJyc7XG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHZhciBmaWVsZExhYmVsID0gJyc7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUubGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5sYWJlbDtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5uYW1lO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyBmaWVsZExhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0sIGRlbGF5VGltZSApO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlc3BvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0RmllbGQgPSAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnO1xuXHR2YXIgZmllbGRzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmaWVsZHM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHR2YXIgZmllbGRMYWJlbCA9ICcnO1xuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZS5sYWJlbCApIHtcblx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5sYWJlbDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLm5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyBmaWVsZExhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdCQoIHNlbGVjdEZpZWxkICkuaHRtbCggZmllbGRzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKSApO1xufSApO1xuIiwiXG4vKipcbiAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICovXG4gZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCBidXR0b24gKSB7XG5cdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdGJ1dHRvbi5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdGJ1dHRvbi50ZXh0KCBidXR0b24uZGF0YSggJ2FkZC1tb3JlJyApICk7XG5cdH0gZWxzZSB7XG5cdFx0YnV0dG9uLnRleHQoIGJ1dHRvbi5kYXRhKCAnYWRkLWZpcnN0JyApICk7XG5cdFx0YnV0dG9uLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj4nICsgYnV0dG9uLmRhdGEoICdlcnJvci1taXNzaW5nLW9iamVjdCcgKSArICc8L3NwYW4+PC9kaXY+JyApO1xuXHR9XG5cdHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgdGhlIGZpZWxkc2V0IG1hcmt1cCBwcm92aWRlZCBieSB0aGUgc2VydmVyLXNpZGUgdGVtcGxhdGUgYW5kIGFwcGVuZHMgaXQgYXQgdGhlIGVuZC5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICogQHBhcmFtIHtzdHJpbmd9IG9sZEtleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIG9mIHRoZSBzZXQgdGhhdCBpcyBiZWluZyBjbG9uZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBuZXdLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBmb3IgdGhlIG9uZSB3ZSdyZSBhcHBlbmRpbmdcbiAqIEBwYXJhbSB7b2JqZWN0fSBsYXN0Um93IHRoZSBsYXN0IHNldCBvZiB0aGUgZmllbGRtYXBcbiAqL1xuZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHR2YXIgbmV4dFJvdyA9ICcnO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MiggJ2Rlc3Ryb3knICkuZW5kKCkuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuZW5kKCkuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuXHR9XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIFdvcmRQcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnLCBmdW5jdGlvbigpIHtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICd3b3JkcHJlc3MnICk7XG59ICk7XG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnLCBmdW5jdGlvbigpIHtcblx0ZGlzYWJsZUFscmVhZHlNYXBwZWRGaWVsZHMoICdzYWxlc2ZvcmNlJyApO1xufSApO1xuXG4vKipcbiAqIERpc2FibGUgZmllbGRzIHRoYXQgYXJlIGFscmVhZHkgbWFwcGVkIGZyb20gYmVpbmcgbWFwcGVkIGFnYWluLlxuICogQHBhcmFtIHtzdHJpbmd9IHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuICovXG5mdW5jdGlvbiBkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggc3lzdGVtICkge1xuXHQvLyBsb2FkIHRoZSBzZWxlY3Qgc3RhdGVtZW50cyBmb3IgU2FsZXNmb3JjZSBvciBXb3JkUHJlc3MuXG5cdHZhciBzZWxlY3QgPSAkKCAnLmZpZWxkbWFwLWRpc2FibGUtbWFwcGVkLWZpZWxkcyAuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCcgKTtcblx0dmFyIGFsbFNlbGVjdGVkID0gW107XG5cdC8vIGFkZCBlYWNoIGN1cnJlbnRseSBzZWxlY3RlZCB2YWx1ZSB0byBhbiBhcnJheSwgdGhlbiBtYWtlIGl0IHVuaXF1ZS5cblx0c2VsZWN0LmVhY2goIGZ1bmN0aW9uKCBpLCBmaWVsZENob2ljZSApIHtcblx0XHR2YXIgc2VsZWN0ZWRWYWx1ZSA9ICQoIGZpZWxkQ2hvaWNlICkuZmluZCggJ29wdGlvbjpzZWxlY3RlZCcgKS52YWwoKTtcblx0XHRpZiAoIG51bGwgIT09IHNlbGVjdGVkVmFsdWUgJiYgJycgIT09IHNlbGVjdGVkVmFsdWUgKSB7XG5cdFx0XHRhbGxTZWxlY3RlZC5wdXNoKCBzZWxlY3RlZFZhbHVlICk7XG5cdFx0fVxuXHR9KTtcblx0YWxsU2VsZWN0ZWQgPSBhbGxTZWxlY3RlZC5maWx0ZXIoKHYsIGksIGEpID0+IGEuaW5kZXhPZih2KSA9PT0gaSk7XG5cdC8vIGRpc2FibGUgdGhlIGl0ZW1zIHRoYXQgYXJlIHNlbGVjdGVkIGluIGFub3RoZXIgc2VsZWN0LCBlbmFibGUgdGhlbSBvdGhlcndpc2UuXG5cdCQoICdvcHRpb24nLCBzZWxlY3QgKS5yZW1vdmVQcm9wKCAnZGlzYWJsZWQnICk7XG5cdCQoICdvcHRpb24nLCBzZWxlY3QgKS5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHQkLmVhY2goIGFsbFNlbGVjdGVkLCBmdW5jdGlvbigga2V5LCB2YWx1ZSApIHtcblx0XHQkKCAnb3B0aW9uW3ZhbHVlPScgKyB2YWx1ZSArICddOm5vdCg6c2VsZWN0ZWQpJywgc2VsZWN0ICkucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHR9ICk7XG5cdC8vIHJlaW5pdGlhbGl6ZSBzZWxlY3QyIGlmIGl0J3MgYWN0aXZlLlxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICcuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nIGJ1dHRvbi5cbiAqIEl0IGR1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cbiAqL1xuICQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcjYWRkLWZpZWxkLW1hcHBpbmcnLCBmdW5jdGlvbigpIHtcblx0YWRkRmllbGRNYXBwaW5nUm93KCAkKCB0aGlzICkgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBEaXNhYmxlIGZpZWxkcyB0aGF0IGFyZSBhbHJlYWR5IHNlbGVjdGVkXG4gKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gZGlzYWJsZSB0aGUgb3B0aW9uIHZhbHVlcyBmb3IgZmllbGRzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gbWFwcGVkLlxuXHRkaXNhYmxlQWxyZWFkeU1hcHBlZEZpZWxkcyggJ3NhbGVzZm9yY2UnICk7XG5cdGRpc2FibGVBbHJlYWR5TWFwcGVkRmllbGRzKCAnd29yZHByZXNzJyApO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdlcnJvcicgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogRGVsZXRlIHRoZSBkZXByZWNhdGVkIHZhbHVlIGZvciBTYWxlc2ZvcmNlIFJFU1QgQVBJIHZlcnNpb24gZnJvbSB0aGUgb3B0aW9ucyB0YWJsZS5cbiAqL1xuZnVuY3Rpb24gZGVsZXRlUmVzdEFwaVZlcnNpb25PcHRpb24oKSB7XG5cdCQoICcjc2FsZXNmb3JjZS1kZWxldGUtcmVzdC1hcGktdmVyc2lvbicgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2RlbGV0ZV9zYWxlc2ZvcmNlX2FwaV92ZXJzaW9uJ1xuXHRcdH07XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBkZWxldGUgbGVnYWN5IG9wdGlvbiB2YWx1ZS5cblx0ZGVsZXRlUmVzdEFwaVZlcnNpb25PcHRpb24oKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
>>>>>>> master
}(jQuery));
