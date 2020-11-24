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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZW5kIiwiY2xvbmUiLCJjb25zb2xlIiwibG9nIiwiaSIsImgiLCJyZXBsYWNlIiwiYXBwZW5kIiwiZXZlbnQiLCJwcmV2ZW50RGVmYXVsdCIsInRvZ2dsZUNsYXNzIiwicHVzaE9iamVjdHMiLCJoaWRlIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJwb3N0IiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJkZWxheSIsInB1bGxPYmplY3RzIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsInRoYXQiLCJtZXNzYWdlIiwidG9nZ2xlU29hcEZpZWxkcyIsImlzIiwic2hvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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TUFBSyxJQUFJL0csQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NXLE1BQXhELEVBQWlFO0FBQ2hFLFFBQUtYLENBQUMsQ0FBRSwrQ0FBRixDQUFELENBQXFEZ0gsRUFBckQsQ0FBeUQsVUFBekQsQ0FBTCxFQUE2RTtBQUM1RWhILE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEaUgsSUFBbEQ7QUFDQSxLQUZELE1BRU87QUFDTmpILE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEOEYsSUFBbEQ7QUFDQTtBQUNEO0FBQ0QsQyxDQUVEOzs7QUFDQTlGLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLFFBQWxCLEVBQTRCLCtDQUE1QixFQUE2RSxZQUFXO0FBQ3ZGb0YsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBRkQ7QUFJQS9HLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjRSxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQW1GLEVBQUFBLGdCQUFnQjtBQUNoQixDQUpEIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHZW5lcmF0ZSByZWNvcmQgdHlwZSBjaG9pY2VzIGZvciB0aGUgV29yZFByZXNzIG9iamVjdFxuICogVGhpcyBpbmNsdWRlcyBwb3NzaWJsZSBzdGF0dXNlcyB0byBjaG9vc2UgZnJvbSwgYW5kIHdoZXRoZXIgb3Igbm90IHRoZXJlIGFyZSBkcmFmdHNcbiAqIEBwYXJhbSB7c3RyaW5nfSB3b3JkcHJlc3NPYmplY3QgdGhlIFdvcmRQcmVzcyBvYmplY3QgbmFtZVxuICogQHBhcmFtIHtib29sfSBjaGFuZ2UgaXMgdGhpcyBhIGNoYW5nZSBvciBhIHBhZ2Vsb2FkXG4gKi9cbmZ1bmN0aW9uIHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCB3b3JkcHJlc3NPYmplY3QsIGNoYW5nZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfd29yZHByZXNzX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0J2luY2x1ZGUnOiBbICdzdGF0dXNlcycsICdkcmFmdHMnIF0sXG5cdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0fTtcblxuXHQvLyBmb3IgZGVmYXVsdCBzdGF0dXMgcGlja2VyXG5cdHZhciBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciAgPSAnLnNmd3AtbS13b3JkcHJlc3Mtc3RhdHVzZXMnO1xuXHR2YXIgc2VsZWN0U3RhdHVzRmllbGQgPSAnI3Nmd3AtZGVmYXVsdC1zdGF0dXMnO1xuXHR2YXIgc3RhdHVzRmllbGRPcHRpb25zID0gJyc7XG5cdHZhciBmaXJzdFN0YXR1c09wdGlvbiA9ICQoIHNlbGVjdFN0YXR1c0ZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cblx0Ly8gZm9yIGRyYWZ0IHNldHRpbmdzXG5cdHZhciBkcmFmdENvbnRhaW5lciA9ICdzZndwLW0td29yZHByZXNzLWRyYWZ0cyc7XG5cdHZhciBkcmFmdEZpZWxkR3JvdXAgPSBkcmFmdENvbnRhaW5lciArIGRyYWZ0Q29udGFpbmVyICsgJy0nICsgd29yZHByZXNzT2JqZWN0ICsgJyAuc2Z3cC1tLXNpbmdsZS1jaGVja2JveGVzJztcblx0dmFyIGRyYWZ0T3B0aW9ucyA9ICcnO1xuXHR2YXIgZHJhZnRNYXJrdXAgPSAnJztcblxuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLmFkZENsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLmFkZENsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5hZGRDbGFzcyggZHJhZnRDb250YWluZXIgKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggZHJhZnRGaWVsZEdyb3VwICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9XG5cblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0U3RhdHVzRmllbGQgKS52YWwoKSApIHtcblx0XHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdGZpcnN0U3RhdHVzT3B0aW9uID0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RTdGF0dXNPcHRpb24gKyAnPC9vcHRpb24+Jztcblx0XHRzdGF0dXNGaWVsZE9wdGlvbnMgKz0gZmlyc3RTdGF0dXNPcHRpb247XG5cdH1cblxuXHRpZiAoIDAgPCAkKCBkcmFmdEZpZWxkR3JvdXAgKyAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItd29yZHByZXNzJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5zdGF0dXNlcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdHN0YXR1c0ZpZWxkT3B0aW9ucyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0XHQkKCBzZWxlY3RTdGF0dXNGaWVsZCApLmh0bWwoIHN0YXR1c0ZpZWxkT3B0aW9ucyApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5kcmFmdHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXdvcmRwcmVzcycgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHRcdGlmICggZmlyc3RTdGF0dXNPcHRpb24gIT09IHN0YXR1c0ZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JCggc2VsZWN0U3RhdHVzZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3dvcmRwcmVzcy1zdGF0dXNlcy10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLy8gbG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBpZiB0aGUgV29yZFByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHdvcmRwcmVzc09iamVjdCA9IHRoaXMudmFsdWU7XG5cdHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCB3b3JkcHJlc3NPYmplY3QsIHRydWUgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFdvcmRQcmVzcyByZWNvcmQgdHlwZSBzZXR0aW5nc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBMb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGZvciB0aGUgV29yZFByZXNzIG9iamVjdFxuXHR3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyggJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCksIGZhbHNlICk7XG59ICk7XG4iLCIvKipcbiAqIEdlbmVyYXRlIHJlY29yZCB0eXBlIGNob2ljZXMgZm9yIHRoZSBTYWxlc2ZvcmNlIG9iamVjdFxuICogVGhpcyBpbmNsdWRlcyByZWNvcmQgdHlwZXMgYWxsb3dlZCBhbmQgZGF0ZSBmaWVsZHMuXG4gKiBAcGFyYW0ge3N0cmluZ30gc2FsZXNmb3JjZU9iamVjdCB0aGUgU2FsZXNmb3JjZSBvYmplY3QgbmFtZVxuICogQHBhcmFtIHtib29sfSBjaGFuZ2UgaXMgdGhpcyBhIGNoYW5nZSBvciBhIHBhZ2Vsb2FkXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggc2FsZXNmb3JjZU9iamVjdCwgY2hhbmdlICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0J2luY2x1ZGUnOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHQnc2FsZXNmb3JjZV9vYmplY3QnOiBzYWxlc2ZvcmNlT2JqZWN0XG5cdH07XG5cblx0Ly8gZm9yIGFsbG93ZWQgdHlwZXMgYW5kIGRlZmF1bHQgdHlwZVxuXHR2YXIgYWxsb3dlZFR5cGVzQ29udGFpbmVyID0gJ3Nmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkJztcblx0dmFyIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgPSAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICsgJyAuY2hlY2tib3hlcyc7XG5cdHZhciBhbGxvd2VkVHlwZU9wdGlvbnMgPSAnJztcblx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnO1xuXHR2YXIgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJztcblxuXHQvLyBmb3IgZGF0ZSBmaWVsZHNcblx0dmFyIHNlbGVjdERhdGVDb250YWluZXIgPSAnLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHR2YXIgc2VsZWN0RGF0ZUZpZWxkID0gJyNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdC8vdmFyIHNlbGVjdERhdGVGaWVsZCA9ICcuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZC5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICsgJyAjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHR2YXIgZGF0ZUZpZWxkT3B0aW9ucyA9ICcnO1xuXHR2YXIgZmlyc3REYXRlT3B0aW9uID0gJCggc2VsZWN0RGF0ZUZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cblx0Ly8gYWRkIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCB3ZSdyZSBsb29raW5nIGF0IHRvIHRoZSBhbGxvd2VkIHR5cGVzIGNvbnRhaW5lclxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hdHRyKCAnY2xhc3MnLCAnc2Z3cC1tLWZpZWxkbWFwLXN1Ymdyb3VwICcgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hZGRDbGFzcyggYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJy0nICsgc2FsZXNmb3JjZU9iamVjdCApO1xuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hZGRDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkuYWRkQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHQkKCBzZWxlY3REYXRlRmllbGQgKS52YWwoICcnICk7XG5cdFx0aWYgKCAwIDwgJCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCArICdpbnB1dDpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdH1cblx0XG5cdFxuXG5cdGlmICggJycgIT09ICQoIHNlbGVjdERhdGVGaWVsZCApLnZhbCgpICkge1xuXHRcdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRmaXJzdERhdGVPcHRpb24gPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdERhdGVPcHRpb24gKyAnPC9vcHRpb24+Jztcblx0XHRkYXRlRmllbGRPcHRpb25zICs9IGZpcnN0RGF0ZU9wdGlvbjtcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci1zYWxlc2ZvcmNlJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0YWxsb3dlZFR5cGVPcHRpb25zICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXHRcdFx0JCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCApLmh0bWwoIGFsbG93ZWRUeXBlT3B0aW9ucyApO1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggJiYgJycgIT09IGRhdGVGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0ZGF0ZUZpZWxkT3B0aW9ucyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoIHNlbGVjdERhdGVGaWVsZCApLmh0bWwoIGRhdGVGaWVsZE9wdGlvbnMgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci1zYWxlc2ZvcmNlJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdFx0aWYgKCAnJyAhPT0gYWxsb3dlZFR5cGVPcHRpb25zICkge1xuXHRcdFx0XHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBmaXJzdERhdGVPcHRpb24gIT09IGRhdGVGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBBbGxvdyBmb3IgcGlja2luZyB0aGUgZGVmYXVsdCByZWNvcmQgdHlwZSwgd2hlbiBhIFNhbGVzZm9yY2Ugb2JqZWN0IGhhcyByZWNvcmQgdHlwZXMuXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApIHtcblx0dmFyIHNlbGVjdENvbnRhaW5lciA9ICQoICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKTtcblx0dmFyIHNlbGVjdERlZmF1bHRGaWVsZCA9ICcjc2Z3cC1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnO1xuXHR2YXIgcmVjb3JkVHlwZUZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RSZWNvcmRUeXBlRmllbGQgPSAkKCBzZWxlY3REZWZhdWx0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0dmFyIHNlbGVjdGVkID0gJyc7XG5cdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RSZWNvcmRUeXBlRmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAwID09PSAkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRzZWxlY3RDb250YWluZXIuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xuXHRcdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLnByb3AoICdyZXF1aXJlZCcsIGZhbHNlICk7XG5cdFx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkudmFsKCcnKTtcblx0XHRyZXR1cm47XG5cdH1cblx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5lYWNoKCBmdW5jdGlvbiggaW5kZXggKSB7XG5cdFx0aWYgKCAxID09PSAkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRcdHNlbGVjdGVkID0gJyBzZWxlY3RlZCc7XG5cdFx0XHRzZWxlY3RDb250YWluZXIuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xuXHRcdH1cblx0XHRyZWNvcmRUeXBlRmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArICQoIHRoaXMgKS52YWwoKSArICdcIicgKyBzZWxlY3RlZCArJz4nICsgJCggdGhpcyApLmNsb3Nlc3QoICdsYWJlbCcgKS50ZXh0KCkgKyAnPC9vcHRpb24+Jztcblx0fSApO1xuXHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS5odG1sKCByZWNvcmRUeXBlRmllbGRzICk7XG5cdGlmICggMSA8ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdHNlbGVjdENvbnRhaW5lci5yZW1vdmVDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkucHJvcCggJ3JlcXVpcmVkJywgdHJ1ZSApO1xuXHR9XG59O1xuXG4vLyBsb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGlmIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gdGhpcy52YWx1ZTtcblx0c2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCBzYWxlc2ZvcmNlT2JqZWN0LCB0cnVlICk7XG59ICk7XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgZGVmYXVsdCBjaG9pY2VzIGlmIHRoZSBhbGxvd2VkIHJlY29yZCB0eXBlcyBjaGFuZ2VcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLnNmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsIGZ1bmN0aW9uKCkge1xuXHRkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzKCAnc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQnICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIHJlY29yZCB0eXBlIHNldHRpbmdzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIExvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgZm9yIHRoZSBTYWxlc2ZvcmNlIG9iamVjdFxuXHRzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoICQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS52YWwoKSwgZmFsc2UgKTtcbn0gKTtcbiIsIi8qKlxuICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuICogQHBhcmFtIHtzdHJpbmd9IHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuICogQHBhcmFtIHtzdHJpbmd9IG9iamVjdE5hbWUgdGhlIHZhbHVlIGZvciB0aGUgb2JqZWN0IG5hbWUgZnJvbSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0U3lzdGVtRmllbGQgPSAnLnNmd3AtZmllbGRtYXAtJyArIHN5c3RlbSArICctZmllbGQgc2VsZWN0Jztcblx0dmFyIHN5c3RlbUZpZWxkQ2hvaWNlcyA9ICcnO1xuXHR2YXIgZmlyc3RGaWVsZCA9ICQoIHNlbGVjdFN5c3RlbUZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdFN5c3RlbUZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdEZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gc3lzdGVtRmllbGRDaG9pY2VzO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdCQoIHNlbGVjdFN5c3RlbUZpZWxkICkuaHRtbCggc3lzdGVtRmllbGRDaG9pY2VzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzIHdoZW4gdGhlIHBhZ2UgbG9hZHNcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgbmV3S2V5ID0gbmV3IERhdGUoKS5nZXRVVENNaWxsaXNlY29uZHMoKTtcblx0XHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHRcdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0XHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nICk7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIENsb25lcyB0aGUgZmllbGRzZXQgbWFya3VwIHByb3ZpZGVkIGJ5IHRoZSBzZXJ2ZXItc2lkZSB0ZW1wbGF0ZSBhbmQgYXBwZW5kcyBpdCBhdCB0aGUgZW5kLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKiBAcGFyYW0ge3N0cmluZ30gb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHtzdHJpbmd9IG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIHtvYmplY3R9IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuICovXG5mdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdHZhciBuZXh0Um93ID0gJyc7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCAnZGVzdHJveScgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcblx0fVxuXHRjb25zb2xlLmxvZygnbmV4dFJvdyBpcyAnICsgbmV4dFJvdyk7XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBhIGZpZWxkIGFjdGlvbiwgZG9uJ3QgdXNlIHRoZSBkZWZhdWx0XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbicsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGVkaXQgb24gYSBmaWVsZCwgdG9nZ2xlIGl0cyBleHBhbmRlZCBzdGF0dXNcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWVkaXQnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdCQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWV4cGFuZGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgZGVsZXRlIG9uIGEgZmllbGQsIG9mZmVyIHRvIGRlbGV0ZSBpdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24tZGVsZXRlJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHQvLyQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWRlbGV0ZWQnICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQWRkIG5ldyBmaWVsZG1hcCByb3dzXG4gKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRHVwbGljYXRlIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1kZWZhdWx0LXN0YXR1cycgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLnNmd3AtZmllbGRtYXAtd29yZHByZXNzLWZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLXNhbGVzZm9yY2UtZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
}(jQuery));
