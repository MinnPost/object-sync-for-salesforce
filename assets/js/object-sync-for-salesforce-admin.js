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
 * Gets information about the Salesforce field based on its value
 * @param {string} salesforceObject the name of the Salesforce object type
 * @param {string} salesforceField the name of the Salesforce field
 * @param {string} key of the fieldmap we're dealing with
 */


function loadSalesforceFieldInfo(salesforceObject, salesforceField, key) {
  var data = {
    'action': 'get_salesforce_field_info',
    'salesforce_object': salesforceObject,
    'salesforce_field': salesforceField
  };
  var dependentTemplateClass = 'sfwp-field-dependent-fields-template';
  $.ajax({
    type: 'POST',
    url: ajaxurl,
    data: data,
    beforeSend: function beforeSend() {
      $('.spinner-salesforce-field-' + key).addClass('is-active');
    },
    success: function success(response) {
      $('.sfwp-field-dependent-fields-' + key).addClass(dependentTemplateClass);

      if ('' !== response.data.type) {
        $('.sfwp-field-dependent-fields-' + key + '.sfwp-field-dependent-fields-' + response.data.type).removeClass(dependentTemplateClass);
      }
    },
    complete: function complete() {
      $('.spinner-salesforce-field-' + key).removeClass('is-active');
    }
  });
} // load available options if the salesforce field changes


$(document).on('change', '[id^=sfwp-salesforce-field-]', function () {
  var salesforceObject = $('select#sfwp-salesforce-object').val();
  var salesforceField = $(this).val();
  var key = $(this).closest('.sfwp-a-fieldmap-values-expanded').data('key');
  loadSalesforceFieldInfo(salesforceObject, salesforceField, key);
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
  var salesforceObject = $('select#sfwp-salesforce-object').val();
  var container = $(this).closest('.sfwp-a-fieldmap-values');
  var key = container.data('key');
  var salesforceField = $('#sfwp-salesforce-field-' + key).val();
  var expandedClass = 'sfwp-a-fieldmap-values-expanded';

  if (false === $(container).hasClass(expandedClass)) {
    loadSalesforceFieldInfo(salesforceObject, salesforceField, key);
  }

  container.toggleClass(expandedClass);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJsb2FkU2FsZXNmb3JjZUZpZWxkSW5mbyIsInNhbGVzZm9yY2VGaWVsZCIsImRlcGVuZGVudFRlbXBsYXRlQ2xhc3MiLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiY29udGFpbmVyIiwiZXhwYW5kZWRDbGFzcyIsImhhc0NsYXNzIiwidG9nZ2xlQ2xhc3MiLCJwdXNoT2JqZWN0cyIsImhpZGUiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInBvc3QiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImRlbGF5IiwicHVsbE9iamVjdHMiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwidGhhdCIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiLCJzaG93Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7QUFNQSxTQUFTQSw2QkFBVCxDQUF3Q0MsZUFBeEMsRUFBeURDLE1BQXpELEVBQWtFO0FBQ2pFLE1BQUlDLElBQUksR0FBRztBQUNWLGNBQVUsa0NBREE7QUFFVixlQUFXLENBQUUsVUFBRixFQUFjLFFBQWQsQ0FGRDtBQUdWLHdCQUFvQkY7QUFIVixHQUFYLENBRGlFLENBT2pFOztBQUNBLE1BQUlHLHVCQUF1QixHQUFJLDRCQUEvQjtBQUNBLE1BQUlDLGlCQUFpQixHQUFHLHNCQUF4QjtBQUNBLE1BQUlDLGtCQUFrQixHQUFHLEVBQXpCO0FBQ0EsTUFBSUMsaUJBQWlCLEdBQUdDLENBQUMsQ0FBRUgsaUJBQWlCLEdBQUcsU0FBdEIsQ0FBRCxDQUFtQ0ksS0FBbkMsR0FBMkNDLElBQTNDLEVBQXhCLENBWGlFLENBYWpFOztBQUNBLE1BQUlDLGNBQWMsR0FBRyx5QkFBckI7QUFDQSxNQUFJQyxlQUFlLEdBQUdELGNBQWMsR0FBR0EsY0FBakIsR0FBa0MsR0FBbEMsR0FBd0NWLGVBQXhDLEdBQTBELDRCQUFoRjtBQUNBLE1BQUlZLFlBQVksR0FBRyxFQUFuQjtBQUNBLE1BQUlDLFdBQVcsR0FBRyxFQUFsQixDQWpCaUUsQ0FtQmpFOztBQUNBTixFQUFBQSxDQUFDLENBQUVKLHVCQUFGLENBQUQsQ0FBNkJXLFFBQTdCLENBQXVDLDZCQUF2QztBQUNBUCxFQUFBQSxDQUFDLENBQUUsTUFBTUcsY0FBUixDQUFELENBQTBCSSxRQUExQixDQUFvQyx3QkFBcEM7QUFDQVAsRUFBQUEsQ0FBQyxDQUFFLE1BQU1HLGNBQVIsQ0FBRCxDQUEwQkksUUFBMUIsQ0FBb0NKLGNBQXBDOztBQUNBLE1BQUssU0FBU1QsTUFBZCxFQUF1QjtBQUN0Qk0sSUFBQUEsQ0FBQyxDQUFFSSxlQUFlLEdBQUcseUJBQXBCLENBQUQsQ0FBaURJLElBQWpELENBQXVELFNBQXZELEVBQWtFLEtBQWxFO0FBQ0E7O0FBRUQsTUFBSyxPQUFPUixDQUFDLENBQUVILGlCQUFGLENBQUQsQ0FBdUJZLEdBQXZCLEVBQVosRUFBMkM7QUFDMUNULElBQUFBLENBQUMsQ0FBRUosdUJBQUYsQ0FBRCxDQUE2QmMsV0FBN0IsQ0FBMEMsNkJBQTFDO0FBQ0EsR0FGRCxNQUVPO0FBQ05YLElBQUFBLGlCQUFpQixHQUFHLHNCQUFzQkEsaUJBQXRCLEdBQTBDLFdBQTlEO0FBQ0FELElBQUFBLGtCQUFrQixJQUFJQyxpQkFBdEI7QUFDQTs7QUFFRCxNQUFLLElBQUlDLENBQUMsQ0FBRUksZUFBZSxHQUFHLGVBQXBCLENBQUQsQ0FBdUNPLE1BQWhELEVBQXlEO0FBQ3hEWCxJQUFBQSxDQUFDLENBQUUsTUFBTUcsY0FBUixDQUFELENBQTBCTyxXQUExQixDQUF1Qyx3QkFBdkM7QUFDQTs7QUFFRFYsRUFBQUEsQ0FBQyxDQUFDWSxJQUFGLENBQVE7QUFDUEMsSUFBQUEsSUFBSSxFQUFFLE1BREM7QUFFUEMsSUFBQUEsR0FBRyxFQUFFQyxPQUZFO0FBR1BwQixJQUFBQSxJQUFJLEVBQUVBLElBSEM7QUFJUHFCLElBQUFBLFVBQVUsRUFBRSxzQkFBVztBQUN0QmhCLE1BQUFBLENBQUMsQ0FBRSxvQkFBRixDQUFELENBQTBCTyxRQUExQixDQUFvQyxXQUFwQztBQUNBLEtBTk07QUFPUFUsSUFBQUEsT0FBTyxFQUFFLGlCQUFVQyxRQUFWLEVBQXFCO0FBQzdCLFVBQUssSUFBSWxCLENBQUMsQ0FBRWtCLFFBQVEsQ0FBQ3ZCLElBQVQsQ0FBY3dCLFFBQWhCLENBQUQsQ0FBNEJSLE1BQXJDLEVBQThDO0FBQzdDWCxRQUFBQSxDQUFDLENBQUNvQixJQUFGLENBQVFGLFFBQVEsQ0FBQ3ZCLElBQVQsQ0FBY3dCLFFBQXRCLEVBQWdDLFVBQVVFLEtBQVYsRUFBaUJDLEtBQWpCLEVBQXlCO0FBQ3hEeEIsVUFBQUEsa0JBQWtCLElBQUksb0JBQW9CdUIsS0FBcEIsR0FBNEIsSUFBNUIsR0FBbUNDLEtBQW5DLEdBQTJDLFdBQWpFO0FBQ0EsU0FGRDtBQUdBdEIsUUFBQUEsQ0FBQyxDQUFFSCxpQkFBRixDQUFELENBQXVCMEIsSUFBdkIsQ0FBNkJ6QixrQkFBN0I7QUFDQTs7QUFDRCxVQUFLLElBQUlFLENBQUMsQ0FBRWtCLFFBQVEsQ0FBQ3ZCLElBQVQsQ0FBYzZCLE1BQWhCLENBQUQsQ0FBMEJiLE1BQW5DLEVBQTRDO0FBQzNDWCxRQUFBQSxDQUFDLENBQUUsTUFBTUcsY0FBUixDQUFELENBQTBCTyxXQUExQixDQUF1Qyx3QkFBdkM7QUFDQTtBQUNELEtBakJNO0FBa0JQZSxJQUFBQSxRQUFRLEVBQUUsb0JBQVc7QUFDcEJ6QixNQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQlUsV0FBMUIsQ0FBdUMsV0FBdkM7O0FBQ0EsVUFBS1gsaUJBQWlCLEtBQUtELGtCQUEzQixFQUFnRDtBQUMvQ0UsUUFBQUEsQ0FBQyxDQUFFSix1QkFBRixDQUFELENBQTZCYyxXQUE3QixDQUEwQyw2QkFBMUM7QUFDQTtBQUNEO0FBdkJNLEdBQVI7QUF5QkEsQyxDQUVEOzs7QUFDQVYsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNDLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsOEJBQTVCLEVBQTRELFlBQVc7QUFDdEUsTUFBSWxDLGVBQWUsR0FBRyxLQUFLNkIsS0FBM0I7QUFDQTlCLEVBQUFBLDZCQUE2QixDQUFFQyxlQUFGLEVBQW1CLElBQW5CLENBQTdCO0FBQ0EsQ0FIRDtBQUtBOzs7OztBQUlBTyxDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0UsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0FwQyxFQUFBQSw2QkFBNkIsQ0FBRVEsQ0FBQyxDQUFFLDhCQUFGLENBQUQsQ0FBb0NTLEdBQXBDLEVBQUYsRUFBNkMsS0FBN0MsQ0FBN0I7QUFDQSxDQUpEOzs7QUNqRkE7Ozs7OztBQU1BLFNBQVNvQiw4QkFBVCxDQUF5Q0MsZ0JBQXpDLEVBQTJEcEMsTUFBM0QsRUFBb0U7QUFDbkUsTUFBSUMsSUFBSSxHQUFHO0FBQ1YsY0FBVSxtQ0FEQTtBQUVWLGVBQVcsQ0FBRSxRQUFGLEVBQVksaUJBQVosQ0FGRDtBQUdWLGtCQUFjLFVBSEo7QUFJVix5QkFBcUJtQztBQUpYLEdBQVgsQ0FEbUUsQ0FRbkU7O0FBQ0EsTUFBSUMscUJBQXFCLEdBQUcsd0NBQTVCO0FBQ0EsTUFBSUMsc0JBQXNCLEdBQUcsTUFBTUQscUJBQU4sR0FBOEIsR0FBOUIsR0FBb0NBLHFCQUFwQyxHQUE0RCxHQUE1RCxHQUFrRUQsZ0JBQWxFLEdBQXFGLGNBQWxIO0FBQ0EsTUFBSUcsa0JBQWtCLEdBQUcsRUFBekI7QUFDQSxNQUFJQyx3QkFBd0IsR0FBRyxFQUEvQjtBQUNBLE1BQUlDLHVCQUF1QixHQUFHLEVBQTlCLENBYm1FLENBZW5FOztBQUNBLE1BQUlDLG1CQUFtQixHQUFHLDRCQUExQjtBQUNBLE1BQUlDLGVBQWUsR0FBRywwQkFBdEIsQ0FqQm1FLENBa0JuRTs7QUFDQSxNQUFJQyxnQkFBZ0IsR0FBRyxFQUF2QjtBQUNBLE1BQUlDLGVBQWUsR0FBR3ZDLENBQUMsQ0FBRXFDLGVBQWUsR0FBRyxTQUFwQixDQUFELENBQWlDcEMsS0FBakMsR0FBeUNDLElBQXpDLEVBQXRCLENBcEJtRSxDQXNCbkU7O0FBQ0FGLEVBQUFBLENBQUMsQ0FBRSxNQUFNK0IscUJBQVIsQ0FBRCxDQUFpQ1MsSUFBakMsQ0FBdUMsT0FBdkMsRUFBZ0QsOEJBQThCVCxxQkFBOUUsRUFBc0d4QixRQUF0RyxDQUFnSHdCLHFCQUFxQixHQUFHLEdBQXhCLEdBQThCRCxnQkFBOUksRUF2Qm1FLENBd0JuRTs7QUFDQTlCLEVBQUFBLENBQUMsQ0FBRSxNQUFNK0IscUJBQVIsQ0FBRCxDQUFpQ3hCLFFBQWpDLENBQTJDLCtCQUEzQztBQUNBUCxFQUFBQSxDQUFDLENBQUVvQyxtQkFBRixDQUFELENBQXlCN0IsUUFBekIsQ0FBbUMsNkJBQW5DO0FBQ0FrQyxFQUFBQSx5QkFBeUI7O0FBQ3pCLE1BQUssU0FBUy9DLE1BQWQsRUFBdUI7QUFDdEJNLElBQUFBLENBQUMsQ0FBRWdDLHNCQUFzQixHQUFHLHlCQUEzQixDQUFELENBQXdEeEIsSUFBeEQsQ0FBOEQsU0FBOUQsRUFBeUUsS0FBekU7QUFDQVIsSUFBQUEsQ0FBQyxDQUFFcUMsZUFBRixDQUFELENBQXFCNUIsR0FBckIsQ0FBMEIsRUFBMUI7O0FBQ0EsUUFBSyxJQUFJVCxDQUFDLENBQUVnQyxzQkFBc0IsR0FBRyxlQUEzQixDQUFELENBQThDckIsTUFBdkQsRUFBZ0U7QUFDL0RYLE1BQUFBLENBQUMsQ0FBRStCLHFCQUFGLENBQUQsQ0FBMkJyQixXQUEzQixDQUF3QywrQkFBeEM7QUFDQTtBQUNELEdBTkQsTUFNTztBQUNOVixJQUFBQSxDQUFDLENBQUUrQixxQkFBRixDQUFELENBQTJCckIsV0FBM0IsQ0FBd0MsK0JBQXhDO0FBQ0E7O0FBSUQsTUFBSyxPQUFPVixDQUFDLENBQUVxQyxlQUFGLENBQUQsQ0FBcUI1QixHQUFyQixFQUFaLEVBQXlDO0FBQ3hDVCxJQUFBQSxDQUFDLENBQUVvQyxtQkFBRixDQUFELENBQXlCMUIsV0FBekIsQ0FBc0MsNkJBQXRDO0FBQ0EsR0FGRCxNQUVPO0FBQ042QixJQUFBQSxlQUFlLEdBQUcsc0JBQXNCQSxlQUF0QixHQUF3QyxXQUExRDtBQUNBRCxJQUFBQSxnQkFBZ0IsSUFBSUMsZUFBcEI7QUFDQTs7QUFFRHZDLEVBQUFBLENBQUMsQ0FBQ1ksSUFBRixDQUFRO0FBQ1BDLElBQUFBLElBQUksRUFBRSxNQURDO0FBRVBDLElBQUFBLEdBQUcsRUFBRUMsT0FGRTtBQUdQcEIsSUFBQUEsSUFBSSxFQUFFQSxJQUhDO0FBSVBxQixJQUFBQSxVQUFVLEVBQUUsc0JBQVc7QUFDdEJoQixNQUFBQSxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQk8sUUFBM0IsQ0FBcUMsV0FBckM7QUFDQSxLQU5NO0FBT1BVLElBQUFBLE9BQU8sRUFBRSxpQkFBVUMsUUFBVixFQUFxQjtBQUM3QixVQUFLLElBQUlsQixDQUFDLENBQUVrQixRQUFRLENBQUN2QixJQUFULENBQWMrQyxlQUFoQixDQUFELENBQW1DL0IsTUFBNUMsRUFBcUQ7QUFDcERYLFFBQUFBLENBQUMsQ0FBQ29CLElBQUYsQ0FBUUYsUUFBUSxDQUFDdkIsSUFBVCxDQUFjK0MsZUFBdEIsRUFBdUMsVUFBVXJCLEtBQVYsRUFBaUJDLEtBQWpCLEVBQXlCO0FBQy9EVyxVQUFBQSxrQkFBa0IsSUFBSSxnRUFBZ0VaLEtBQWhFLEdBQXdFLDBDQUF4RSxHQUFxSEEsS0FBckgsR0FBNkgseUNBQTdILEdBQXlLQSxLQUF6SyxHQUFpTCxLQUFqTCxHQUF5TEMsS0FBekwsR0FBaU0sVUFBdk47QUFDQSxTQUZEO0FBR0E7O0FBQ0R0QixNQUFBQSxDQUFDLENBQUVnQyxzQkFBRixDQUFELENBQTRCVCxJQUE1QixDQUFrQ1Usa0JBQWxDOztBQUNBLFVBQUssSUFBSWpDLENBQUMsQ0FBRWtCLFFBQVEsQ0FBQ3ZCLElBQVQsQ0FBY2dELE1BQWhCLENBQUQsQ0FBMEJoQyxNQUE5QixJQUF3QyxPQUFPMkIsZ0JBQXBELEVBQXVFO0FBQ3RFdEMsUUFBQUEsQ0FBQyxDQUFDb0IsSUFBRixDQUFRRixRQUFRLENBQUN2QixJQUFULENBQWNnRCxNQUF0QixFQUE4QixVQUFVdEIsS0FBVixFQUFpQkMsS0FBakIsRUFBeUI7QUFDdERnQixVQUFBQSxnQkFBZ0IsSUFBSSxvQkFBb0JoQixLQUFLLENBQUNzQixJQUExQixHQUFpQyxJQUFqQyxHQUF3Q3RCLEtBQUssQ0FBQ3VCLEtBQTlDLEdBQXNELFdBQTFFO0FBQ0EsU0FGRDtBQUdBN0MsUUFBQUEsQ0FBQyxDQUFFcUMsZUFBRixDQUFELENBQXFCZCxJQUFyQixDQUEyQmUsZ0JBQTNCO0FBQ0E7QUFDRCxLQXBCTTtBQXFCUGIsSUFBQUEsUUFBUSxFQUFFLG9CQUFXO0FBQ3BCekIsTUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJVLFdBQTNCLENBQXdDLFdBQXhDOztBQUNBLFVBQUssT0FBT3VCLGtCQUFaLEVBQWlDO0FBQ2hDakMsUUFBQUEsQ0FBQyxDQUFFLE1BQU0rQixxQkFBUixDQUFELENBQWlDckIsV0FBakMsQ0FBOEMsK0JBQTlDO0FBQ0E7O0FBQ0QsVUFBSzZCLGVBQWUsS0FBS0QsZ0JBQXpCLEVBQTRDO0FBQzNDdEMsUUFBQUEsQ0FBQyxDQUFFb0MsbUJBQUYsQ0FBRCxDQUF5QjFCLFdBQXpCLENBQXNDLDZCQUF0QztBQUNBO0FBQ0Q7QUE3Qk0sR0FBUjtBQStCQTtBQUVEOzs7OztBQUdBLFNBQVMrQix5QkFBVCxDQUFvQ1YscUJBQXBDLEVBQTREO0FBQzNELE1BQUllLGVBQWUsR0FBRzlDLENBQUMsQ0FBRSx3Q0FBRixDQUF2QjtBQUNBLE1BQUkrQyxrQkFBa0IsR0FBRyxzQ0FBekI7QUFDQSxNQUFJQyxnQkFBZ0IsR0FBRyxFQUF2QjtBQUNBLE1BQUlDLG9CQUFvQixHQUFHakQsQ0FBQyxDQUFFK0Msa0JBQWtCLEdBQUcsU0FBdkIsQ0FBRCxDQUFvQzlDLEtBQXBDLEdBQTRDQyxJQUE1QyxFQUEzQjtBQUNBLE1BQUlnRCxRQUFRLEdBQUcsRUFBZjtBQUNBRixFQUFBQSxnQkFBZ0IsSUFBSSxzQkFBc0JDLG9CQUF0QixHQUE2QyxXQUFqRTs7QUFDQSxNQUFLLE1BQU1qRCxDQUFDLENBQUUsTUFBTStCLHFCQUFOLEdBQThCLGlDQUFoQyxDQUFELENBQXFFcEIsTUFBaEYsRUFBeUY7QUFDeEZtQyxJQUFBQSxlQUFlLENBQUN2QyxRQUFoQixDQUEwQiw4QkFBMUI7QUFDQVAsSUFBQUEsQ0FBQyxDQUFFK0Msa0JBQUYsQ0FBRCxDQUF3QnZDLElBQXhCLENBQThCLFVBQTlCLEVBQTBDLEtBQTFDO0FBQ0E7QUFDQTs7QUFDRFIsRUFBQUEsQ0FBQyxDQUFFLE1BQU0rQixxQkFBTixHQUE4QixpQ0FBaEMsQ0FBRCxDQUFxRVgsSUFBckUsQ0FBMkUsVUFBVUMsS0FBVixFQUFrQjtBQUM1RixRQUFLLE1BQU1yQixDQUFDLENBQUUsTUFBTStCLHFCQUFOLEdBQThCLGlDQUFoQyxDQUFELENBQXFFcEIsTUFBaEYsRUFBeUY7QUFDeEZ1QyxNQUFBQSxRQUFRLEdBQUcsV0FBWDtBQUNBSixNQUFBQSxlQUFlLENBQUN2QyxRQUFoQixDQUEwQiw4QkFBMUI7QUFDQTs7QUFDRHlDLElBQUFBLGdCQUFnQixJQUFJLG9CQUFvQmhELENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVVMsR0FBVixFQUFwQixHQUFzQyxHQUF0QyxHQUE0Q3lDLFFBQTVDLEdBQXNELEdBQXRELEdBQTREbEQsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVbUQsT0FBVixDQUFtQixPQUFuQixFQUE2QmpELElBQTdCLEVBQTVELEdBQWtHLFdBQXRIO0FBQ0EsR0FORDtBQU9BRixFQUFBQSxDQUFDLENBQUUrQyxrQkFBRixDQUFELENBQXdCeEIsSUFBeEIsQ0FBOEJ5QixnQkFBOUI7O0FBQ0EsTUFBSyxJQUFJaEQsQ0FBQyxDQUFFLE1BQU0rQixxQkFBTixHQUE4QixpQ0FBaEMsQ0FBRCxDQUFxRXBCLE1BQTlFLEVBQXVGO0FBQ3RGbUMsSUFBQUEsZUFBZSxDQUFDcEMsV0FBaEIsQ0FBNkIsOEJBQTdCO0FBQ0FWLElBQUFBLENBQUMsQ0FBRStDLGtCQUFGLENBQUQsQ0FBd0J2QyxJQUF4QixDQUE4QixVQUE5QixFQUEwQyxJQUExQztBQUNBO0FBQ0Q7O0FBQUEsQyxDQUVEOztBQUNBUixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQkFBNUIsRUFBNkQsWUFBVztBQUN2RSxNQUFJRyxnQkFBZ0IsR0FBRyxLQUFLUixLQUE1QjtBQUNBTyxFQUFBQSw4QkFBOEIsQ0FBRUMsZ0JBQUYsRUFBb0IsSUFBcEIsQ0FBOUI7QUFDQSxDQUhELEUsQ0FLQTs7QUFDQTlCLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLFFBQWxCLEVBQTRCLGdFQUE1QixFQUE4RixZQUFXO0FBQ3hHYyxFQUFBQSx5QkFBeUIsQ0FBRSx3Q0FBRixDQUF6QjtBQUNBLENBRkQ7QUFJQTs7Ozs7QUFJQXpDLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjRSxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQUMsRUFBQUEsOEJBQThCLENBQUU3QixDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ1MsR0FBckMsRUFBRixFQUE4QyxLQUE5QyxDQUE5QjtBQUNBLENBSkQ7OztBQ2xJQTs7Ozs7QUFLQSxTQUFTMkMsZ0JBQVQsQ0FBMkJDLE1BQTNCLEVBQW1DQyxVQUFuQyxFQUFnRDtBQUMvQyxNQUFJM0QsSUFBSSxHQUFHO0FBQ1YsY0FBVSxTQUFTMEQsTUFBVCxHQUFrQjtBQURsQixHQUFYO0FBR0EsTUFBSUUsaUJBQWlCLEdBQUcsb0JBQW9CRixNQUFwQixHQUE2QixlQUFyRDtBQUNBLE1BQUlHLGtCQUFrQixHQUFHLEVBQXpCO0FBQ0EsTUFBSUMsVUFBVSxHQUFHekQsQ0FBQyxDQUFFdUQsaUJBQWlCLEdBQUcsU0FBdEIsQ0FBRCxDQUFtQ3RELEtBQW5DLEdBQTJDQyxJQUEzQyxFQUFqQjs7QUFDQSxNQUFLLE9BQU9GLENBQUMsQ0FBRXVELGlCQUFGLENBQUQsQ0FBdUI5QyxHQUF2QixFQUFaLEVBQTJDO0FBQzFDO0FBQ0E7O0FBQ0QrQyxFQUFBQSxrQkFBa0IsSUFBSSxzQkFBc0JDLFVBQXRCLEdBQW1DLFdBQXpEOztBQUNBLE1BQUssZ0JBQWdCSixNQUFyQixFQUE4QjtBQUM3QjFELElBQUFBLElBQUksQ0FBQyxrQkFBRCxDQUFKLEdBQTJCMkQsVUFBM0I7QUFDQSxHQUZELE1BRU8sSUFBSyxpQkFBaUJELE1BQXRCLEVBQStCO0FBQ3JDMUQsSUFBQUEsSUFBSSxDQUFDLG1CQUFELENBQUosR0FBNEIyRCxVQUE1QjtBQUNBLEdBRk0sTUFFQTtBQUNOLFdBQU9FLGtCQUFQO0FBQ0E7O0FBRUR4RCxFQUFBQSxDQUFDLENBQUNZLElBQUYsQ0FBUTtBQUNQQyxJQUFBQSxJQUFJLEVBQUUsTUFEQztBQUVQQyxJQUFBQSxHQUFHLEVBQUVDLE9BRkU7QUFHUHBCLElBQUFBLElBQUksRUFBRUEsSUFIQztBQUlQcUIsSUFBQUEsVUFBVSxFQUFFLHNCQUFXO0FBQ3RCaEIsTUFBQUEsQ0FBQyxDQUFFLGNBQWNxRCxNQUFoQixDQUFELENBQTBCOUMsUUFBMUIsQ0FBb0MsV0FBcEM7QUFDQSxLQU5NO0FBT1BVLElBQUFBLE9BQU8sRUFBRSxpQkFBVUMsUUFBVixFQUFxQjtBQUM3QmxCLE1BQUFBLENBQUMsQ0FBQ29CLElBQUYsQ0FBUUYsUUFBUSxDQUFDdkIsSUFBVCxDQUFjZ0QsTUFBdEIsRUFBOEIsVUFBVXRCLEtBQVYsRUFBaUJDLEtBQWpCLEVBQXlCO0FBQ3RELFlBQUssZ0JBQWdCK0IsTUFBckIsRUFBOEI7QUFDN0JHLFVBQUFBLGtCQUFrQixJQUFJLG9CQUFvQmxDLEtBQUssQ0FBQ29DLEdBQTFCLEdBQWdDLElBQWhDLEdBQXVDcEMsS0FBSyxDQUFDb0MsR0FBN0MsR0FBbUQsV0FBekU7QUFDQSxTQUZELE1BRU8sSUFBSyxpQkFBaUJMLE1BQXRCLEVBQStCO0FBQ3JDRyxVQUFBQSxrQkFBa0IsSUFBSSxvQkFBb0JsQyxLQUFLLENBQUNzQixJQUExQixHQUFpQyxJQUFqQyxHQUF3Q3RCLEtBQUssQ0FBQ3VCLEtBQTlDLEdBQXNELFdBQTVFO0FBQ0E7QUFDRCxPQU5EO0FBT0E3QyxNQUFBQSxDQUFDLENBQUV1RCxpQkFBRixDQUFELENBQXVCaEMsSUFBdkIsQ0FBNkJpQyxrQkFBN0I7QUFDQSxLQWhCTTtBQWlCUC9CLElBQUFBLFFBQVEsRUFBRSxvQkFBVztBQUNwQnpCLE1BQUFBLENBQUMsQ0FBRSxjQUFjcUQsTUFBaEIsQ0FBRCxDQUEwQjNDLFdBQTFCLENBQXVDLFdBQXZDO0FBQ0E7QUFuQk0sR0FBUjtBQXFCQSxDLENBRUQ7OztBQUNBVixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsRUFBZCxDQUFrQixRQUFsQixFQUE0Qiw4QkFBNUIsRUFBNEQsWUFBVztBQUN0RSxNQUFJZ0MsT0FBSjtBQUNBUCxFQUFBQSxnQkFBZ0IsQ0FBRSxXQUFGLEVBQWVwRCxDQUFDLENBQUUsSUFBRixDQUFELENBQVVTLEdBQVYsRUFBZixDQUFoQjtBQUNBbUQsRUFBQUEsWUFBWSxDQUFFRCxPQUFGLENBQVo7QUFDQUEsRUFBQUEsT0FBTyxHQUFHRSxVQUFVLENBQUUsWUFBVztBQUNoQzdELElBQUFBLENBQUMsQ0FBRSx1QkFBRixDQUFELENBQTZCOEQsT0FBN0I7QUFDQTlELElBQUFBLENBQUMsQ0FBRSx1QkFBRixDQUFELENBQTZCK0QsR0FBN0IsQ0FBa0Msb0JBQWxDLEVBQXlEQyxNQUF6RDtBQUNBLEdBSG1CLEVBR2pCLElBSGlCLENBQXBCO0FBSUEsQ0FSRCxFLENBVUE7O0FBQ0FoRSxDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQkFBNUIsRUFBNkQsWUFBVztBQUN2RSxNQUFJZ0MsT0FBSjtBQUNBUCxFQUFBQSxnQkFBZ0IsQ0FBRSxZQUFGLEVBQWdCcEQsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVUyxHQUFWLEVBQWhCLENBQWhCO0FBQ0FtRCxFQUFBQSxZQUFZLENBQUVELE9BQUYsQ0FBWjtBQUNBQSxFQUFBQSxPQUFPLEdBQUdFLFVBQVUsQ0FBRSxZQUFXO0FBQ2hDN0QsSUFBQUEsQ0FBQyxDQUFFLHVCQUFGLENBQUQsQ0FBNkI4RCxPQUE3QjtBQUNBOUQsSUFBQUEsQ0FBQyxDQUFFLHVCQUFGLENBQUQsQ0FBNkIrRCxHQUE3QixDQUFrQyxvQkFBbEMsRUFBeURDLE1BQXpEO0FBQ0EsR0FIbUIsRUFHakIsSUFIaUIsQ0FBcEI7QUFJQSxDQVJEO0FBVUE7Ozs7OztBQUtBaEUsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNFLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBd0IsRUFBQUEsZ0JBQWdCLENBQUUsV0FBRixFQUFlcEQsQ0FBQyxDQUFFLDhCQUFGLENBQUQsQ0FBb0NTLEdBQXBDLEVBQWYsQ0FBaEI7QUFDQTJDLEVBQUFBLGdCQUFnQixDQUFFLFlBQUYsRUFBZ0JwRCxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ1MsR0FBckMsRUFBaEIsQ0FBaEI7QUFDQSxDQUxEOzs7QUN6RUE7Ozs7QUFJQyxTQUFTd0Qsa0JBQVQsR0FBOEI7QUFDOUJqRSxFQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQmtFLEtBQTFCLENBQWlDLFlBQVc7QUFDM0MsUUFBSXBDLGdCQUFnQixHQUFHOUIsQ0FBQyxDQUFFLHlCQUFGLENBQUQsQ0FBK0JTLEdBQS9CLEVBQXZCO0FBQ0EsUUFBSWhCLGVBQWUsR0FBR08sQ0FBQyxDQUFFLHdCQUFGLENBQUQsQ0FBOEJTLEdBQTlCLEVBQXRCO0FBQ0EsUUFBSTBELE1BQU0sR0FBRyxJQUFJQyxJQUFKLEdBQVdDLGtCQUFYLEVBQWI7QUFDQSxRQUFJQyxPQUFPLEdBQUd0RSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QnVFLElBQTdCLEVBQWQ7QUFDQSxRQUFJQyxNQUFNLEdBQUdGLE9BQU8sQ0FBQzlCLElBQVIsQ0FBYyxVQUFkLENBQWI7QUFDQWdDLElBQUFBLE1BQU0sR0FBRyxJQUFJQyxNQUFKLENBQVlELE1BQVosRUFBb0IsR0FBcEIsQ0FBVDtBQUNBeEUsSUFBQUEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVRSxJQUFWLENBQWdCLDJCQUFoQjs7QUFDQSxRQUFLLE9BQU9ULGVBQVAsSUFBMEIsT0FBT3FDLGdCQUF0QyxFQUF5RDtBQUN4RDRDLE1BQUFBLGNBQWMsQ0FBRUYsTUFBRixFQUFVTCxNQUFWLEVBQWtCRyxPQUFsQixDQUFkO0FBQ0F0RSxNQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVUyRSxNQUFWLEdBQW1CQyxJQUFuQixDQUF5QixpQkFBekIsRUFBNkNaLE1BQTdDO0FBQ0EsS0FIRCxNQUdPO0FBQ05oRSxNQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVUyRSxNQUFWLEdBQW1CRSxPQUFuQixDQUE0Qix3SUFBNUI7QUFDQTs7QUFDRCxXQUFPLEtBQVA7QUFDQSxHQWZEO0FBZ0JBO0FBRUQ7Ozs7Ozs7OztBQU9BLFNBQVNILGNBQVQsQ0FBeUJGLE1BQXpCLEVBQWlDTCxNQUFqQyxFQUF5Q0csT0FBekMsRUFBbUQ7QUFDbEQsTUFBSVEsT0FBTyxHQUFHLEVBQWQ7O0FBQ0EsTUFBS0MsTUFBTSxDQUFDQyxFQUFQLENBQVVDLE9BQWYsRUFBeUI7QUFDeEJILElBQUFBLE9BQU8sR0FBR1IsT0FBTyxDQUFDTSxJQUFSLENBQWMsUUFBZCxFQUF5QkssT0FBekIsQ0FBa0MsU0FBbEMsRUFBOENDLEdBQTlDLEdBQW9EQyxLQUFwRCxDQUEyRCxJQUEzRCxFQUFrRXpFLFdBQWxFLENBQStFLG1CQUEvRSxDQUFWO0FBQ0EsR0FGRCxNQUVPO0FBQ05vRSxJQUFBQSxPQUFPLEdBQUdSLE9BQU8sQ0FBQ2EsS0FBUixDQUFlLElBQWYsQ0FBVjtBQUNBOztBQUNEbkYsRUFBQUEsQ0FBQyxDQUFFOEUsT0FBRixDQUFELENBQWF0QyxJQUFiLENBQW1CLFVBQW5CLEVBQStCMkIsTUFBL0I7QUFDQW5FLEVBQUFBLENBQUMsQ0FBRThFLE9BQUYsQ0FBRCxDQUFhMUQsSUFBYixDQUFtQixZQUFXO0FBQzdCcEIsSUFBQUEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVdUIsSUFBVixDQUFnQixVQUFVNkQsQ0FBVixFQUFhQyxDQUFiLEVBQWlCO0FBQ2hDLGFBQU9BLENBQUMsQ0FBQ0MsT0FBRixDQUFXZCxNQUFYLEVBQW1CTCxNQUFuQixDQUFQO0FBQ0EsS0FGRDtBQUdBLEdBSkQ7QUFLQW5FLEVBQUFBLENBQUMsQ0FBRSxvQkFBRixDQUFELENBQTBCdUYsTUFBMUIsQ0FBa0NULE9BQWxDOztBQUNBLE1BQUtDLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVQyxPQUFmLEVBQXlCO0FBQ3hCWCxJQUFBQSxPQUFPLENBQUNNLElBQVIsQ0FBYyxRQUFkLEVBQXlCSyxPQUF6QjtBQUNBSCxJQUFBQSxPQUFPLENBQUNGLElBQVIsQ0FBYyxRQUFkLEVBQXlCSyxPQUF6QjtBQUNBO0FBQ0Q7QUFFRDs7Ozs7Ozs7QUFNQyxTQUFTTyx1QkFBVCxDQUFrQzFELGdCQUFsQyxFQUFvRDJELGVBQXBELEVBQXFFL0IsR0FBckUsRUFBMkU7QUFDM0UsTUFBSS9ELElBQUksR0FBRztBQUNWLGNBQXNCLDJCQURaO0FBRVYseUJBQXNCbUMsZ0JBRlo7QUFHVix3QkFBc0IyRDtBQUhaLEdBQVg7QUFLQSxNQUFJQyxzQkFBc0IsR0FBRyxzQ0FBN0I7QUFDQTFGLEVBQUFBLENBQUMsQ0FBQ1ksSUFBRixDQUFRO0FBQ1BDLElBQUFBLElBQUksRUFBRSxNQURDO0FBRVBDLElBQUFBLEdBQUcsRUFBRUMsT0FGRTtBQUdQcEIsSUFBQUEsSUFBSSxFQUFFQSxJQUhDO0FBSVBxQixJQUFBQSxVQUFVLEVBQUUsc0JBQVc7QUFDdEJoQixNQUFBQSxDQUFDLENBQUUsK0JBQStCMEQsR0FBakMsQ0FBRCxDQUF3Q25ELFFBQXhDLENBQWtELFdBQWxEO0FBQ0EsS0FOTTtBQU9QVSxJQUFBQSxPQUFPLEVBQUUsaUJBQVVDLFFBQVYsRUFBcUI7QUFDN0JsQixNQUFBQSxDQUFDLENBQUUsa0NBQWtDMEQsR0FBcEMsQ0FBRCxDQUEyQ25ELFFBQTNDLENBQXFEbUYsc0JBQXJEOztBQUNBLFVBQUssT0FBT3hFLFFBQVEsQ0FBQ3ZCLElBQVQsQ0FBY2tCLElBQTFCLEVBQWlDO0FBQ2hDYixRQUFBQSxDQUFDLENBQUUsa0NBQWtDMEQsR0FBbEMsR0FBd0MsK0JBQXhDLEdBQTBFeEMsUUFBUSxDQUFDdkIsSUFBVCxDQUFja0IsSUFBMUYsQ0FBRCxDQUFrR0gsV0FBbEcsQ0FBK0dnRixzQkFBL0c7QUFDQTtBQUNELEtBWk07QUFhUGpFLElBQUFBLFFBQVEsRUFBRSxvQkFBVztBQUNwQnpCLE1BQUFBLENBQUMsQ0FBRSwrQkFBK0IwRCxHQUFqQyxDQUFELENBQXdDaEQsV0FBeEMsQ0FBcUQsV0FBckQ7QUFDQTtBQWZNLEdBQVI7QUFpQkMsQyxDQUVEOzs7QUFDRFYsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNDLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsOEJBQTVCLEVBQTRELFlBQVc7QUFDdEUsTUFBSUcsZ0JBQWdCLEdBQUc5QixDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ1MsR0FBckMsRUFBdkI7QUFDQSxNQUFJZ0YsZUFBZSxHQUFHekYsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVUyxHQUFWLEVBQXRCO0FBQ0EsTUFBSWlELEdBQUcsR0FBRzFELENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVW1ELE9BQVYsQ0FBbUIsa0NBQW5CLEVBQXdEeEQsSUFBeEQsQ0FBOEQsS0FBOUQsQ0FBVjtBQUNBNkYsRUFBQUEsdUJBQXVCLENBQUUxRCxnQkFBRixFQUFvQjJELGVBQXBCLEVBQXFDL0IsR0FBckMsQ0FBdkI7QUFDQSxDQUxEO0FBT0E7Ozs7QUFHQTFELENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLE9BQWxCLEVBQTJCLDJCQUEzQixFQUF3RCxZQUFXO0FBQ2xFM0IsRUFBQUEsQ0FBQyxDQUFFLDJCQUFGLENBQUQsQ0FBaUMrRCxHQUFqQyxDQUFzQyxJQUF0QyxFQUE2Q3ZELElBQTdDLENBQW1ELFNBQW5ELEVBQThELEtBQTlEO0FBQ0EsQ0FGRDtBQUlBOzs7O0FBR0FSLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLE9BQWxCLEVBQTJCLHNCQUEzQixFQUFtRCxZQUFXO0FBQzdEM0IsRUFBQUEsQ0FBQyxDQUFFLHNCQUFGLENBQUQsQ0FBNEIrRCxHQUE1QixDQUFpQyxJQUFqQyxFQUF3Q3ZELElBQXhDLENBQThDLFNBQTlDLEVBQXlELEtBQXpEO0FBQ0EsQ0FGRDtBQUlBOzs7O0FBR0FSLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLE9BQWxCLEVBQTJCLCtCQUEzQixFQUE0RCxVQUFVZ0UsS0FBVixFQUFrQjtBQUM3RUEsRUFBQUEsS0FBSyxDQUFDQyxjQUFOO0FBQ0EsQ0FGRDtBQUlBOzs7O0FBR0E1RixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsRUFBZCxDQUFrQixPQUFsQixFQUEyQixvQ0FBM0IsRUFBaUUsVUFBVWdFLEtBQVYsRUFBa0I7QUFDbEYsTUFBSTdELGdCQUFnQixHQUFHOUIsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUNTLEdBQXJDLEVBQXZCO0FBQ0EsTUFBSW9GLFNBQVMsR0FBRzdGLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVW1ELE9BQVYsQ0FBbUIseUJBQW5CLENBQWhCO0FBQ0EsTUFBSU8sR0FBRyxHQUFHbUMsU0FBUyxDQUFDbEcsSUFBVixDQUFnQixLQUFoQixDQUFWO0FBQ0EsTUFBSThGLGVBQWUsR0FBR3pGLENBQUMsQ0FBRSw0QkFBNEIwRCxHQUE5QixDQUFELENBQXFDakQsR0FBckMsRUFBdEI7QUFDQSxNQUFJcUYsYUFBYSxHQUFHLGlDQUFwQjs7QUFDQSxNQUFLLFVBQVU5RixDQUFDLENBQUU2RixTQUFGLENBQUQsQ0FBZUUsUUFBZixDQUF5QkQsYUFBekIsQ0FBZixFQUEwRDtBQUN6RE4sSUFBQUEsdUJBQXVCLENBQUUxRCxnQkFBRixFQUFvQjJELGVBQXBCLEVBQXFDL0IsR0FBckMsQ0FBdkI7QUFDQTs7QUFDRG1DLEVBQUFBLFNBQVMsQ0FBQ0csV0FBVixDQUF1QkYsYUFBdkI7QUFDQSxDQVZEO0FBWUE7Ozs7QUFHQTlGLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLE9BQWxCLEVBQTJCLHNDQUEzQixFQUFtRSxVQUFVZ0UsS0FBVixFQUFrQixDQUNwRjtBQUNBLENBRkQ7QUFJQTs7Ozs7O0FBS0EzRixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0UsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0FxQyxFQUFBQSxrQkFBa0IsR0FIYSxDQUsvQjs7QUFDQSxNQUFLYyxNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4QmpGLElBQUFBLENBQUMsQ0FBRSw4QkFBRixDQUFELENBQW9DaUYsT0FBcEM7QUFDQWpGLElBQUFBLENBQUMsQ0FBRSw0QkFBRixDQUFELENBQWtDaUYsT0FBbEM7QUFDQWpGLElBQUFBLENBQUMsQ0FBRSwrQkFBRixDQUFELENBQXFDaUYsT0FBckM7QUFDQWpGLElBQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEaUYsT0FBbEQ7QUFDQWpGLElBQUFBLENBQUMsQ0FBRSxnQ0FBRixDQUFELENBQXNDaUYsT0FBdEM7QUFDQWpGLElBQUFBLENBQUMsQ0FBRSx1Q0FBRixDQUFELENBQTZDaUYsT0FBN0M7QUFDQWpGLElBQUFBLENBQUMsQ0FBRSx3Q0FBRixDQUFELENBQThDaUYsT0FBOUM7QUFDQTtBQUNELENBZkQ7OztBQzNJQTs7O0FBR0EsU0FBU2dCLFdBQVQsR0FBdUI7QUFDdEJqRyxFQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ2tHLElBQXJDOztBQUNBLE1BQUssSUFBSWxHLENBQUMsQ0FBRSx3QkFBRixDQUFELENBQThCVyxNQUF2QyxFQUFnRDtBQUMvQ1gsSUFBQUEsQ0FBQyxDQUFFLDRCQUFGLENBQUQsQ0FBa0MyQixFQUFsQyxDQUFzQyxPQUF0QyxFQUErQyxZQUFXO0FBQ3pELFVBQUlsQyxlQUFlLEdBQUdPLENBQUMsQ0FBRSx3QkFBRixDQUFELENBQThCUyxHQUE5QixFQUF0QjtBQUNBLFVBQUkwRixXQUFXLEdBQUduRyxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQlMsR0FBMUIsRUFBbEI7QUFDQSxVQUFJMkYsWUFBWSxHQUFHcEcsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJTLEdBQTNCLEVBQW5CO0FBQ0EsVUFBSWQsSUFBSSxHQUFHO0FBQ1Ysa0JBQVUsb0JBREE7QUFFViw0QkFBb0JGLGVBRlY7QUFHVix3QkFBZ0IwRyxXQUhOO0FBSVYseUJBQWlCQztBQUpQLE9BQVg7QUFNQXBHLE1BQUFBLENBQUMsQ0FBQ3FHLElBQUYsQ0FBUXRGLE9BQVIsRUFBaUJwQixJQUFqQixFQUF1QixVQUFVdUIsUUFBVixFQUFxQjtBQUMzQyxZQUFLLFNBQVNBLFFBQVEsQ0FBQ0QsT0FBdkIsRUFBaUM7QUFDaENxRixVQUFBQSwyQkFBMkI7QUFDM0J0RyxVQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ3VHLEtBQXJDLENBQTRDdkcsQ0FBQyxDQUFFLHlCQUFGLENBQUQsQ0FBK0J1RyxLQUEvQixLQUF5QyxFQUFyRjtBQUNBdkcsVUFBQUEsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUN1QixJQUFyQyxDQUEyQyxtREFBM0MsRUFBaUdpRixNQUFqRyxHQUEwR0MsS0FBMUcsQ0FBaUgsSUFBakgsRUFBd0gzQyxPQUF4SDtBQUNBO0FBQ0QsT0FORDtBQU9BLGFBQU8sS0FBUDtBQUNBLEtBbEJEO0FBbUJBO0FBQ0Q7QUFFRDs7Ozs7QUFHQSxTQUFTNEMsV0FBVCxHQUF1QjtBQUN0QjFHLEVBQUFBLENBQUMsQ0FBRSwrQkFBRixDQUFELENBQXFDa0csSUFBckM7QUFDQWxHLEVBQUFBLENBQUMsQ0FBRSw4QkFBRixDQUFELENBQW9DMkIsRUFBcEMsQ0FBd0MsT0FBeEMsRUFBaUQsWUFBVztBQUMzRCxRQUFJeUUsWUFBWSxHQUFHcEcsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJTLEdBQTNCLEVBQW5CO0FBQ0EsUUFBSWhCLGVBQWUsR0FBR08sQ0FBQyxDQUFFLHdCQUFGLENBQUQsQ0FBOEJTLEdBQTlCLEVBQXRCO0FBQ0EsUUFBSWQsSUFBSSxHQUFHO0FBQ1YsZ0JBQVUsc0JBREE7QUFFVix1QkFBaUJ5RyxZQUZQO0FBR1YsMEJBQW9CM0c7QUFIVixLQUFYO0FBS0FPLElBQUFBLENBQUMsQ0FBQ3FHLElBQUYsQ0FBUXRGLE9BQVIsRUFBaUJwQixJQUFqQixFQUF1QixVQUFVdUIsUUFBVixFQUFxQjtBQUMzQyxVQUFLLFNBQVNBLFFBQVEsQ0FBQ0QsT0FBdkIsRUFBaUM7QUFDaENxRixRQUFBQSwyQkFBMkI7QUFDM0J0RyxRQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ3VHLEtBQXJDLENBQTRDdkcsQ0FBQyxDQUFFLHlCQUFGLENBQUQsQ0FBK0J1RyxLQUEvQixLQUF5QyxFQUFyRjtBQUNBdkcsUUFBQUEsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUN1QixJQUFyQyxDQUEyQyxxREFBM0MsRUFBbUdpRixNQUFuRyxHQUE0R0MsS0FBNUcsQ0FBbUgsSUFBbkgsRUFBMEgzQyxPQUExSDtBQUNBO0FBQ0QsS0FORDtBQU9BLFdBQU8sS0FBUDtBQUNBLEdBaEJEO0FBaUJBO0FBRUQ7Ozs7O0FBR0EsU0FBU3dDLDJCQUFULEdBQXVDO0FBQ3RDLE1BQUlLLFNBQVMsR0FBRzNHLENBQUMsQ0FBRSxrQkFBRixDQUFELENBQXdCUyxHQUF4QixFQUFoQjtBQUNBLE1BQUlkLElBQUksR0FBRztBQUNWLGNBQVUscUJBREE7QUFFVixrQkFBY2dIO0FBRkosR0FBWDtBQUlBM0csRUFBQUEsQ0FBQyxDQUFDcUcsSUFBRixDQUFRdEYsT0FBUixFQUFpQnBCLElBQWpCLEVBQXVCLFVBQVV1QixRQUFWLEVBQXFCO0FBQzNDLFFBQUssU0FBU0EsUUFBUSxDQUFDRCxPQUF2QixFQUFpQztBQUNoQ2pCLE1BQUFBLENBQUMsQ0FBRSxzQkFBRixDQUFELENBQTRCRSxJQUE1QixDQUFrQ2dCLFFBQVEsQ0FBQ3ZCLElBQVQsQ0FBY2lILGlCQUFoRDtBQUNBNUcsTUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJFLElBQTNCLENBQWlDZ0IsUUFBUSxDQUFDdkIsSUFBVCxDQUFja0gsZ0JBQS9DO0FBQ0E3RyxNQUFBQSxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQkUsSUFBM0IsQ0FBaUNnQixRQUFRLENBQUN2QixJQUFULENBQWNtSCxnQkFBL0M7QUFDQTlHLE1BQUFBLENBQUMsQ0FBRSxjQUFGLENBQUQsQ0FBb0JFLElBQXBCLENBQTBCZ0IsUUFBUSxDQUFDdkIsSUFBVCxDQUFjb0gsU0FBeEM7O0FBQ0EsVUFBSyxRQUFRN0YsUUFBUSxDQUFDdkIsSUFBVCxDQUFjbUgsZ0JBQTNCLEVBQThDO0FBQzdDOUcsUUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJFLElBQTNCLENBQWlDLFNBQWpDO0FBQ0E7QUFDRDtBQUNELEdBVkQ7QUFXQTtBQUVEOzs7OztBQUdBLFNBQVM4RyxrQkFBVCxHQUE4QjtBQUM3QmhILEVBQUFBLENBQUMsQ0FBRSxtQkFBRixDQUFELENBQXlCa0UsS0FBekIsQ0FBZ0MsWUFBVztBQUMxQyxRQUFJdkUsSUFBSSxHQUFHO0FBQ1YsZ0JBQVU7QUFEQSxLQUFYO0FBR0EsUUFBSXNILElBQUksR0FBR2pILENBQUMsQ0FBRSxJQUFGLENBQVo7QUFDQUEsSUFBQUEsQ0FBQyxDQUFDcUcsSUFBRixDQUFRdEYsT0FBUixFQUFpQnBCLElBQWpCLEVBQXVCLFVBQVV1QixRQUFWLEVBQXFCO0FBQzNDLFVBQUssU0FBU0EsUUFBUSxDQUFDRCxPQUFsQixJQUE2QixTQUFTQyxRQUFRLENBQUN2QixJQUFULENBQWNzQixPQUF6RCxFQUFtRTtBQUNsRWdHLFFBQUFBLElBQUksQ0FBQ3RDLE1BQUwsR0FBY3BELElBQWQsQ0FBb0JMLFFBQVEsQ0FBQ3ZCLElBQVQsQ0FBY3VILE9BQWxDLEVBQTRDVixNQUE1QztBQUNBO0FBQ0QsS0FKRDtBQUtBLFdBQU8sS0FBUDtBQUNBLEdBWEQ7QUFZQTtBQUVEOzs7Ozs7O0FBS0F4RyxDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0UsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0FvRixFQUFBQSxrQkFBa0IsR0FIYSxDQUsvQjs7QUFDQWYsRUFBQUEsV0FBVyxHQU5vQixDQVEvQjs7QUFDQVMsRUFBQUEsV0FBVztBQUNYLENBVkQ7OztBQ2pHQTs7O0FBR0EsU0FBU1MsZ0JBQVQsR0FBNEI7QUFDM0IsTUFBSyxJQUFJbkgsQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NXLE1BQXhELEVBQWlFO0FBQ2hFLFFBQUtYLENBQUMsQ0FBRSwrQ0FBRixDQUFELENBQXFEb0gsRUFBckQsQ0FBeUQsVUFBekQsQ0FBTCxFQUE2RTtBQUM1RXBILE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEcUgsSUFBbEQ7QUFDQSxLQUZELE1BRU87QUFDTnJILE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEa0csSUFBbEQ7QUFDQTtBQUNEO0FBQ0QsQyxDQUVEOzs7QUFDQWxHLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxFQUFkLENBQWtCLFFBQWxCLEVBQTRCLCtDQUE1QixFQUE2RSxZQUFXO0FBQ3ZGd0YsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBRkQ7QUFJQW5ILENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjRSxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQXVGLEVBQUFBLGdCQUFnQjtBQUNoQixDQUpEIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHZW5lcmF0ZSByZWNvcmQgdHlwZSBjaG9pY2VzIGZvciB0aGUgV29yZFByZXNzIG9iamVjdFxuICogVGhpcyBpbmNsdWRlcyBwb3NzaWJsZSBzdGF0dXNlcyB0byBjaG9vc2UgZnJvbSwgYW5kIHdoZXRoZXIgb3Igbm90IHRoZXJlIGFyZSBkcmFmdHNcbiAqIEBwYXJhbSB7c3RyaW5nfSB3b3JkcHJlc3NPYmplY3QgdGhlIFdvcmRQcmVzcyBvYmplY3QgbmFtZVxuICogQHBhcmFtIHtib29sfSBjaGFuZ2UgaXMgdGhpcyBhIGNoYW5nZSBvciBhIHBhZ2Vsb2FkXG4gKi9cbmZ1bmN0aW9uIHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCB3b3JkcHJlc3NPYmplY3QsIGNoYW5nZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfd29yZHByZXNzX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0J2luY2x1ZGUnOiBbICdzdGF0dXNlcycsICdkcmFmdHMnIF0sXG5cdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0fTtcblxuXHQvLyBmb3IgZGVmYXVsdCBzdGF0dXMgcGlja2VyXG5cdHZhciBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciAgPSAnLnNmd3AtbS13b3JkcHJlc3Mtc3RhdHVzZXMnO1xuXHR2YXIgc2VsZWN0U3RhdHVzRmllbGQgPSAnI3Nmd3AtZGVmYXVsdC1zdGF0dXMnO1xuXHR2YXIgc3RhdHVzRmllbGRPcHRpb25zID0gJyc7XG5cdHZhciBmaXJzdFN0YXR1c09wdGlvbiA9ICQoIHNlbGVjdFN0YXR1c0ZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cblx0Ly8gZm9yIGRyYWZ0IHNldHRpbmdzXG5cdHZhciBkcmFmdENvbnRhaW5lciA9ICdzZndwLW0td29yZHByZXNzLWRyYWZ0cyc7XG5cdHZhciBkcmFmdEZpZWxkR3JvdXAgPSBkcmFmdENvbnRhaW5lciArIGRyYWZ0Q29udGFpbmVyICsgJy0nICsgd29yZHByZXNzT2JqZWN0ICsgJyAuc2Z3cC1tLXNpbmdsZS1jaGVja2JveGVzJztcblx0dmFyIGRyYWZ0T3B0aW9ucyA9ICcnO1xuXHR2YXIgZHJhZnRNYXJrdXAgPSAnJztcblxuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLmFkZENsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLmFkZENsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5hZGRDbGFzcyggZHJhZnRDb250YWluZXIgKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggZHJhZnRGaWVsZEdyb3VwICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9XG5cblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0U3RhdHVzRmllbGQgKS52YWwoKSApIHtcblx0XHQkKCBzZWxlY3RTdGF0dXNlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnd29yZHByZXNzLXN0YXR1c2VzLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdGZpcnN0U3RhdHVzT3B0aW9uID0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RTdGF0dXNPcHRpb24gKyAnPC9vcHRpb24+Jztcblx0XHRzdGF0dXNGaWVsZE9wdGlvbnMgKz0gZmlyc3RTdGF0dXNPcHRpb247XG5cdH1cblxuXHRpZiAoIDAgPCAkKCBkcmFmdEZpZWxkR3JvdXAgKyAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItd29yZHByZXNzJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5zdGF0dXNlcyApLmxlbmd0aCApIHtcblx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnN0YXR1c2VzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdHN0YXR1c0ZpZWxkT3B0aW9ucyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0XHQkKCBzZWxlY3RTdGF0dXNGaWVsZCApLmh0bWwoIHN0YXR1c0ZpZWxkT3B0aW9ucyApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5kcmFmdHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXdvcmRwcmVzcycgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHRcdGlmICggZmlyc3RTdGF0dXNPcHRpb24gIT09IHN0YXR1c0ZpZWxkT3B0aW9ucyApIHtcblx0XHRcdFx0JCggc2VsZWN0U3RhdHVzZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3dvcmRwcmVzcy1zdGF0dXNlcy10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLy8gbG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBpZiB0aGUgV29yZFByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHdvcmRwcmVzc09iamVjdCA9IHRoaXMudmFsdWU7XG5cdHdvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzKCB3b3JkcHJlc3NPYmplY3QsIHRydWUgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFdvcmRQcmVzcyByZWNvcmQgdHlwZSBzZXR0aW5nc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBMb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGZvciB0aGUgV29yZFByZXNzIG9iamVjdFxuXHR3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyggJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCksIGZhbHNlICk7XG59ICk7XG4iLCIvKipcbiAqIEdlbmVyYXRlIHJlY29yZCB0eXBlIGNob2ljZXMgZm9yIHRoZSBTYWxlc2ZvcmNlIG9iamVjdFxuICogVGhpcyBpbmNsdWRlcyByZWNvcmQgdHlwZXMgYWxsb3dlZCBhbmQgZGF0ZSBmaWVsZHMuXG4gKiBAcGFyYW0ge3N0cmluZ30gc2FsZXNmb3JjZU9iamVjdCB0aGUgU2FsZXNmb3JjZSBvYmplY3QgbmFtZVxuICogQHBhcmFtIHtib29sfSBjaGFuZ2UgaXMgdGhpcyBhIGNoYW5nZSBvciBhIHBhZ2Vsb2FkXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggc2FsZXNmb3JjZU9iamVjdCwgY2hhbmdlICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0J2luY2x1ZGUnOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHQnc2FsZXNmb3JjZV9vYmplY3QnOiBzYWxlc2ZvcmNlT2JqZWN0XG5cdH07XG5cblx0Ly8gZm9yIGFsbG93ZWQgdHlwZXMgYW5kIGRlZmF1bHQgdHlwZVxuXHR2YXIgYWxsb3dlZFR5cGVzQ29udGFpbmVyID0gJ3Nmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkJztcblx0dmFyIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgPSAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICsgJyAuY2hlY2tib3hlcyc7XG5cdHZhciBhbGxvd2VkVHlwZU9wdGlvbnMgPSAnJztcblx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnO1xuXHR2YXIgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJztcblxuXHQvLyBmb3IgZGF0ZSBmaWVsZHNcblx0dmFyIHNlbGVjdERhdGVDb250YWluZXIgPSAnLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHR2YXIgc2VsZWN0RGF0ZUZpZWxkID0gJyNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCc7XG5cdC8vdmFyIHNlbGVjdERhdGVGaWVsZCA9ICcuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZC5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkLScgKyBzYWxlc2ZvcmNlT2JqZWN0ICsgJyAjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHR2YXIgZGF0ZUZpZWxkT3B0aW9ucyA9ICcnO1xuXHR2YXIgZmlyc3REYXRlT3B0aW9uID0gJCggc2VsZWN0RGF0ZUZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cblx0Ly8gYWRkIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCB3ZSdyZSBsb29raW5nIGF0IHRvIHRoZSBhbGxvd2VkIHR5cGVzIGNvbnRhaW5lclxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hdHRyKCAnY2xhc3MnLCAnc2Z3cC1tLWZpZWxkbWFwLXN1Ymdyb3VwICcgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hZGRDbGFzcyggYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJy0nICsgc2FsZXNmb3JjZU9iamVjdCApO1xuXHQvLyBoaWRlIHRoZSBjb250YWluZXJzIGZpcnN0IGluIGNhc2UgdGhleSdyZSBlbXB0eVxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5hZGRDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkuYWRkQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoKTtcblx0aWYgKCB0cnVlID09PSBjaGFuZ2UgKSB7XG5cdFx0JCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHQkKCBzZWxlY3REYXRlRmllbGQgKS52YWwoICcnICk7XG5cdFx0aWYgKCAwIDwgJCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCArICdpbnB1dDpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdCQoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGVzLWFsbG93ZWQtdGVtcGxhdGUnICk7XG5cdH1cblx0XG5cdFxuXG5cdGlmICggJycgIT09ICQoIHNlbGVjdERhdGVGaWVsZCApLnZhbCgpICkge1xuXHRcdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRmaXJzdERhdGVPcHRpb24gPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdERhdGVPcHRpb24gKyAnPC9vcHRpb24+Jztcblx0XHRkYXRlRmllbGRPcHRpb25zICs9IGZpcnN0RGF0ZU9wdGlvbjtcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci1zYWxlc2ZvcmNlJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0YWxsb3dlZFR5cGVPcHRpb25zICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXHRcdFx0JCggYWxsb3dlZFR5cGVzRmllbGRHcm91cCApLmh0bWwoIGFsbG93ZWRUeXBlT3B0aW9ucyApO1xuXHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggJiYgJycgIT09IGRhdGVGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0ZGF0ZUZpZWxkT3B0aW9ucyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoIHNlbGVjdERhdGVGaWVsZCApLmh0bWwoIGRhdGVGaWVsZE9wdGlvbnMgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci1zYWxlc2ZvcmNlJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdFx0aWYgKCAnJyAhPT0gYWxsb3dlZFR5cGVPcHRpb25zICkge1xuXHRcdFx0XHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBmaXJzdERhdGVPcHRpb24gIT09IGRhdGVGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoIHNlbGVjdERhdGVDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3B1bGwtdHJpZ2dlci1maWVsZC10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBBbGxvdyBmb3IgcGlja2luZyB0aGUgZGVmYXVsdCByZWNvcmQgdHlwZSwgd2hlbiBhIFNhbGVzZm9yY2Ugb2JqZWN0IGhhcyByZWNvcmQgdHlwZXMuXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciApIHtcblx0dmFyIHNlbGVjdENvbnRhaW5lciA9ICQoICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKTtcblx0dmFyIHNlbGVjdERlZmF1bHRGaWVsZCA9ICcjc2Z3cC1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnO1xuXHR2YXIgcmVjb3JkVHlwZUZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RSZWNvcmRUeXBlRmllbGQgPSAkKCBzZWxlY3REZWZhdWx0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0dmFyIHNlbGVjdGVkID0gJyc7XG5cdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RSZWNvcmRUeXBlRmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAwID09PSAkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRzZWxlY3RDb250YWluZXIuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xuXHRcdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLnByb3AoICdyZXF1aXJlZCcsIGZhbHNlICk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdCQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkuZWFjaCggZnVuY3Rpb24oIGluZGV4ICkge1xuXHRcdGlmICggMSA9PT0gJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0XHRzZWxlY3RlZCA9ICcgc2VsZWN0ZWQnO1xuXHRcdFx0c2VsZWN0Q29udGFpbmVyLmFkZENsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0XHR9XG5cdFx0cmVjb3JkVHlwZUZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyAkKCB0aGlzICkudmFsKCkgKyAnXCInICsgc2VsZWN0ZWQgKyc+JyArICQoIHRoaXMgKS5jbG9zZXN0KCAnbGFiZWwnICkudGV4dCgpICsgJzwvb3B0aW9uPic7XG5cdH0gKTtcblx0JCggc2VsZWN0RGVmYXVsdEZpZWxkICkuaHRtbCggcmVjb3JkVHlwZUZpZWxkcyApO1xuXHRpZiAoIDEgPCAkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmxlbmd0aCApIHtcblx0XHRzZWxlY3RDb250YWluZXIucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZS1kZWZhdWx0LXRlbXBsYXRlJyApO1xuXHRcdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLnByb3AoICdyZXF1aXJlZCcsIHRydWUgKTtcblx0fVxufTtcblxuLy8gbG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBpZiB0aGUgU2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9IHRoaXMudmFsdWU7XG5cdHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggc2FsZXNmb3JjZU9iamVjdCwgdHJ1ZSApO1xufSApO1xuXG4vLyBsb2FkIHJlY29yZCB0eXBlIGRlZmF1bHQgY2hvaWNlcyBpZiB0aGUgYWxsb3dlZCByZWNvcmQgdHlwZXMgY2hhbmdlXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5zZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nLCBmdW5jdGlvbigpIHtcblx0ZGVmYXVsdFJlY29yZFR5cGVTZXR0aW5ncyggJ3Nmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlcy1hbGxvd2VkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSByZWNvcmQgdHlwZSBzZXR0aW5nc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBMb2FkIHJlY29yZCB0eXBlIHNldHRpbmdzIGZvciB0aGUgU2FsZXNmb3JjZSBvYmplY3Rcblx0c2FsZXNmb3JjZU9iamVjdFJlY29yZFNldHRpbmdzKCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCksIGZhbHNlICk7XG59ICk7XG4iLCIvKipcbiAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBvYmplY3ROYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIDxzZWxlY3Q+XG4gKi9cbmZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0TmFtZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcydcblx0fTtcblx0dmFyIHNlbGVjdFN5c3RlbUZpZWxkID0gJy5zZndwLWZpZWxkbWFwLScgKyBzeXN0ZW0gKyAnLWZpZWxkIHNlbGVjdCc7XG5cdHZhciBzeXN0ZW1GaWVsZENob2ljZXMgPSAnJztcblx0dmFyIGZpcnN0RmllbGQgPSAkKCBzZWxlY3RTeXN0ZW1GaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXHRpZiAoICcnICE9PSAkKCBzZWxlY3RTeXN0ZW1GaWVsZCApLnZhbCgpICkge1xuXHRcdHJldHVybjtcblx0fVxuXHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RGaWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnc2FsZXNmb3JjZV9vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHN5c3RlbUZpZWxkQ2hvaWNlcztcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHQkKCBzZWxlY3RTeXN0ZW1GaWVsZCApLmh0bWwoIHN5c3RlbUZpZWxkQ2hvaWNlcyApO1xuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9XG5cdH0gKTtcbn1cblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgd29yZHByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkcyB3aGVuIHRoZSBwYWdlIGxvYWRzXG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS52YWwoKSApO1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS52YWwoKSApO1xufSApO1xuIiwiXG4vKipcbiAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICovXG4gZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHQkKCAnI2FkZC1maWVsZC1tYXBwaW5nJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdFx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0XHR2YXIgb2xkS2V5ID0gbGFzdFJvdy5hdHRyKCAnZGF0YS1rZXknICk7XG5cdFx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgdGhlIGZpZWxkc2V0IG1hcmt1cCBwcm92aWRlZCBieSB0aGUgc2VydmVyLXNpZGUgdGVtcGxhdGUgYW5kIGFwcGVuZHMgaXQgYXQgdGhlIGVuZC5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICogQHBhcmFtIHtzdHJpbmd9IG9sZEtleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIG9mIHRoZSBzZXQgdGhhdCBpcyBiZWluZyBjbG9uZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBuZXdLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBmb3IgdGhlIG9uZSB3ZSdyZSBhcHBlbmRpbmdcbiAqIEBwYXJhbSB7b2JqZWN0fSBsYXN0Um93IHRoZSBsYXN0IHNldCBvZiB0aGUgZmllbGRtYXBcbiAqL1xuZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHR2YXIgbmV4dFJvdyA9ICcnO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MiggJ2Rlc3Ryb3knICkuZW5kKCkuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmNsb25lKCB0cnVlICk7XG5cdH1cblx0JCggbmV4dFJvdyApLmF0dHIoICdkYXRhLWtleScsIG5ld0tleSApO1xuXHQkKCBuZXh0Um93ICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0JCggdGhpcyApLmh0bWwoIGZ1bmN0aW9uKCBpLCBoICkge1xuXHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHR9ICk7XG5cdH0gKTtcblx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG5leHRSb3cgKTtcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdG5leHRSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBHZXRzIGluZm9ybWF0aW9uIGFib3V0IHRoZSBTYWxlc2ZvcmNlIGZpZWxkIGJhc2VkIG9uIGl0cyB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IHNhbGVzZm9yY2VPYmplY3QgdGhlIG5hbWUgb2YgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBzYWxlc2ZvcmNlRmllbGQgdGhlIG5hbWUgb2YgdGhlIFNhbGVzZm9yY2UgZmllbGRcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgb2YgdGhlIGZpZWxkbWFwIHdlJ3JlIGRlYWxpbmcgd2l0aFxuICovXG4gZnVuY3Rpb24gbG9hZFNhbGVzZm9yY2VGaWVsZEluZm8oIHNhbGVzZm9yY2VPYmplY3QsIHNhbGVzZm9yY2VGaWVsZCwga2V5ICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJyAgICAgICAgICAgIDogJ2dldF9zYWxlc2ZvcmNlX2ZpZWxkX2luZm8nLFxuXHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiBzYWxlc2ZvcmNlT2JqZWN0LFxuXHRcdCdzYWxlc2ZvcmNlX2ZpZWxkJyAgOiBzYWxlc2ZvcmNlRmllbGRcblx0fVxuXHR2YXIgZGVwZW5kZW50VGVtcGxhdGVDbGFzcyA9ICdzZndwLWZpZWxkLWRlcGVuZGVudC1maWVsZHMtdGVtcGxhdGUnO1xuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItc2FsZXNmb3JjZS1maWVsZC0nICsga2V5ICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQkKCAnLnNmd3AtZmllbGQtZGVwZW5kZW50LWZpZWxkcy0nICsga2V5ICkuYWRkQ2xhc3MoIGRlcGVuZGVudFRlbXBsYXRlQ2xhc3MgKTtcblx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEudHlwZSApIHtcblx0XHRcdFx0JCggJy5zZndwLWZpZWxkLWRlcGVuZGVudC1maWVsZHMtJyArIGtleSArICcuc2Z3cC1maWVsZC1kZXBlbmRlbnQtZmllbGRzLScgKyByZXNwb25zZS5kYXRhLnR5cGUgKS5yZW1vdmVDbGFzcyggZGVwZW5kZW50VGVtcGxhdGVDbGFzcyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UtZmllbGQtJyArIGtleSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xuIH1cblxuIC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2UgZmllbGQgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdbaWRePXNmd3Atc2FsZXNmb3JjZS1maWVsZC1dJywgZnVuY3Rpb24oKSB7XG5cdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpO1xuXHR2YXIgc2FsZXNmb3JjZUZpZWxkID0gJCggdGhpcyApLnZhbCgpO1xuXHR2YXIga2V5ID0gJCggdGhpcyApLmNsb3Nlc3QoICcuc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1leHBhbmRlZCcgKS5kYXRhKCAna2V5JyApO1xuXHRsb2FkU2FsZXNmb3JjZUZpZWxkSW5mbyggc2FsZXNmb3JjZU9iamVjdCwgc2FsZXNmb3JjZUZpZWxkLCBrZXkgKTtcbn0pO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgYSBmaWVsZCBhY3Rpb24sIGRvbid0IHVzZSB0aGUgZGVmYXVsdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24nLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBlZGl0IG9uIGEgZmllbGQsIHRvZ2dsZSBpdHMgZXhwYW5kZWQgc3RhdHVzXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbi1lZGl0JywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS52YWwoKTtcblx0dmFyIGNvbnRhaW5lciA9ICQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICk7XG5cdHZhciBrZXkgPSBjb250YWluZXIuZGF0YSggJ2tleScgKTtcblx0dmFyIHNhbGVzZm9yY2VGaWVsZCA9ICQoICcjc2Z3cC1zYWxlc2ZvcmNlLWZpZWxkLScgKyBrZXkgKS52YWwoKTtcblx0dmFyIGV4cGFuZGVkQ2xhc3MgPSAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1leHBhbmRlZCc7XG5cdGlmICggZmFsc2UgPT09ICQoIGNvbnRhaW5lciApLmhhc0NsYXNzKCBleHBhbmRlZENsYXNzICkgKSB7XG5cdFx0bG9hZFNhbGVzZm9yY2VGaWVsZEluZm8oIHNhbGVzZm9yY2VPYmplY3QsIHNhbGVzZm9yY2VGaWVsZCwga2V5ICk7XG5cdH1cblx0Y29udGFpbmVyLnRvZ2dsZUNsYXNzKCBleHBhbmRlZENsYXNzICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBkZWxldGUgb24gYSBmaWVsZCwgb2ZmZXIgdG8gZGVsZXRlIGl0XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbi1kZWxldGUnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdC8vJCggdGhpcyApLmNsb3Nlc3QoICcuc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcycgKS50b2dnbGVDbGFzcyggJ3Nmd3AtYS1maWVsZG1hcC12YWx1ZXMtZGVsZXRlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBBZGQgbmV3IGZpZWxkbWFwIHJvd3NcbiAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEdXBsaWNhdGUgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cblx0Ly8gc2V0dXAgdGhlIHNlbGVjdDIgZmllbGRzIGlmIHRoZSBsaWJyYXJ5IGlzIHByZXNlbnRcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atd29yZHByZXNzLW9iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLWRlZmF1bHQtc3RhdHVzJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuc2Z3cC1maWVsZG1hcC13b3JkcHJlc3MtZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLnNmd3AtZmllbGRtYXAtc2FsZXNmb3JjZS1maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59ICk7XG4iLCIvKipcbiAqIEhhbmRsZSBtYW51YWwgcHVzaCBvZiBvYmplY3RzIHRvIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVzaE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHQnd29yZHByZXNzX2lkJzogd29yZHByZXNzSWQsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9ICk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0cyBmcm9tIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVsbE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZCxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdFx0fTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuICovXG5mdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHQnbWFwcGluZ19pZCc6IG1hcHBpbmdJZFxuXHR9O1xuXHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cbiAqL1xuZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdH07XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBwbHVnaW4gY2FjaGUgYnV0dG9uXG4gKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdHB1c2hPYmplY3RzKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHNcblx0cHVsbE9iamVjdHMoKTtcbn0gKTtcbiIsIi8qKlxuICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiAqL1xuZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0fVxuXHR9XG59XG5cbi8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG5cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcbiJdfQ==
}(jQuery));
