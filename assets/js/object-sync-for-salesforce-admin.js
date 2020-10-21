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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwidG9nZ2xlQ2xhc3MiLCJwdXNoT2JqZWN0cyIsImhpZGUiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInBvc3QiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImRlbGF5IiwicHVsbE9iamVjdHMiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwidGhhdCIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiLCJzaG93Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVNBLDZCQUFU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Q0FBQyxDQUFFLCtDQUFGLENBQUQsQ0FBcUQ4RyxFQUFyRCxDQUF5RCxVQUF6RCxDQUFMLEVBQTZFO0FBQzVFOUcsTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0QrRyxJQUFsRDtBQUNBLEtBRkQsTUFFTztBQUNOL0csTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0Q0RixJQUFsRDtBQUNBO0FBQ0Q7QUFDRCxDLENBRUQ7OztBQUNBNUYsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNDLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0NBQTVCLEVBQTZFLFlBQVc7QUFDdkZrRixFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FGRDtBQUlBN0csQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNFLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBaUYsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBSkQiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlIHJlY29yZCB0eXBlIGNob2ljZXMgZm9yIHRoZSBXb3JkUHJlc3Mgb2JqZWN0XG4gKiBUaGlzIGluY2x1ZGVzIHBvc3NpYmxlIHN0YXR1c2VzIHRvIGNob29zZSBmcm9tLCBhbmQgd2hldGhlciBvciBub3QgdGhlcmUgYXJlIGRyYWZ0c1xuICogQHBhcmFtIHtzdHJpbmd9IHdvcmRwcmVzc09iamVjdCB0aGUgV29yZFByZXNzIG9iamVjdCBuYW1lXG4gKiBAcGFyYW0ge2Jvb2x9IGNoYW5nZSBpcyB0aGlzIGEgY2hhbmdlIG9yIGEgcGFnZWxvYWRcbiAqL1xuZnVuY3Rpb24gd29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHdvcmRwcmVzc09iamVjdCwgY2hhbmdlICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF93b3JkcHJlc3Nfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHQnaW5jbHVkZSc6IFsgJ3N0YXR1c2VzJywgJ2RyYWZ0cycgXSxcblx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHR9O1xuXG5cdC8vIGZvciBkZWZhdWx0IHN0YXR1cyBwaWNrZXJcblx0dmFyIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICA9ICcuc2Z3cC1tLXdvcmRwcmVzcy1zdGF0dXNlcyc7XG5cdHZhciBzZWxlY3RTdGF0dXNGaWVsZCA9ICcjc2Z3cC1kZWZhdWx0LXN0YXR1cyc7XG5cdHZhciBzdGF0dXNGaWVsZE9wdGlvbnMgPSAnJztcblx0dmFyIGZpcnN0U3RhdHVzT3B0aW9uID0gJCggc2VsZWN0U3RhdHVzRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblxuXHQvLyBmb3IgZHJhZnQgc2V0dGluZ3Ncblx0dmFyIGRyYWZ0Q29udGFpbmVyID0gJ3Nmd3AtbS13b3JkcHJlc3MtZHJhZnRzJztcblx0dmFyIGRyYWZ0RmllbGRHcm91cCA9IGRyYWZ0Q29udGFpbmVyICsgZHJhZnRDb250YWluZXIgKyAnLScgKyB3b3JkcHJlc3NPYmplY3QgKyAnIC5zZndwLW0tc2luZ2xlLWNoZWNrYm94ZXMnO1xuXHR2YXIgZHJhZnRPcHRpb25zID0gJyc7XG5cdHZhciBkcmFmdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGhpZGUgdGhlIGNvbnRhaW5lcnMgZmlyc3QgaW4gY2FzZSB0aGV5J3JlIGVtcHR5XG5cdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkuYWRkQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkuYWRkQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLmFkZENsYXNzKCBkcmFmdENvbnRhaW5lciApO1xuXHRpZiAoIHRydWUgPT09IGNoYW5nZSApIHtcblx0XHQkKCBkcmFmdEZpZWxkR3JvdXAgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH1cblxuXHRpZiAoICcnICE9PSAkKCBzZWxlY3RTdGF0dXNGaWVsZCApLnZhbCgpICkge1xuXHRcdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0Zmlyc3RTdGF0dXNPcHRpb24gPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdFN0YXR1c09wdGlvbiArICc8L29wdGlvbj4nO1xuXHRcdHN0YXR1c0ZpZWxkT3B0aW9ucyArPSBmaXJzdFN0YXR1c09wdGlvbjtcblx0fVxuXG5cdGlmICggMCA8ICQoIGRyYWZ0RmllbGRHcm91cCArICdpbnB1dDpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci13b3JkcHJlc3MnICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzICkubGVuZ3RoICkge1xuXHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0c3RhdHVzRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoIHNlbGVjdFN0YXR1c0ZpZWxkICkuaHRtbCggc3RhdHVzRmllbGRPcHRpb25zICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmRyYWZ0cyApLmxlbmd0aCApIHtcblx0XHRcdFx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItd29yZHByZXNzJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdFx0aWYgKCBmaXJzdFN0YXR1c09wdGlvbiAhPT0gc3RhdHVzRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGlmIHRoZSBXb3JkUHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgd29yZHByZXNzT2JqZWN0ID0gdGhpcy52YWx1ZTtcblx0d29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHdvcmRwcmVzc09iamVjdCwgdHJ1ZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgV29yZFByZXNzIHJlY29yZCB0eXBlIHNldHRpbmdzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIExvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgZm9yIHRoZSBXb3JkUHJlc3Mgb2JqZWN0XG5cdHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCAkKCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS52YWwoKSwgZmFsc2UgKTtcbn0gKTtcbiIsIi8qKlxuICogR2VuZXJhdGUgcmVjb3JkIHR5cGUgY2hvaWNlcyBmb3IgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0XG4gKiBUaGlzIGluY2x1ZGVzIHJlY29yZCB0eXBlcyBhbGxvd2VkIGFuZCBkYXRlIGZpZWxkcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzYWxlc2ZvcmNlT2JqZWN0IHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBuYW1lXG4gKiBAcGFyYW0ge2Jvb2x9IGNoYW5nZSBpcyB0aGlzIGEgY2hhbmdlIG9yIGEgcGFnZWxvYWRcbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCBzYWxlc2ZvcmNlT2JqZWN0LCBjaGFuZ2UgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0J2ZpZWxkX3R5cGUnOiAnZGF0ZXRpbWUnLFxuXHRcdCdzYWxlc2ZvcmNlX29iamVjdCc6IHNhbGVzZm9yY2VPYmplY3Rcblx0fTtcblxuXHQvLyBmb3IgYWxsb3dlZCB0eXBlcyBhbmQgZGVmYXVsdCB0eXBlXG5cdHZhciBhbGxvd2VkVHlwZXNDb250YWluZXIgPSAnc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQnO1xuXHR2YXIgYWxsb3dlZFR5cGVzRmllbGRHcm91cCA9ICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICctJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnIC5jaGVja2JveGVzJztcblx0dmFyIGFsbG93ZWRUeXBlT3B0aW9ucyA9ICcnO1xuXHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXG5cdC8vIGZvciBkYXRlIGZpZWxkc1xuXHR2YXIgc2VsZWN0RGF0ZUNvbnRhaW5lciA9ICcuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBzZWxlY3REYXRlRmllbGQgPSAnI3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0Ly92YXIgc2VsZWN0RGF0ZUZpZWxkID0gJy5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQtJyArIHNhbGVzZm9yY2VPYmplY3QgKyAnICNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdHZhciBkYXRlRmllbGRPcHRpb25zID0gJyc7XG5cdHZhciBmaXJzdERhdGVPcHRpb24gPSAkKCBzZWxlY3REYXRlRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblxuXHQvLyBhZGQgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IHdlJ3JlIGxvb2tpbmcgYXQgdG8gdGhlIGFsbG93ZWQgdHlwZXMgY29udGFpbmVyXG5cdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmF0dHIoICdjbGFzcycsICdzZndwLW0tZmllbGRtYXAtc3ViZ3JvdXAgJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmFkZENsYXNzKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICk7XG5cdC8vIGhpZGUgdGhlIGNvbnRhaW5lcnMgZmlyc3QgaW4gY2FzZSB0aGV5J3JlIGVtcHR5XG5cdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLmFkZENsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5hZGRDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0ZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncygpO1xuXHRpZiAoIHRydWUgPT09IGNoYW5nZSApIHtcblx0XHQkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdCQoIHNlbGVjdERhdGVGaWVsZCApLnZhbCggJycgKTtcblx0XHRpZiAoIDAgPCAkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICsgJ2lucHV0OmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0fVxuXHRcblx0XG5cblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RGF0ZUZpZWxkICkudmFsKCkgKSB7XG5cdFx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdGZpcnN0RGF0ZU9wdGlvbiA9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RGF0ZU9wdGlvbiArICc8L29wdGlvbj4nO1xuXHRcdGRhdGVGaWVsZE9wdGlvbnMgKz0gZmlyc3REYXRlT3B0aW9uO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRhbGxvd2VkVHlwZU9wdGlvbnMgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0XHQkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICkuaHRtbCggYWxsb3dlZFR5cGVPcHRpb25zICk7XG5cdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCAmJiAnJyAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRkYXRlRmllbGRPcHRpb25zICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUZpZWxkICkuaHRtbCggZGF0ZUZpZWxkT3B0aW9ucyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UnICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0XHRpZiAoICcnICE9PSBhbGxvd2VkVHlwZU9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGZpcnN0RGF0ZU9wdGlvbiAhPT0gZGF0ZUZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIEFsbG93IGZvciBwaWNraW5nIHRoZSBkZWZhdWx0IHJlY29yZCB0eXBlLCB3aGVuIGEgU2FsZXNmb3JjZSBvYmplY3QgaGFzIHJlY29yZCB0eXBlcy5cbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncyggYWxsb3dlZFR5cGVzQ29udGFpbmVyICkge1xuXHR2YXIgc2VsZWN0Q29udGFpbmVyID0gJCggJy5zZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0JyApO1xuXHR2YXIgc2VsZWN0RGVmYXVsdEZpZWxkID0gJyNzZndwLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCc7XG5cdHZhciByZWNvcmRUeXBlRmllbGRzID0gJyc7XG5cdHZhciBmaXJzdFJlY29yZFR5cGVGaWVsZCA9ICQoIHNlbGVjdERlZmF1bHRGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXHR2YXIgc2VsZWN0ZWQgPSAnJztcblx0cmVjb3JkVHlwZUZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdFJlY29yZFR5cGVGaWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoIDAgPT09ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdHNlbGVjdENvbnRhaW5lci5hZGRDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkucHJvcCggJ3JlcXVpcmVkJywgZmFsc2UgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS52YWwoJycpO1xuXHRcdHJldHVybjtcblx0fVxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRpZiAoIDEgPT09ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkJztcblx0XHRcdHNlbGVjdENvbnRhaW5lci5hZGRDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0fVxuXHRcdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgJCggdGhpcyApLnZhbCgpICsgJ1wiJyArIHNlbGVjdGVkICsnPicgKyAkKCB0aGlzICkuY2xvc2VzdCggJ2xhYmVsJyApLnRleHQoKSArICc8L29wdGlvbj4nO1xuXHR9ICk7XG5cdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLmh0bWwoIHJlY29yZFR5cGVGaWVsZHMgKTtcblx0aWYgKCAxIDwgJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0c2VsZWN0Q29udGFpbmVyLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS5wcm9wKCAncmVxdWlyZWQnLCB0cnVlICk7XG5cdH1cbn07XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgaWYgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSB0aGlzLnZhbHVlO1xuXHRzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHNhbGVzZm9yY2VPYmplY3QsIHRydWUgKTtcbn0gKTtcblxuLy8gbG9hZCByZWNvcmQgdHlwZSBkZWZhdWx0IGNob2ljZXMgaWYgdGhlIGFsbG93ZWQgcmVjb3JkIHR5cGVzIGNoYW5nZVxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJywgZnVuY3Rpb24oKSB7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoICdzZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2UgcmVjb3JkIHR5cGUgc2V0dGluZ3NcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gTG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBmb3IgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0XG5cdHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpLCBmYWxzZSApO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdE5hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnXG5cdH07XG5cdHZhciBzZWxlY3RTeXN0ZW1GaWVsZCA9ICcuc2Z3cC1maWVsZG1hcC0nICsgc3lzdGVtICsgJy1maWVsZCBzZWxlY3QnO1xuXHR2YXIgc3lzdGVtRmllbGRDaG9pY2VzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0U3lzdGVtRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0U3lzdGVtRmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBzeXN0ZW1GaWVsZENob2ljZXM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0U3lzdGVtRmllbGQgKS5odG1sKCBzeXN0ZW1GaWVsZENob2ljZXMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoICdkZXN0cm95JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5jbG9uZSggdHJ1ZSApO1xuXHR9XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBhIGZpZWxkIGFjdGlvbiwgZG9uJ3QgdXNlIHRoZSBkZWZhdWx0XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbicsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGVkaXQgb24gYSBmaWVsZCwgdG9nZ2xlIGl0cyBleHBhbmRlZCBzdGF0dXNcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWVkaXQnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdCQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWV4cGFuZGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgZGVsZXRlIG9uIGEgZmllbGQsIG9mZmVyIHRvIGRlbGV0ZSBpdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24tZGVsZXRlJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHQvLyQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWRlbGV0ZWQnICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQWRkIG5ldyBmaWVsZG1hcCByb3dzXG4gKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRHVwbGljYXRlIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1kZWZhdWx0LXN0YXR1cycgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLnNmd3AtZmllbGRtYXAtd29yZHByZXNzLWZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLXNhbGVzZm9yY2UtZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
}(jQuery));
