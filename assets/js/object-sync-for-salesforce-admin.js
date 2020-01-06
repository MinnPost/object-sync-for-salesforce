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
            dateMarkup += '<option value="' + value.name + '">' + value.label + '</option>';
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
    beforeSend: function beforeSend() {
      $('.spinner-' + system).addClass('is-active');
    },
    success: function success(response) {
      $.each(response.data.fields, function (index, value) {
        if ('wordpress' === system) {
          fields += '<option value="' + value.key + '">' + value.key + '</option>';
        } else if ('salesforce' === system) {
          fields += '<option value="' + value.name + '">' + value.label + '</option>';
        }
      });
      $(selectField).html(fields);
    },
    complete: function complete() {
      $('.spinner-' + system).removeClass('is-active');
    }
  });
} // load available options if the wordpress object changes


$(document).on('change', 'select#wordpress_object', function () {
  var timeout;
  loadFieldOptions('wordpress', $(this).val());
  clearTimeout(timeout);
  timeout = setTimeout(function () {
    $('table.fields tbody tr').fadeOut();
    $('table.fields tbody tr').not('.fieldmap-template').remove();
  }, 1000);
}); // load available options if the salesforce object changes

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
function addFieldMappingRow() {
  $('#add-field-mapping').click(function () {
    var salesforceObject = $('#salesforce_object').val();
    var wordpressObject = $('#wordpress_object').val();
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
 * When the plugin loads:
 * Add new fieldmap rows
 * Select2 on select fields
 */

$(document).ready(function () {
  // Duplicate the fields for a new row in the fieldmap options screen.
  addFieldMappingRow(); // setup the select2 fields if the library is present

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZG9jdW1lbnQiLCJyZWFkeSIsImxvYWRGaWVsZE9wdGlvbnMiLCJzeXN0ZW0iLCJvYmplY3ROYW1lIiwic2VsZWN0RmllbGQiLCJmaXJzdEZpZWxkIiwiZmlyc3QiLCJ0ZXh0IiwidmFsIiwiYWpheCIsInR5cGUiLCJ1cmwiLCJiZWZvcmVTZW5kIiwiYWRkQ2xhc3MiLCJzdWNjZXNzIiwia2V5IiwiY29tcGxldGUiLCJyZW1vdmVDbGFzcyIsInRpbWVvdXQiLCJmYWRlT3V0Iiwibm90IiwicmVtb3ZlIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0Iiwid29yZHByZXNzT2JqZWN0IiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiYXR0ciIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJwcm9wIiwicHVzaE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwicHVsbE9iamVjdHMiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsInRvZ2dsZVNvYXBGaWVsZHMiLCJpcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7OztBQUlBLFNBQVNBLHNCQUFULEdBQWtDO0FBRWpDLE1BQUlDLEtBQUssR0FBSyxZQUFXO0FBQ3hCLFFBQUlDLEtBQUssR0FBRyxDQUFaO0FBQ0EsV0FBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtBQUMvQkMsTUFBQUEsWUFBWSxDQUFHSCxLQUFILENBQVo7QUFDQUEsTUFBQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtBQUNBLEtBSEQ7QUFJQSxHQU5hLEVBQWQ7O0FBUUEsTUFBSyxNQUFNRyxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0Q0MsTUFBdkQsRUFBZ0U7QUFDL0RELElBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDRSxJQUF4QztBQUNBOztBQUVELE1BQUssTUFBTUYsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkNDLE1BQXRELEVBQStEO0FBQzlERCxJQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q0UsSUFBdkM7QUFDQTs7QUFDRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCQyxNQUExQyxFQUFtRDtBQUNsREQsSUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJFLElBQTNCO0FBQ0E7O0FBRURGLEVBQUFBLENBQUMs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LEMsQ0FFRDs7O0FBQ0FGLENBQUMsQ0FBRXlCLFFBQUYsQ0FBRCxDQUFjdEIsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQ0FBNUIsRUFBNkUsWUFBVztBQUN2Rm1GLEVBQUFBLGdCQUFnQjtBQUNoQixDQUZEO0FBSUF0RixDQUFDLENBQUV5QixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0E0RCxFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FKRCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cbiAqIFRoaXMgYWxzbyBnZW5lcmF0ZXMgb3RoZXIgcXVlcnkgZmllbGRzIHRoYXQgYXJlIG9iamVjdC1zcGVjaWZpYywgbGlrZSBkYXRlIGZpZWxkcywgcmVjb3JkIHR5cGVzIGFsbG93ZWQsIGV0Yy5cbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aW1lciA9IDA7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHR9O1xuXHR9KCkgKTtcblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdH1cblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHR9XG5cdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdH1cblxuXHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0J2ZpZWxkX3R5cGUnOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnOiB0aGF0LnZhbHVlXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJztcblx0XHRcdFx0dmFyIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciBkYXRlTWFya3VwID0gJyc7XG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+Jztcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSwgZGVsYXlUaW1lICk7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVzcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gZ2V0IHRoZSBhdmFpbGFibGUgU2FsZXNmb3JjZSBvYmplY3QgY2hvaWNlc1xuXHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG59ICk7XG4iLCIvKipcbiAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBvYmplY3ROYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdE5hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnXG5cdH07XG5cdHZhciBzZWxlY3RGaWVsZCA9ICcuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCc7XG5cdHZhciBmaWVsZHMgPSAnJztcblx0dmFyIGZpcnN0RmllbGQgPSAkKCBzZWxlY3RGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXHRpZiAoICcnICE9PSAkKCBzZWxlY3RGaWVsZCApLnZhbCgpICkge1xuXHRcdHJldHVybjtcblx0fVxuXHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RGaWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnc2FsZXNmb3JjZV9vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZpZWxkcztcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHQkKCBzZWxlY3RGaWVsZCApLmh0bWwoIGZpZWxkcyApO1xuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9XG5cdH0gKTtcbn1cblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgd29yZHByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzIHdoZW4gdGhlIHBhZ2UgbG9hZHNcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS52YWwoKSApO1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdFx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0XHR2YXIgb2xkS2V5ID0gbGFzdFJvdy5hdHRyKCAnZGF0YS1rZXknICk7XG5cdFx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgdGhlIGZpZWxkc2V0IG1hcmt1cCBwcm92aWRlZCBieSB0aGUgc2VydmVyLXNpZGUgdGVtcGxhdGUgYW5kIGFwcGVuZHMgaXQgYXQgdGhlIGVuZC5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICogQHBhcmFtIHtzdHJpbmd9IG9sZEtleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIG9mIHRoZSBzZXQgdGhhdCBpcyBiZWluZyBjbG9uZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBuZXdLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBmb3IgdGhlIG9uZSB3ZSdyZSBhcHBlbmRpbmdcbiAqIEBwYXJhbSB7b2JqZWN0fSBsYXN0Um93IHRoZSBsYXN0IHNldCBvZiB0aGUgZmllbGRtYXBcbiAqL1xuZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHR2YXIgbmV4dFJvdyA9ICcnO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MiggJ2Rlc3Ryb3knICkuZW5kKCkuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmNsb25lKCB0cnVlICk7XG5cdH1cblx0JCggbmV4dFJvdyApLmF0dHIoICdkYXRhLWtleScsIG5ld0tleSApO1xuXHQkKCBuZXh0Um93ICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0JCggdGhpcyApLmh0bWwoIGZ1bmN0aW9uKCBpLCBoICkge1xuXHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHR9ICk7XG5cdH0gKTtcblx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG5leHRSb3cgKTtcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdG5leHRSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn1cblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBBZGQgbmV3IGZpZWxkbWFwIHJvd3NcbiAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEdXBsaWNhdGUgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cblx0Ly8gc2V0dXAgdGhlIHNlbGVjdDIgZmllbGRzIGlmIHRoZSBsaWJyYXJ5IGlzIHByZXNlbnRcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHQkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59ICk7XG4iLCIvKipcbiAqIEhhbmRsZSBtYW51YWwgcHVzaCBvZiBvYmplY3RzIHRvIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVzaE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHQnd29yZHByZXNzX2lkJzogd29yZHByZXNzSWQsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9ICk7XG5cdH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0cyBmcm9tIFNhbGVzZm9yY2VcbiAqL1xuZnVuY3Rpb24gcHVsbE9iamVjdHMoKSB7XG5cdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZCxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdFx0fTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuICovXG5mdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHQnbWFwcGluZ19pZCc6IG1hcHBpbmdJZFxuXHR9O1xuXHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSApO1xufVxuXG4vKipcbiAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cbiAqL1xuZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdH07XG5cdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBwbHVnaW4gY2FjaGUgYnV0dG9uXG4gKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdHB1c2hPYmplY3RzKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHNcblx0cHVsbE9iamVjdHMoKTtcbn0gKTtcbiIsIi8qKlxuICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiAqL1xuZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0fVxuXHR9XG59XG5cbi8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG5cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcbiJdfQ==
}(jQuery));
