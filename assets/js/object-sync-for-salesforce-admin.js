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
          statusFieldOptions += '<option value="' + value + '">' + value + '</option>';
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
  }

  if (0 < $(allowedTypesFieldGroup + 'input:checked').length) {
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
    return;
  }

  $('.' + allowedTypesContainer + ' input[type="checkbox"]:checked').each(function (index) {
    if (1 === $('.' + allowedTypesContainer + ' input[type="checkbox"]:checked').length) {
      selected = ' selected';
    }

    recordTypeFields += '<option value="' + $(this).val() + '"' + selected + '>' + $(this).closest('label').text() + '</option>';
  });
  $(selectDefaultField).html(recordTypeFields);

  if (1 < $('.' + allowedTypesContainer + ' input[type="checkbox"]:checked').length) {
    selectContainer.removeClass('record-type-default-template');
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
    $('select#sfwp-default-status').select2();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwidG9nZ2xlQ2xhc3MiLCJwdXNoT2JqZWN0cyIsImhpZGUiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInBvc3QiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImRlbGF5IiwicHVsbE9iamVjdHMiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwidGhhdCIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiLCJzaG93Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7QUFNQSxTQUFTQSw2QkFBVCxDQUF3Q0MsZUFBeEMsRUFBeURD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QVhEO0FBWUE7QUFFRDs7Ozs7OztBQUtBbEcsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNFLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBOEUsRUFBQUEsa0JBQWtCLEdBSGEsQ0FLL0I7O0FBQ0FmLEVBQUFBLFdBQVcsR0FOb0IsQ0FRL0I7O0FBQ0FTLEVBQUFBLFdBQVc7QUFDWCxDQVZEOzs7QUNqR0E7OztBQUdBLFNBQVNTLGdCQUFULEdBQTRCO0FBQzNCLE1BQUssSUFBSTdHLENBQUMsQ0FBRSx5Q0FBRixDQUFELENBQStDVyxNQUF4RCxFQUFpRTtBQUNoRSxRQUFLWCxDQUFDLENBQUUsK0NBQUYsQ0FBRCxDQUFxRDhHLEVBQXJELENBQXlELFVBQXpELENBQUwsRUFBNkU7QUFDNUU5RyxNQUFBQSxDQUFDLENBQUUsNENBQUYsQ0FBRCxDQUFrRCtHLElBQWxEO0FBQ0EsS0FGRCxNQUVPO0FBQ04vRyxNQUFBQSxDQUFDLENBQUUsNENBQUYsQ0FBRCxDQUFrRDRGLElBQWxEO0FBQ0E7QUFDRDtBQUNELEMsQ0FFRDs7O0FBQ0E1RixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQ0FBNUIsRUFBNkUsWUFBVztBQUN2RmtGLEVBQUFBLGdCQUFnQjtBQUNoQixDQUZEO0FBSUE3RyxDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0UsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0FpRixFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FKRCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGUgcmVjb3JkIHR5cGUgY2hvaWNlcyBmb3IgdGhlIFdvcmRQcmVzcyBvYmplY3RcbiAqIFRoaXMgaW5jbHVkZXMgcG9zc2libGUgc3RhdHVzZXMgdG8gY2hvb3NlIGZyb20sIGFuZCB3aGV0aGVyIG9yIG5vdCB0aGVyZSBhcmUgZHJhZnRzXG4gKiBAcGFyYW0ge3N0cmluZ30gd29yZHByZXNzT2JqZWN0IHRoZSBXb3JkUHJlc3Mgb2JqZWN0IG5hbWVcbiAqIEBwYXJhbSB7Ym9vbH0gY2hhbmdlIGlzIHRoaXMgYSBjaGFuZ2Ugb3IgYSBwYWdlbG9hZFxuICovXG5mdW5jdGlvbiB3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyggd29yZHByZXNzT2JqZWN0LCBjaGFuZ2UgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0X3dvcmRwcmVzc19vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdCdpbmNsdWRlJzogWyAnc3RhdHVzZXMnLCAnZHJhZnRzJyBdLFxuXHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdH07XG5cblx0Ly8gZm9yIGRlZmF1bHQgc3RhdHVzIHBpY2tlclxuXHR2YXIgc2VsZWN0U3RhdHVzZXNDb250YWluZXIgID0gJy5zZndwLW0td29yZHByZXNzLXN0YXR1c2VzJztcblx0dmFyIHNlbGVjdFN0YXR1c0ZpZWxkID0gJyNzZndwLWRlZmF1bHQtc3RhdHVzJztcblx0dmFyIHN0YXR1c0ZpZWxkT3B0aW9ucyA9ICcnO1xuXHR2YXIgZmlyc3RTdGF0dXNPcHRpb24gPSAkKCBzZWxlY3RTdGF0dXNGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXG5cdC8vIGZvciBkcmFmdCBzZXR0aW5nc1xuXHR2YXIgZHJhZnRDb250YWluZXIgPSAnc2Z3cC1tLXdvcmRwcmVzcy1kcmFmdHMnO1xuXHR2YXIgZHJhZnRGaWVsZEdyb3VwID0gZHJhZnRDb250YWluZXIgKyBkcmFmdENvbnRhaW5lciArICctJyArIHdvcmRwcmVzc09iamVjdCArICcgLnNmd3AtbS1zaW5nbGUtY2hlY2tib3hlcyc7XG5cdHZhciBkcmFmdE9wdGlvbnMgPSAnJztcblx0dmFyIGRyYWZ0TWFya3VwID0gJyc7XG5cblx0Ly8gaGlkZSB0aGUgY29udGFpbmVycyBmaXJzdCBpbiBjYXNlIHRoZXkncmUgZW1wdHlcblx0JCggc2VsZWN0U3RhdHVzZXNDb250YWluZXIgKS5hZGRDbGFzcyggJ3dvcmRwcmVzcy1zdGF0dXNlcy10ZW1wbGF0ZScgKTtcblx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5hZGRDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkuYWRkQ2xhc3MoIGRyYWZ0Q29udGFpbmVyICk7XG5cdGlmICggdHJ1ZSA9PT0gY2hhbmdlICkge1xuXHRcdCQoIGRyYWZ0RmllbGRHcm91cCArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fVxuXG5cdGlmICggJycgIT09ICQoIHNlbGVjdFN0YXR1c0ZpZWxkICkudmFsKCkgKSB7XG5cdFx0JCggc2VsZWN0U3RhdHVzZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3dvcmRwcmVzcy1zdGF0dXNlcy10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRmaXJzdFN0YXR1c09wdGlvbiA9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0U3RhdHVzT3B0aW9uICsgJzwvb3B0aW9uPic7XG5cdFx0c3RhdHVzRmllbGRPcHRpb25zICs9IGZpcnN0U3RhdHVzT3B0aW9uO1xuXHR9XG5cblx0aWYgKCAwIDwgJCggZHJhZnRGaWVsZEdyb3VwICsgJ2lucHV0OmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXdvcmRwcmVzcycgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5zdGF0dXNlcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRzdGF0dXNGaWVsZE9wdGlvbnMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUgKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0JCggc2VsZWN0U3RhdHVzRmllbGQgKS5odG1sKCBzdGF0dXNGaWVsZE9wdGlvbnMgKTtcblx0XHRcdH1cblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZHJhZnRzICkubGVuZ3RoICkge1xuXHRcdFx0XHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci13b3JkcHJlc3MnICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0XHRpZiAoIGZpcnN0U3RhdHVzT3B0aW9uICE9PSBzdGF0dXNGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgaWYgdGhlIFdvcmRQcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB3b3JkcHJlc3NPYmplY3QgPSB0aGlzLnZhbHVlO1xuXHR3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyggd29yZHByZXNzT2JqZWN0LCB0cnVlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBXb3JkUHJlc3MgcmVjb3JkIHR5cGUgc2V0dGluZ3NcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gTG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBmb3IgdGhlIFdvcmRQcmVzcyBvYmplY3Rcblx0d29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoICQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpLCBmYWxzZSApO1xufSApO1xuIiwiLyoqXG4gKiBHZW5lcmF0ZSByZWNvcmQgdHlwZSBjaG9pY2VzIGZvciB0aGUgU2FsZXNmb3JjZSBvYmplY3RcbiAqIFRoaXMgaW5jbHVkZXMgcmVjb3JkIHR5cGVzIGFsbG93ZWQgYW5kIGRhdGUgZmllbGRzLlxuICogQHBhcmFtIHtzdHJpbmd9IHNhbGVzZm9yY2VPYmplY3QgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IG5hbWVcbiAqIEBwYXJhbSB7Ym9vbH0gY2hhbmdlIGlzIHRoaXMgYSBjaGFuZ2Ugb3IgYSBwYWdlbG9hZFxuICovXG5mdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHNhbGVzZm9yY2VPYmplY3QsIGNoYW5nZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHQnZmllbGRfdHlwZSc6ICdkYXRldGltZScsXG5cdFx0J3NhbGVzZm9yY2Vfb2JqZWN0Jzogc2FsZXNmb3JjZU9iamVjdFxuXHR9O1xuXG5cdC8vIGZvciBhbGxvd2VkIHR5cGVzIGFuZCBkZWZhdWx0IHR5cGVcblx0dmFyIGFsbG93ZWRUeXBlc0NvbnRhaW5lciA9ICdzZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCc7XG5cdHZhciBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwID0gJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJy0nICsgc2FsZXNmb3JjZU9iamVjdCArICcgLmNoZWNrYm94ZXMnO1xuXHR2YXIgYWxsb3dlZFR5cGVPcHRpb25zID0gJyc7XG5cdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJztcblx0dmFyIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJyc7XG5cblx0Ly8gZm9yIGRhdGUgZmllbGRzXG5cdHZhciBzZWxlY3REYXRlQ29udGFpbmVyID0gJy5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0dmFyIHNlbGVjdERhdGVGaWVsZCA9ICcjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHQvL3ZhciBzZWxlY3REYXRlRmllbGQgPSAnLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZC0nICsgc2FsZXNmb3JjZU9iamVjdCArICcgI3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0dmFyIGRhdGVGaWVsZE9wdGlvbnMgPSAnJztcblx0dmFyIGZpcnN0RGF0ZU9wdGlvbiA9ICQoIHNlbGVjdERhdGVGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXG5cdC8vIGFkZCB0aGUgU2FsZXNmb3JjZSBvYmplY3Qgd2UncmUgbG9va2luZyBhdCB0byB0aGUgYWxsb3dlZCB0eXBlcyBjb250YWluZXJcblx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkuYXR0ciggJ2NsYXNzJywgJ3Nmd3AtbS1maWVsZG1hcC1zdWJncm91cCAnICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkuYWRkQ2xhc3MoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICctJyArIHNhbGVzZm9yY2VPYmplY3QgKTtcblx0Ly8gaGlkZSB0aGUgY29udGFpbmVycyBmaXJzdCBpbiBjYXNlIHRoZXkncmUgZW1wdHlcblx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLmFkZENsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHRkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzKCk7XG5cdGlmICggdHJ1ZSA9PT0gY2hhbmdlICkge1xuXHRcdCQoIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0JCggc2VsZWN0RGF0ZUZpZWxkICkudmFsKCAnJyApO1xuXHR9XG5cdFxuXHRpZiAoIDAgPCAkKCBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwICsgJ2lucHV0OmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdH1cblxuXHRpZiAoICcnICE9PSAkKCBzZWxlY3REYXRlRmllbGQgKS52YWwoKSApIHtcblx0XHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0Zmlyc3REYXRlT3B0aW9uID0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3REYXRlT3B0aW9uICsgJzwvb3B0aW9uPic7XG5cdFx0ZGF0ZUZpZWxkT3B0aW9ucyArPSBmaXJzdERhdGVPcHRpb247XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItc2FsZXNmb3JjZScgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdGFsbG93ZWRUeXBlT3B0aW9ucyArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHRcdCQoIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgKS5odG1sKCBhbGxvd2VkVHlwZU9wdGlvbnMgKTtcblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICYmICcnICE9PSBkYXRlRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdGRhdGVGaWVsZE9wdGlvbnMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0XHQkKCBzZWxlY3REYXRlRmllbGQgKS5odG1sKCBkYXRlRmllbGRPcHRpb25zICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItc2FsZXNmb3JjZScgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHRcdGlmICggJycgIT09IGFsbG93ZWRUeXBlT3B0aW9ucyApIHtcblx0XHRcdFx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHRcdGlmICggZmlyc3REYXRlT3B0aW9uICE9PSBkYXRlRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQWxsb3cgZm9yIHBpY2tpbmcgdGhlIGRlZmF1bHQgcmVjb3JkIHR5cGUsIHdoZW4gYSBTYWxlc2ZvcmNlIG9iamVjdCBoYXMgcmVjb3JkIHR5cGVzLlxuICovXG5mdW5jdGlvbiBkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKSB7XG5cdHZhciBzZWxlY3RDb250YWluZXIgPSAkKCAnLnNmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnICk7XG5cdHZhciBzZWxlY3REZWZhdWx0RmllbGQgPSAnI3Nmd3Atc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0Jztcblx0dmFyIHJlY29yZFR5cGVGaWVsZHMgPSAnJztcblx0dmFyIGZpcnN0UmVjb3JkVHlwZUZpZWxkID0gJCggc2VsZWN0RGVmYXVsdEZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdHZhciBzZWxlY3RlZCA9ICcnO1xuXHRyZWNvcmRUeXBlRmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0UmVjb3JkVHlwZUZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggMCA9PT0gJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0c2VsZWN0Q29udGFpbmVyLmFkZENsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0XHRyZXR1cm47XG5cdH1cblx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5lYWNoKCBmdW5jdGlvbiggaW5kZXggKSB7XG5cdFx0aWYgKCAxID09PSAkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRcdHNlbGVjdGVkID0gJyBzZWxlY3RlZCc7XG5cdFx0fVxuXHRcdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgJCggdGhpcyApLnZhbCgpICsgJ1wiJyArIHNlbGVjdGVkICsnPicgKyAkKCB0aGlzICkuY2xvc2VzdCggJ2xhYmVsJyApLnRleHQoKSArICc8L29wdGlvbj4nO1xuXHR9ICk7XG5cdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLmh0bWwoIHJlY29yZFR5cGVGaWVsZHMgKTtcblx0aWYgKCAxIDwgJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0c2VsZWN0Q29udGFpbmVyLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0fVxufTtcblxuLy8gbG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBpZiB0aGUgU2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9IHRoaXMudmFsdWU7XG5cdHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggc2FsZXNmb3JjZU9iamVjdCwgdHJ1ZSApO1xufSApO1xuXG4vLyBsb2FkIHJlY29yZCB0eXBlIGRlZmF1bHQgY2hvaWNlcyBpZiB0aGUgYWxsb3dlZCByZWNvcmQgdHlwZXMgY2hhbmdlXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5zZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nLCBmdW5jdGlvbigpIHtcblx0ZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncyggJ3Nmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSByZWNvcmQgdHlwZSBzZXR0aW5nc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBMb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGZvciB0aGUgU2FsZXNmb3JjZSBvYmplY3Rcblx0c2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCksIGZhbHNlICk7XG59ICk7XG4iLCIvKipcbiAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBvYmplY3ROYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIDxzZWxlY3Q+XG4gKi9cbmZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0TmFtZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcydcblx0fTtcblx0dmFyIHNlbGVjdFN5c3RlbUZpZWxkID0gJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0Jztcblx0dmFyIHN5c3RlbUZpZWxkQ2hvaWNlcyA9ICcnO1xuXHR2YXIgZmlyc3RGaWVsZCA9ICQoIHNlbGVjdFN5c3RlbUZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdFN5c3RlbUZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdEZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gc3lzdGVtRmllbGRDaG9pY2VzO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdCQoIHNlbGVjdFN5c3RlbUZpZWxkICkuaHRtbCggc3lzdGVtRmllbGRDaG9pY2VzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzIHdoZW4gdGhlIHBhZ2UgbG9hZHNcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgbmV3S2V5ID0gbmV3IERhdGUoKS5nZXRVVENNaWxsaXNlY29uZHMoKTtcblx0XHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHRcdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0XHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nICk7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIENsb25lcyB0aGUgZmllbGRzZXQgbWFya3VwIHByb3ZpZGVkIGJ5IHRoZSBzZXJ2ZXItc2lkZSB0ZW1wbGF0ZSBhbmQgYXBwZW5kcyBpdCBhdCB0aGUgZW5kLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKiBAcGFyYW0ge3N0cmluZ30gb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHtzdHJpbmd9IG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIHtvYmplY3R9IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuICovXG5mdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdHZhciBuZXh0Um93ID0gJyc7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCAnZGVzdHJveScgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcblx0fVxuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdH0gKTtcblx0fSApO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgYSBmaWVsZCBhY3Rpb24sIGRvbid0IHVzZSB0aGUgZGVmYXVsdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24nLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBlZGl0IG9uIGEgZmllbGQsIHRvZ2dsZSBpdHMgZXhwYW5kZWQgc3RhdHVzXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbi1lZGl0JywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHQkKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLnRvZ2dsZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1leHBhbmRlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGRlbGV0ZSBvbiBhIGZpZWxkLCBvZmZlciB0byBkZWxldGUgaXRcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWRlbGV0ZScsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0Ly8kKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLnRvZ2dsZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1kZWxldGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIEFkZCBuZXcgZmllbGRtYXAgcm93c1xuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3AtZGVmYXVsdC1zdGF0dXMnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLWZvcm0tZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
}(jQuery));
