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
 * todo: make this work
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXdvcmRwcmVzcy1vYmplY3QuanMiLCIwMi1zYWxlc2ZvcmNlLW9iamVjdC5qcyIsIjAzLWxvYWQtZmllbGQtb3B0aW9ucy5qcyIsIjA0LWZpZWxkbWFwLXJvd3MuanMiLCIwNS1pbnRlcmZhY2UtYWpheC1ldmVudHMuanMiLCIwNi1zb2FwLmpzIl0sIm5hbWVzIjpbIndvcmRwcmVzc09iamVjdFJlY29yZFNldHRpbmdzIiwid29yZHByZXNzT2JqZWN0IiwiY2hhbmdlIiwiZGF0YSIsInNlbGVjdFN0YXR1c2VzQ29udGFpbmVyIiwic2VsZWN0U3RhdHVzRmllbGQiLCJzdGF0dXNGaWVsZE9wdGlvbnMiLCJmaXJzdFN0YXR1c09wdGlvbiIsIiQiLCJmaXJzdCIsInRleHQiLCJkcmFmdENvbnRhaW5lciIsImRyYWZ0RmllbGRHcm91cCIsImRyYWZ0T3B0aW9ucyIsImRyYWZ0TWFya3VwIiwiYWRkQ2xhc3MiLCJwcm9wIiwidmFsIiwicmVtb3ZlQ2xhc3MiLCJsZW5ndGgiLCJhamF4IiwidHlwZSIsInVybCIsImFqYXh1cmwiLCJiZWZvcmVTZW5kIiwic3VjY2VzcyIsInJlc3BvbnNlIiwic3RhdHVzZXMiLCJlYWNoIiwiaW5kZXgiLCJ2YWx1ZSIsImh0bWwiLCJkcmFmdHMiLCJjb21wbGV0ZSIsImRvY3VtZW50Iiwib24iLCJyZWFkeSIsInNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyIsInNhbGVzZm9yY2VPYmplY3QiLCJhbGxvd2VkVHlwZXNDb250YWluZXIiLCJhbGxvd2VkVHlwZXNGaWVsZEdyb3VwIiwiYWxsb3dlZFR5cGVPcHRpb25zIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJzZWxlY3REYXRlQ29udGFpbmVyIiwic2VsZWN0RGF0ZUZpZWxkIiwiZGF0ZUZpZWxkT3B0aW9ucyIsImZpcnN0RGF0ZU9wdGlvbiIsImF0dHIiLCJkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzIiwicmVjb3JkVHlwZUluZm9zIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2VsZWN0Q29udGFpbmVyIiwic2VsZWN0RGVmYXVsdEZpZWxkIiwicmVjb3JkVHlwZUZpZWxkcyIsImZpcnN0UmVjb3JkVHlwZUZpZWxkIiwic2VsZWN0ZWQiLCJjbG9zZXN0IiwibG9hZEZpZWxkT3B0aW9ucyIsInN5c3RlbSIsIm9iamVjdE5hbWUiLCJzZWxlY3RTeXN0ZW1GaWVsZCIsInN5c3RlbUZpZWxkQ2hvaWNlcyIsImZpcnN0RmllbGQiLCJrZXkiLCJ0aW1lb3V0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJub3QiLCJyZW1vdmUiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJsb2FkU2FsZXNmb3JjZUZpZWxkSW5mbyIsInNhbGVzZm9yY2VGaWVsZCIsImRlcGVuZGVudFRlbXBsYXRlQ2xhc3MiLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiY29udGFpbmVyIiwiZXhwYW5kZWRDbGFzcyIsImhhc0NsYXNzIiwidG9nZ2xlQ2xhc3MiLCJwdXNoT2JqZWN0cyIsImhpZGUiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInBvc3QiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImRlbGF5IiwicHVsbE9iamVjdHMiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwi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QUFBQSxnQkFBZ0I7QUFDaEIsQ0FKRCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGUgcmVjb3JkIHR5cGUgY2hvaWNlcyBmb3IgdGhlIFdvcmRQcmVzcyBvYmplY3RcbiAqIFRoaXMgaW5jbHVkZXMgcG9zc2libGUgc3RhdHVzZXMgdG8gY2hvb3NlIGZyb20sIGFuZCB3aGV0aGVyIG9yIG5vdCB0aGVyZSBhcmUgZHJhZnRzXG4gKiBAcGFyYW0ge3N0cmluZ30gd29yZHByZXNzT2JqZWN0IHRoZSBXb3JkUHJlc3Mgb2JqZWN0IG5hbWVcbiAqIEBwYXJhbSB7Ym9vbH0gY2hhbmdlIGlzIHRoaXMgYSBjaGFuZ2Ugb3IgYSBwYWdlbG9hZFxuICovXG5mdW5jdGlvbiB3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyggd29yZHByZXNzT2JqZWN0LCBjaGFuZ2UgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0X3dvcmRwcmVzc19vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdCdpbmNsdWRlJzogWyAnc3RhdHVzZXMnLCAnZHJhZnRzJyBdLFxuXHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdH07XG5cblx0Ly8gZm9yIGRlZmF1bHQgc3RhdHVzIHBpY2tlclxuXHR2YXIgc2VsZWN0U3RhdHVzZXNDb250YWluZXIgID0gJy5zZndwLW0td29yZHByZXNzLXN0YXR1c2VzJztcblx0dmFyIHNlbGVjdFN0YXR1c0ZpZWxkID0gJyNzZndwLWRlZmF1bHQtc3RhdHVzJztcblx0dmFyIHN0YXR1c0ZpZWxkT3B0aW9ucyA9ICcnO1xuXHR2YXIgZmlyc3RTdGF0dXNPcHRpb24gPSAkKCBzZWxlY3RTdGF0dXNGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXG5cdC8vIGZvciBkcmFmdCBzZXR0aW5nc1xuXHR2YXIgZHJhZnRDb250YWluZXIgPSAnc2Z3cC1tLXdvcmRwcmVzcy1kcmFmdHMnO1xuXHR2YXIgZHJhZnRGaWVsZEdyb3VwID0gZHJhZnRDb250YWluZXIgKyBkcmFmdENvbnRhaW5lciArICctJyArIHdvcmRwcmVzc09iamVjdCArICcgLnNmd3AtbS1zaW5nbGUtY2hlY2tib3hlcyc7XG5cdHZhciBkcmFmdE9wdGlvbnMgPSAnJztcblx0dmFyIGRyYWZ0TWFya3VwID0gJyc7XG5cblx0Ly8gaGlkZSB0aGUgY29udGFpbmVycyBmaXJzdCBpbiBjYXNlIHRoZXkncmUgZW1wdHlcblx0JCggc2VsZWN0U3RhdHVzZXNDb250YWluZXIgKS5hZGRDbGFzcyggJ3dvcmRwcmVzcy1zdGF0dXNlcy10ZW1wbGF0ZScgKTtcblx0JCggJy4nICsgZHJhZnRDb250YWluZXIgKS5hZGRDbGFzcyggJ3Nmd3AtbS1kcmFmdHMtdGVtcGxhdGUnICk7XG5cdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkuYWRkQ2xhc3MoIGRyYWZ0Q29udGFpbmVyICk7XG5cdGlmICggdHJ1ZSA9PT0gY2hhbmdlICkge1xuXHRcdCQoIGRyYWZ0RmllbGRHcm91cCArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fVxuXG5cdGlmICggJycgIT09ICQoIHNlbGVjdFN0YXR1c0ZpZWxkICkudmFsKCkgKSB7XG5cdFx0JCggc2VsZWN0U3RhdHVzZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3dvcmRwcmVzcy1zdGF0dXNlcy10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRmaXJzdFN0YXR1c09wdGlvbiA9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0U3RhdHVzT3B0aW9uICsgJzwvb3B0aW9uPic7XG5cdFx0c3RhdHVzRmllbGRPcHRpb25zICs9IGZpcnN0U3RhdHVzT3B0aW9uO1xuXHR9XG5cblx0aWYgKCAwIDwgJCggZHJhZnRGaWVsZEdyb3VwICsgJ2lucHV0OmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdCQoICcuJyArIGRyYWZ0Q29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdzZndwLW0tZHJhZnRzLXRlbXBsYXRlJyApO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXdvcmRwcmVzcycgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5zdGF0dXNlcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRzdGF0dXNGaWVsZE9wdGlvbnMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0JCggc2VsZWN0U3RhdHVzRmllbGQgKS5odG1sKCBzdGF0dXNGaWVsZE9wdGlvbnMgKTtcblx0XHRcdH1cblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZHJhZnRzICkubGVuZ3RoICkge1xuXHRcdFx0XHQkKCAnLicgKyBkcmFmdENvbnRhaW5lciApLnJlbW92ZUNsYXNzKCAnc2Z3cC1tLWRyYWZ0cy10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci13b3JkcHJlc3MnICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0XHRpZiAoIGZpcnN0U3RhdHVzT3B0aW9uICE9PSBzdGF0dXNGaWVsZE9wdGlvbnMgKSB7XG5cdFx0XHRcdCQoIHNlbGVjdFN0YXR1c2VzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICd3b3JkcHJlc3Mtc3RhdHVzZXMtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgaWYgdGhlIFdvcmRQcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB3b3JkcHJlc3NPYmplY3QgPSB0aGlzLnZhbHVlO1xuXHR3b3JkcHJlc3NPYmplY3RSZWNvcmRTZXR0aW5ncyggd29yZHByZXNzT2JqZWN0LCB0cnVlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBXb3JkUHJlc3MgcmVjb3JkIHR5cGUgc2V0dGluZ3NcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gTG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBmb3IgdGhlIFdvcmRQcmVzcyBvYmplY3Rcblx0d29yZHByZXNzT2JqZWN0UmVjb3JkU2V0dGluZ3MoICQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpLCBmYWxzZSApO1xufSApO1xuIiwiLyoqXG4gKiBHZW5lcmF0ZSByZWNvcmQgdHlwZSBjaG9pY2VzIGZvciB0aGUgU2FsZXNmb3JjZSBvYmplY3RcbiAqIFRoaXMgaW5jbHVkZXMgcmVjb3JkIHR5cGVzIGFsbG93ZWQgYW5kIGRhdGUgZmllbGRzLlxuICogQHBhcmFtIHtzdHJpbmd9IHNhbGVzZm9yY2VPYmplY3QgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IG5hbWVcbiAqIEBwYXJhbSB7Ym9vbH0gY2hhbmdlIGlzIHRoaXMgYSBjaGFuZ2Ugb3IgYSBwYWdlbG9hZFxuICovXG5mdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHNhbGVzZm9yY2VPYmplY3QsIGNoYW5nZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHQnZmllbGRfdHlwZSc6ICdkYXRldGltZScsXG5cdFx0J3NhbGVzZm9yY2Vfb2JqZWN0Jzogc2FsZXNmb3JjZU9iamVjdFxuXHR9O1xuXG5cdC8vIGZvciBhbGxvd2VkIHR5cGVzIGFuZCBkZWZhdWx0IHR5cGVcblx0dmFyIGFsbG93ZWRUeXBlc0NvbnRhaW5lciA9ICdzZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCc7XG5cdHZhciBhbGxvd2VkVHlwZXNGaWVsZEdyb3VwID0gJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJy0nICsgc2FsZXNmb3JjZU9iamVjdCArICcgLmNoZWNrYm94ZXMnO1xuXHR2YXIgYWxsb3dlZFR5cGVPcHRpb25zID0gJyc7XG5cdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJztcblx0dmFyIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJyc7XG5cblx0Ly8gZm9yIGRhdGUgZmllbGRzXG5cdHZhciBzZWxlY3REYXRlQ29udGFpbmVyID0gJy5zZndwLW0tcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0dmFyIHNlbGVjdERhdGVGaWVsZCA9ICcjc2Z3cC1wdWxsLXRyaWdnZXItZmllbGQnO1xuXHQvL3ZhciBzZWxlY3REYXRlRmllbGQgPSAnLnNmd3AtbS1wdWxsLXRyaWdnZXItZmllbGQuc2Z3cC1tLXB1bGwtdHJpZ2dlci1maWVsZC0nICsgc2FsZXNmb3JjZU9iamVjdCArICcgI3Nmd3AtcHVsbC10cmlnZ2VyLWZpZWxkJztcblx0dmFyIGRhdGVGaWVsZE9wdGlvbnMgPSAnJztcblx0dmFyIGZpcnN0RGF0ZU9wdGlvbiA9ICQoIHNlbGVjdERhdGVGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXG5cdC8vIGFkZCB0aGUgU2FsZXNmb3JjZSBvYmplY3Qgd2UncmUgbG9va2luZyBhdCB0byB0aGUgYWxsb3dlZCB0eXBlcyBjb250YWluZXJcblx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkuYXR0ciggJ2NsYXNzJywgJ3Nmd3AtbS1maWVsZG1hcC1zdWJncm91cCAnICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkuYWRkQ2xhc3MoIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICctJyArIHNhbGVzZm9yY2VPYmplY3QgKTtcblx0Ly8gaGlkZSB0aGUgY29udGFpbmVycyBmaXJzdCBpbiBjYXNlIHRoZXkncmUgZW1wdHlcblx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkuYWRkQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0JCggc2VsZWN0RGF0ZUNvbnRhaW5lciApLmFkZENsYXNzKCAncHVsbC10cmlnZ2VyLWZpZWxkLXRlbXBsYXRlJyApO1xuXHRkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzKCk7XG5cdGlmICggdHJ1ZSA9PT0gY2hhbmdlICkge1xuXHRcdCQoIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0JCggc2VsZWN0RGF0ZUZpZWxkICkudmFsKCAnJyApO1xuXHRcdGlmICggMCA8ICQoIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgKyAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQkKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKS5yZW1vdmVDbGFzcyggJ3JlY29yZC10eXBlcy1hbGxvd2VkLXRlbXBsYXRlJyApO1xuXHR9XG5cdFxuXHRcblxuXHRpZiAoICcnICE9PSAkKCBzZWxlY3REYXRlRmllbGQgKS52YWwoKSApIHtcblx0XHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0Zmlyc3REYXRlT3B0aW9uID0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3REYXRlT3B0aW9uICsgJzwvb3B0aW9uPic7XG5cdFx0ZGF0ZUZpZWxkT3B0aW9ucyArPSBmaXJzdERhdGVPcHRpb247XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItc2FsZXNmb3JjZScgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdGFsbG93ZWRUeXBlT3B0aW9ucyArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHRcdCQoIGFsbG93ZWRUeXBlc0ZpZWxkR3JvdXAgKS5odG1sKCBhbGxvd2VkVHlwZU9wdGlvbnMgKTtcblx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICYmICcnICE9PSBkYXRlRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdGRhdGVGaWVsZE9wdGlvbnMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSApO1xuXHRcdFx0XHQkKCBzZWxlY3REYXRlRmllbGQgKS5odG1sKCBkYXRlRmllbGRPcHRpb25zICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItc2FsZXNmb3JjZScgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHRcdGlmICggJycgIT09IGFsbG93ZWRUeXBlT3B0aW9ucyApIHtcblx0XHRcdFx0JCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdyZWNvcmQtdHlwZXMtYWxsb3dlZC10ZW1wbGF0ZScgKTtcblx0XHRcdH1cblx0XHRcdGlmICggZmlyc3REYXRlT3B0aW9uICE9PSBkYXRlRmllbGRPcHRpb25zICkge1xuXHRcdFx0XHQkKCBzZWxlY3REYXRlQ29udGFpbmVyICkucmVtb3ZlQ2xhc3MoICdwdWxsLXRyaWdnZXItZmllbGQtdGVtcGxhdGUnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQWxsb3cgZm9yIHBpY2tpbmcgdGhlIGRlZmF1bHQgcmVjb3JkIHR5cGUsIHdoZW4gYSBTYWxlc2ZvcmNlIG9iamVjdCBoYXMgcmVjb3JkIHR5cGVzLlxuICovXG5mdW5jdGlvbiBkZWZhdWx0UmVjb3JkVHlwZVNldHRpbmdzKCBhbGxvd2VkVHlwZXNDb250YWluZXIgKSB7XG5cdHZhciBzZWxlY3RDb250YWluZXIgPSAkKCAnLnNmd3AtbS1zYWxlc2ZvcmNlLXJlY29yZC10eXBlLWRlZmF1bHQnICk7XG5cdHZhciBzZWxlY3REZWZhdWx0RmllbGQgPSAnI3Nmd3Atc2FsZXNmb3JjZS1yZWNvcmQtdHlwZS1kZWZhdWx0Jztcblx0dmFyIHJlY29yZFR5cGVGaWVsZHMgPSAnJztcblx0dmFyIGZpcnN0UmVjb3JkVHlwZUZpZWxkID0gJCggc2VsZWN0RGVmYXVsdEZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdHZhciBzZWxlY3RlZCA9ICcnO1xuXHRyZWNvcmRUeXBlRmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0UmVjb3JkVHlwZUZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggMCA9PT0gJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0c2VsZWN0Q29udGFpbmVyLmFkZENsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS5wcm9wKCAncmVxdWlyZWQnLCBmYWxzZSApO1xuXHRcdHJldHVybjtcblx0fVxuXHQkKCAnLicgKyBhbGxvd2VkVHlwZXNDb250YWluZXIgKyAnIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJyApLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRpZiAoIDEgPT09ICQoICcuJyArIGFsbG93ZWRUeXBlc0NvbnRhaW5lciArICcgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnICkubGVuZ3RoICkge1xuXHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkJztcblx0XHRcdHNlbGVjdENvbnRhaW5lci5hZGRDbGFzcyggJ3JlY29yZC10eXBlLWRlZmF1bHQtdGVtcGxhdGUnICk7XG5cdFx0fVxuXHRcdHJlY29yZFR5cGVGaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgJCggdGhpcyApLnZhbCgpICsgJ1wiJyArIHNlbGVjdGVkICsnPicgKyAkKCB0aGlzICkuY2xvc2VzdCggJ2xhYmVsJyApLnRleHQoKSArICc8L29wdGlvbj4nO1xuXHR9ICk7XG5cdCQoIHNlbGVjdERlZmF1bHRGaWVsZCApLmh0bWwoIHJlY29yZFR5cGVGaWVsZHMgKTtcblx0aWYgKCAxIDwgJCggJy4nICsgYWxsb3dlZFR5cGVzQ29udGFpbmVyICsgJyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0c2VsZWN0Q29udGFpbmVyLnJlbW92ZUNsYXNzKCAncmVjb3JkLXR5cGUtZGVmYXVsdC10ZW1wbGF0ZScgKTtcblx0XHQkKCBzZWxlY3REZWZhdWx0RmllbGQgKS5wcm9wKCAncmVxdWlyZWQnLCB0cnVlICk7XG5cdH1cbn07XG5cbi8vIGxvYWQgcmVjb3JkIHR5cGUgc2V0dGluZ3MgaWYgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSB0aGlzLnZhbHVlO1xuXHRzYWxlc2ZvcmNlT2JqZWN0UmVjb3JkU2V0dGluZ3MoIHNhbGVzZm9yY2VPYmplY3QsIHRydWUgKTtcbn0gKTtcblxuLy8gbG9hZCByZWNvcmQgdHlwZSBkZWZhdWx0IGNob2ljZXMgaWYgdGhlIGFsbG93ZWQgcmVjb3JkIHR5cGVzIGNoYW5nZVxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcuc2Z3cC1tLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGVzLWFsbG93ZWQgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJywgZnVuY3Rpb24oKSB7XG5cdGRlZmF1bHRSZWNvcmRUeXBlU2V0dGluZ3MoICdzZndwLW0tc2FsZXNmb3JjZS1yZWNvcmQtdHlwZXMtYWxsb3dlZCcgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2UgcmVjb3JkIHR5cGUgc2V0dGluZ3NcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gTG9hZCByZWNvcmQgdHlwZSBzZXR0aW5ncyBmb3IgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0XG5cdHNhbGVzZm9yY2VPYmplY3RSZWNvcmRTZXR0aW5ncyggJCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2Utb2JqZWN0JyApLnZhbCgpLCBmYWxzZSApO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdE5hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnXG5cdH07XG5cdHZhciBzZWxlY3RTeXN0ZW1GaWVsZCA9ICcuc2Z3cC1maWVsZG1hcC0nICsgc3lzdGVtICsgJy1maWVsZCBzZWxlY3QnO1xuXHR2YXIgc3lzdGVtRmllbGRDaG9pY2VzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0U3lzdGVtRmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0U3lzdGVtRmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0c3lzdGVtRmllbGRDaG9pY2VzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBzeXN0ZW1GaWVsZENob2ljZXM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdHN5c3RlbUZpZWxkQ2hvaWNlcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRzeXN0ZW1GaWVsZENob2ljZXMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0U3lzdGVtRmllbGQgKS5odG1sKCBzeXN0ZW1GaWVsZENob2ljZXMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoICdkZXN0cm95JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5jbG9uZSggdHJ1ZSApO1xuXHR9XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogR2V0cyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgU2FsZXNmb3JjZSBmaWVsZCBiYXNlZCBvbiBpdHMgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBzYWxlc2ZvcmNlT2JqZWN0IHRoZSBuYW1lIG9mIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlXG4gKiBAcGFyYW0ge3N0cmluZ30gc2FsZXNmb3JjZUZpZWxkIHRoZSBuYW1lIG9mIHRoZSBTYWxlc2ZvcmNlIGZpZWxkXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IG9mIHRoZSBmaWVsZG1hcCB3ZSdyZSBkZWFsaW5nIHdpdGhcbiAqL1xuIGZ1bmN0aW9uIGxvYWRTYWxlc2ZvcmNlRmllbGRJbmZvKCBzYWxlc2ZvcmNlT2JqZWN0LCBzYWxlc2ZvcmNlRmllbGQsIGtleSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbicgICAgICAgICAgICA6ICdnZXRfc2FsZXNmb3JjZV9maWVsZF9pbmZvJyxcblx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogc2FsZXNmb3JjZU9iamVjdCxcblx0XHQnc2FsZXNmb3JjZV9maWVsZCcgIDogc2FsZXNmb3JjZUZpZWxkXG5cdH1cblx0dmFyIGRlcGVuZGVudFRlbXBsYXRlQ2xhc3MgPSAnc2Z3cC1maWVsZC1kZXBlbmRlbnQtZmllbGRzLXRlbXBsYXRlJztcblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLXNhbGVzZm9yY2UtZmllbGQtJyArIGtleSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JCggJy5zZndwLWZpZWxkLWRlcGVuZGVudC1maWVsZHMtJyArIGtleSApLmFkZENsYXNzKCBkZXBlbmRlbnRUZW1wbGF0ZUNsYXNzICk7XG5cdFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLnR5cGUgKSB7XG5cdFx0XHRcdCQoICcuc2Z3cC1maWVsZC1kZXBlbmRlbnQtZmllbGRzLScgKyBrZXkgKyAnLnNmd3AtZmllbGQtZGVwZW5kZW50LWZpZWxkcy0nICsgcmVzcG9uc2UuZGF0YS50eXBlICkucmVtb3ZlQ2xhc3MoIGRlcGVuZGVudFRlbXBsYXRlQ2xhc3MgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci1zYWxlc2ZvcmNlLWZpZWxkLScgKyBrZXkgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9XG5cdH0gKTtcbiB9XG5cbiAvLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIGZpZWxkIGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnW2lkXj1zZndwLXNhbGVzZm9yY2UtZmllbGQtXScsIGZ1bmN0aW9uKCkge1xuXHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS52YWwoKTtcblx0dmFyIHNhbGVzZm9yY2VGaWVsZCA9ICQoIHRoaXMgKS52YWwoKTtcblx0dmFyIGtleSA9ICQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMtZXhwYW5kZWQnICkuZGF0YSggJ2tleScgKTtcblx0bG9hZFNhbGVzZm9yY2VGaWVsZEluZm8oIHNhbGVzZm9yY2VPYmplY3QsIHNhbGVzZm9yY2VGaWVsZCwga2V5ICk7XG59KTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGEgZmllbGQgYWN0aW9uLCBkb24ndCB1c2UgdGhlIGRlZmF1bHRcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgZWRpdCBvbiBhIGZpZWxkLCB0b2dnbGUgaXRzIGV4cGFuZGVkIHN0YXR1c1xuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24tZWRpdCcsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCk7XG5cdHZhciBjb250YWluZXIgPSAkKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApO1xuXHR2YXIga2V5ID0gY29udGFpbmVyLmRhdGEoICdrZXknICk7XG5cdHZhciBzYWxlc2ZvcmNlRmllbGQgPSAkKCAnI3Nmd3Atc2FsZXNmb3JjZS1maWVsZC0nICsga2V5ICkudmFsKCk7XG5cdHZhciBleHBhbmRlZENsYXNzID0gJ3Nmd3AtYS1maWVsZG1hcC12YWx1ZXMtZXhwYW5kZWQnO1xuXHRpZiAoIGZhbHNlID09PSAkKCBjb250YWluZXIgKS5oYXNDbGFzcyggZXhwYW5kZWRDbGFzcyApICkge1xuXHRcdGxvYWRTYWxlc2ZvcmNlRmllbGRJbmZvKCBzYWxlc2ZvcmNlT2JqZWN0LCBzYWxlc2ZvcmNlRmllbGQsIGtleSApO1xuXHR9XG5cdGNvbnRhaW5lci50b2dnbGVDbGFzcyggZXhwYW5kZWRDbGFzcyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgZGVsZXRlIG9uIGEgZmllbGQsIG9mZmVyIHRvIGRlbGV0ZSBpdFxuICogdG9kbzogbWFrZSB0aGlzIHdvcmtcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWRlbGV0ZScsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0Ly8kKCB0aGlzICkuY2xvc2VzdCggJy5zZndwLWEtZmllbGRtYXAtdmFsdWVzJyApLnRvZ2dsZUNsYXNzKCAnc2Z3cC1hLWZpZWxkbWFwLXZhbHVlcy1kZWxldGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIEFkZCBuZXcgZmllbGRtYXAgcm93c1xuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3Nmd3AtZGVmYXVsdC1zdGF0dXMnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLXdvcmRwcmVzcy1maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICcuc2Z3cC1maWVsZG1hcC1zYWxlc2ZvcmNlLWZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0gKTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIG9mIG9iamVjdHMgdG8gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdXNoT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzIGZyb20gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdWxsT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdH07XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIHBsdWdpbiBjYWNoZSBidXR0b25cbiAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0cHVzaE9iamVjdHMoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdWxsT2JqZWN0cygpO1xufSApO1xuIiwiLyoqXG4gKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuICovXG5mdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuIl19
}(jQuery));
