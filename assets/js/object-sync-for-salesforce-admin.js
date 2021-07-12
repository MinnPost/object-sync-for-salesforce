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
            var fieldLabel = '';

            if ('undefined' !== typeof value.label) {
              fieldLabel = value.label;
            } else {
              fieldLabel = value.name;
            }

            dateMarkup += '<option value="' + value.name + '">' + fieldLabel + '</option>';
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
          var fieldLabel = '';

          if ('undefined' !== typeof value.label) {
            fieldLabel = value.label;
          } else {
            fieldLabel = value.name;
          }

          fields += '<option value="' + value.name + '">' + fieldLabel + '</option>';
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
    //nextRow = lastRow.clone( true );
    nextRow = lastRow.find('select').end().clone(true).removeClass('fieldmap-template');
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJmaWVsZExhYmVsIiwibGFiZWwiLCJuYW1lIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsIndvcmRwcmVzc09iamVjdCIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsImF0dHIiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImVuZCIsImNsb25lIiwiaSIsImgiLCJyZXBsYWNlIiwiYXBwZW5kIiwicHJvcCIsInB1c2hPYmplY3RzIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsInB1bGxPYmplY3RzIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTQSxzQkFBVCxHQUFrQztBQUVqQyxNQUFJQyxLQUFLLEdBQUssWUFBVztBQUN4QixRQUFJQyxLQUFLLEdBQUcsQ0FBWjtBQUNBLFdBQU8sVUFBVUMsUUFBVixFQUFvQkMsRUFBcEIsRUFBeUI7QUFDL0JDLE1BQUFBLFlBQVksQ0FBR0gsS0FBSCxDQUFaO0FBQ0FBLE1BQUFBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFGLEVBQVlDLEVBQVosQ0FBbEI7QUFDQSxLQUhEO0FBSUEsR0FOYSxFQUFkOztBQVFBLE1BQUssTUFBTUcsQ0FBQyxDQUFFLHNDQUFGLENBQUQsQ0FBNENDLE1BQXZELEVBQWdFO0FBQy9ERCxJQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0UsSUFBeEM7QUFDQTs7QUFFRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDQyxNQUF0RCxFQUErRDtBQUM5REQsSUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNFLElBQXZDO0FBQ0E7O0FBQ0QsTUFBSyxNQUFNRixDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQkMsTUFBMUMsRUFBbUQ7QUFDbERELElBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCRSxJQUEz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QUFBQSxJQUFJLENBQUMwRCxNQUFMLEdBQWM3QyxJQUFkLENBQW9CUCxRQUFRLENBQUNKLElBQVQsQ0FBY2dGLE9BQWxDLEVBQTRDUixNQUE1QztBQUNBO0FBQ0QsS0FKRDtBQUtBLFdBQU8sS0FBUDtBQUNBLEdBWEQ7QUFZQTtBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBOUUsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNDLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBMEQsRUFBQUEsa0JBQWtCLEdBSGEsQ0FLL0I7O0FBQ0FaLEVBQUFBLFdBQVcsR0FOb0IsQ0FRL0I7O0FBQ0FNLEVBQUFBLFdBQVc7QUFDWCxDQVZEOzs7QUNqR0E7QUFDQTtBQUNBO0FBQ0EsU0FBU1EsZ0JBQVQsR0FBNEI7QUFDM0IsTUFBSyxJQUFJdkYsQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NDLE1BQXhELEVBQWlFO0FBQ2hFLFFBQUtELENBQUMsQ0FBRSwrQ0FBRixDQUFELENBQXFEd0YsRUFBckQsQ0FBeUQsVUFBekQsQ0FBTCxFQUE2RTtBQUM1RXhGLE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEc0IsSUFBbEQ7QUFDQSxLQUZELE1BRU87QUFDTnRCLE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtERSxJQUFsRDtBQUNBO0FBQ0Q7QUFDRCxDLENBRUQ7OztBQUNBRixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY3ZCLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0NBQTVCLEVBQTZFLFlBQVc7QUFDdkZvRixFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FGRDtBQUlBdkYsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWNDLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBNEQsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBSkQiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG4gKiBUaGlzIGFsc28gZ2VuZXJhdGVzIG90aGVyIHF1ZXJ5IGZpZWxkcyB0aGF0IGFyZSBvYmplY3Qtc3BlY2lmaWMsIGxpa2UgZGF0ZSBmaWVsZHMsIHJlY29yZCB0eXBlcyBhbGxvd2VkLCBldGMuXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0fTtcblx0fSgpICk7XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHR9XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0fVxuXHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHR9XG5cblx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JzogdGhhdC52YWx1ZVxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXHRcdFx0XHR2YXIgZGF0ZU1hcmt1cCA9ICcnO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHR2YXIgZmllbGRMYWJlbCA9ICcnO1xuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbHVlLmxhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubGFiZWw7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubmFtZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgZmllbGRMYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9LCBkZWxheVRpbWUgKTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXNwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBnZXQgdGhlIGF2YWlsYWJsZSBTYWxlc2ZvcmNlIG9iamVjdCBjaG9pY2VzXG5cdHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKTtcbn0gKTtcbiIsIi8qKlxuICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuICogQHBhcmFtIHtzdHJpbmd9IHN5c3RlbSB3aGV0aGVyIHdlIHdhbnQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2UgZGF0YVxuICogQHBhcmFtIHtzdHJpbmd9IG9iamVjdE5hbWUgdGhlIHZhbHVlIGZvciB0aGUgb2JqZWN0IG5hbWUgZnJvbSB0aGUgdGhlIDxzZWxlY3Q+XG4gKi9cbmZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0TmFtZSApIHtcblx0dmFyIGRhdGEgPSB7XG5cdFx0J2FjdGlvbic6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcydcblx0fTtcblx0dmFyIHNlbGVjdEZpZWxkID0gJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0Jztcblx0dmFyIGZpZWxkcyA9ICcnO1xuXHR2YXIgZmlyc3RGaWVsZCA9ICQoIHNlbGVjdEZpZWxkICsgJyBvcHRpb24nICkuZmlyc3QoKS50ZXh0KCk7XG5cdGlmICggJycgIT09ICQoIHNlbGVjdEZpZWxkICkudmFsKCkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdEZpZWxkICsgJzwvb3B0aW9uPic7XG5cdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gZmllbGRzO1xuXHR9XG5cblx0JC5hamF4KCB7XG5cdFx0dHlwZTogJ1BPU1QnLFxuXHRcdHVybDogYWpheHVybCxcblx0XHRkYXRhOiBkYXRhLFxuXHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9LFxuXHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0dmFyIGZpZWxkTGFiZWwgPSAnJztcblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUubGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubGFiZWw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgZmllbGRMYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHQkKCBzZWxlY3RGaWVsZCApLmh0bWwoIGZpZWxkcyApO1xuXHRcdH0sXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyLScgKyBzeXN0ZW0gKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9XG5cdH0gKTtcbn1cblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgd29yZHByZXNzIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzIHdoZW4gdGhlIHBhZ2UgbG9hZHNcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS52YWwoKSApO1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdFx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0XHR2YXIgb2xkS2V5ID0gbGFzdFJvdy5hdHRyKCAnZGF0YS1rZXknICk7XG5cdFx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgdGhlIGZpZWxkc2V0IG1hcmt1cCBwcm92aWRlZCBieSB0aGUgc2VydmVyLXNpZGUgdGVtcGxhdGUgYW5kIGFwcGVuZHMgaXQgYXQgdGhlIGVuZC5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICogQHBhcmFtIHtzdHJpbmd9IG9sZEtleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIG9mIHRoZSBzZXQgdGhhdCBpcyBiZWluZyBjbG9uZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBuZXdLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBmb3IgdGhlIG9uZSB3ZSdyZSBhcHBlbmRpbmdcbiAqIEBwYXJhbSB7b2JqZWN0fSBsYXN0Um93IHRoZSBsYXN0IHNldCBvZiB0aGUgZmllbGRtYXBcbiAqL1xuZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHR2YXIgbmV4dFJvdyA9ICcnO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MiggJ2Rlc3Ryb3knICkuZW5kKCkuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuXHR9IGVsc2Uge1xuXHRcdC8vbmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fVxuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdH0gKTtcblx0fSApO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIEFkZCBuZXcgZmllbGRtYXAgcm93c1xuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0gKTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIG9mIG9iamVjdHMgdG8gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdXNoT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzIGZyb20gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdWxsT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdH07XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIHBsdWdpbiBjYWNoZSBidXR0b25cbiAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0cHVzaE9iamVjdHMoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdWxsT2JqZWN0cygpO1xufSApO1xuIiwiLyoqXG4gKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuICovXG5mdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuIl19
}(jQuery));
