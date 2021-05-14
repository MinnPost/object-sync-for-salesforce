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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJmaWVsZExhYmVsIiwibGFiZWwiLCJuYW1lIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsIndvcmRwcmVzc09iamVjdCIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsImF0dHIiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImVuZCIsImNsb25lIiwiaSIsImgiLCJyZXBsYWNlIiwiYXBwZW5kIiwicHJvcCIsInB1c2hPYmplY3RzIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsInB1bGxPYmplY3RzIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTQSxzQkFBVCxHQUFrQztBQUVqQyxNQUFJQyxLQUFLLEdBQUssWUFBVztBQUN4QixRQUFJQyxLQUFLLEdBQUcsQ0FBWjtBQUNBLFdBQU8sVUFBVUMsUUFBVixFQUFvQkMsRUFBcEIsRUFBeUI7QUFDL0JDLE1BQUFBLFlBQVksQ0FBR0gsS0FBSCxDQUFaO0FBQ0FBLE1BQUFBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFGLEVBQVlDLEVBQVosQ0FBbEI7QUFDQSxLQUhEO0FBSUEsR0FOYSxFQUFkOztBQVFBLE1BQUssTUFBTUcsQ0FBQyxDQUFFLHNDQUFGLENBQUQsQ0FBNENDLE1BQXZELEVBQWdFO0FBQy9ERCxJQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0UsSUFBeEM7QUFDQTs7QUFFRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDQyxNQUF0RCxFQUErRDtBQUM5REQsSUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNFLElBQXZDO0FBQ0E7O0FBQ0QsTUFBSyxNQUFNRixDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQkMsTUFBMUMsRUFBbUQ7QUFDbERELElBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCRSxJQUEz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RUFBNENSLE1BQTVDO0FBQ0E7QUFDRCxLQUpEO0FBS0EsV0FBTyxLQUFQO0FBQ0EsR0FYRDtBQVlBO0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0E5RSxDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0EwRCxFQUFBQSxrQkFBa0IsR0FIYSxDQUsvQjs7QUFDQVosRUFBQUEsV0FBVyxHQU5vQixDQVEvQjs7QUFDQU0sRUFBQUEsV0FBVztBQUNYLENBVkQ7OztBQ2pHQTtBQUNBO0FBQ0E7QUFDQSxTQUFTUSxnQkFBVCxHQUE0QjtBQUMzQixNQUFLLElBQUl2RixDQUFDLENBQUUseUNBQUYsQ0FBRCxDQUErQ0MsTUFBeEQsRUFBaUU7QUFDaEUsUUFBS0QsQ0FBQyxDQUFFLCtDQUFGLENBQUQsQ0FBcUR3RixFQUFyRCxDQUF5RCxVQUF6RCxDQUFMLEVBQTZFO0FBQzVFeEYsTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0RzQixJQUFsRDtBQUNBLEtBRkQsTUFFTztBQUNOdEIsTUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0RFLElBQWxEO0FBQ0E7QUFDRDtBQUNELEMsQ0FFRDs7O0FBQ0FGLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjdkIsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQ0FBNUIsRUFBNkUsWUFBVztBQUN2Rm9GLEVBQUFBLGdCQUFnQjtBQUNoQixDQUZEO0FBSUF2RixDQUFDLENBQUUwQixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0E0RCxFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FKRCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cbiAqIFRoaXMgYWxzbyBnZW5lcmF0ZXMgb3RoZXIgcXVlcnkgZmllbGRzIHRoYXQgYXJlIG9iamVjdC1zcGVjaWZpYywgbGlrZSBkYXRlIGZpZWxkcywgcmVjb3JkIHR5cGVzIGFsbG93ZWQsIGV0Yy5cbiAqL1xuZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aW1lciA9IDA7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHR9O1xuXHR9KCkgKTtcblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdH1cblxuXHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHR9XG5cdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdH1cblxuXHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0J2ZpZWxkX3R5cGUnOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnOiB0aGF0LnZhbHVlXG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJztcblx0XHRcdFx0dmFyIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciBkYXRlTWFya3VwID0gJyc7XG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHZhciBmaWVsZExhYmVsID0gJyc7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgdmFsdWUubGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5sYWJlbDtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5uYW1lO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyBmaWVsZExhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0sIGRlbGF5VGltZSApO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlc3BvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0RmllbGQgPSAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnO1xuXHR2YXIgZmllbGRzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmaWVsZHM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHR2YXIgZmllbGRMYWJlbCA9ICcnO1xuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZS5sYWJlbCApIHtcblx0XHRcdFx0XHRcdGZpZWxkTGFiZWwgPSB2YWx1ZS5sYWJlbDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLm5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyBmaWVsZExhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdCQoIHNlbGVjdEZpZWxkICkuaHRtbCggZmllbGRzICk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0dmFyIHRpbWVvdXQ7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSBzYWxlc2ZvcmNlIG9iamVjdCBjaGFuZ2VzXG4kKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpICk7XG5cdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKSApO1xufSApO1xuIiwiXG4vKipcbiAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cbiAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuICovXG4gZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHQkKCAnI2FkZC1maWVsZC1tYXBwaW5nJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgbmV3S2V5ID0gbmV3IERhdGUoKS5nZXRVVENNaWxsaXNlY29uZHMoKTtcblx0XHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHRcdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0XHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nICk7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIENsb25lcyB0aGUgZmllbGRzZXQgbWFya3VwIHByb3ZpZGVkIGJ5IHRoZSBzZXJ2ZXItc2lkZSB0ZW1wbGF0ZSBhbmQgYXBwZW5kcyBpdCBhdCB0aGUgZW5kLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKiBAcGFyYW0ge3N0cmluZ30gb2xkS2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuICogQHBhcmFtIHtzdHJpbmd9IG5ld0tleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuICogQHBhcmFtIHtvYmplY3R9IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuICovXG5mdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdHZhciBuZXh0Um93ID0gJyc7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCAnZGVzdHJveScgKS5lbmQoKS5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG5cdH0gZWxzZSB7XG5cdFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcblx0fVxuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdH0gKTtcblx0fSApO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIEFkZCBuZXcgZmllbGRtYXAgcm93c1xuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0gKTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIG9mIG9iamVjdHMgdG8gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdXNoT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzIGZyb20gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdWxsT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdH07XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIHBsdWdpbiBjYWNoZSBidXR0b25cbiAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0cHVzaE9iamVjdHMoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdWxsT2JqZWN0cygpO1xufSApO1xuIiwiLyoqXG4gKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuICovXG5mdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuIl19
}(jQuery));
