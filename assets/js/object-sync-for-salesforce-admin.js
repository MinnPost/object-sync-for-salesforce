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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJmaWVsZExhYmVsIiwibGFiZWwiLCJuYW1lIiwic2hvdyIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImRvY3VtZW50IiwicmVhZHkiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0TmFtZSIsInNlbGVjdEZpZWxkIiwiZmlyc3RGaWVsZCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYmVmb3JlU2VuZCIsImFkZENsYXNzIiwic3VjY2VzcyIsImtleSIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0aW1lb3V0IiwiZmFkZU91dCIsIm5vdCIsInJlbW92ZSIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsIndvcmRwcmVzc09iamVjdCIsIm5ld0tleSIsIkRhdGUiLCJnZXRVVENNaWxsaXNlY29uZHMiLCJsYXN0Um93IiwibGFzdCIsIm9sZEtleSIsImF0dHIiLCJSZWdFeHAiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJwcmVwZW5kIiwibmV4dFJvdyIsImVuZCIsImNsb25lIiwiaSIsImgiLCJyZXBsYWNlIiwiYXBwZW5kIiwicHJvcCIsInB1c2hPYmplY3RzIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsInB1bGxPYmplY3RzIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTQSxzQkFBVCxHQUFrQztBQUVqQyxNQUFJQyxLQUFLLEdBQUssWUFBVztBQUN4QixRQUFJQyxLQUFLLEdBQUcsQ0FBWjtBQUNBLFdBQU8sVUFBVUMsUUFBVixFQUFvQkMsRUFBcEIsRUFBeUI7QUFDL0JDLE1BQUFBLFlBQVksQ0FBR0gsS0FBSCxDQUFaO0FBQ0FBLE1BQUFBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFGLEVBQVlDLEVBQVosQ0FBbEI7QUFDQSxLQUhEO0FBSUEsR0FOYSxFQUFkOztBQVFBLE1BQUssTUFBTUcsQ0FBQyxDQUFFLHNDQUFGLENBQUQsQ0FBNENDLE1BQXZELEVBQWdFO0FBQy9ERCxJQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0UsSUFBeEM7QUFDQTs7QUFFRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDQyxNQUF0RCxFQUErRDtBQUM5REQsSUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNFLElBQXZDO0FBQ0E7O0FBQ0QsTUFBSyxNQUFNRixDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQkMsTUFBMUMsRUFBbUQ7QUFDbERELElBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCRSxJQUEz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SUFBSSxDQUFDMEQsTUFBTCxHQUFjN0MsSUFBZCxDQUFvQlAsUUFBUSxDQUFDSixJQUFULENBQWNnRixPQUFsQyxFQUE0Q1IsTUFBNUM7QUFDQTtBQUNELEtBSkQ7QUFLQSxXQUFPLEtBQVA7QUFDQSxHQVhEO0FBWUE7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTlFLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQTBELEVBQUFBLGtCQUFrQixHQUhhLENBSy9COztBQUNBWixFQUFBQSxXQUFXLEdBTm9CLENBUS9COztBQUNBTSxFQUFBQSxXQUFXO0FBQ1gsQ0FWRDs7O0FDakdBO0FBQ0E7QUFDQTtBQUNBLFNBQVNRLGdCQUFULEdBQTRCO0FBQzNCLE1BQUssSUFBSXZGLENBQUMsQ0FBRSx5Q0FBRixDQUFELENBQStDQyxNQUF4RCxFQUFpRTtBQUNoRSxRQUFLRCxDQUFDLENBQUUsK0NBQUYsQ0FBRCxDQUFxRHdGLEVBQXJELENBQXlELFVBQXpELENBQUwsRUFBNkU7QUFDNUV4RixNQUFBQSxDQUFDLENBQUUsNENBQUYsQ0FBRCxDQUFrRHNCLElBQWxEO0FBQ0EsS0FGRCxNQUVPO0FBQ050QixNQUFBQSxDQUFDLENBQUUsNENBQUYsQ0FBRCxDQUFrREUsSUFBbEQ7QUFDQTtBQUNEO0FBQ0QsQyxDQUVEOzs7QUFDQUYsQ0FBQyxDQUFFMEIsUUFBRixDQUFELENBQWN2QixFQUFkLENBQWtCLFFBQWxCLEVBQTRCLCtDQUE1QixFQUE2RSxZQUFXO0FBQ3ZGb0YsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBRkQ7QUFJQXZGLENBQUMsQ0FBRTBCLFFBQUYsQ0FBRCxDQUFjQyxLQUFkLENBQXFCLFlBQVc7QUFFL0I7QUFDQTRELEVBQUFBLGdCQUFnQjtBQUNoQixDQUpEIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHZW5lcmF0ZXMgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiB0aGUgZHJvcGRvd24gYWN0aXZpdHkgYW5kIEFQSSByZXN1bHRzLlxuICogVGhpcyBhbHNvIGdlbmVyYXRlcyBvdGhlciBxdWVyeSBmaWVsZHMgdGhhdCBhcmUgb2JqZWN0LXNwZWNpZmljLCBsaWtlIGRhdGUgZmllbGRzLCByZWNvcmQgdHlwZXMgYWxsb3dlZCwgZXRjLlxuICovXG5mdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVyID0gMDtcblx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdH07XG5cdH0oKSApO1xuXG5cdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0fVxuXG5cdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdH1cblx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0fVxuXG5cdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0J2luY2x1ZGUnOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdFx0XHQnZmllbGRfdHlwZSc6ICdkYXRldGltZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCc6IHRoYXQudmFsdWVcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnO1xuXHRcdFx0XHR2YXIgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJztcblx0XHRcdFx0dmFyIGRhdGVNYXJrdXAgPSAnJztcblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj5EZWZhdWx0IFJlY29yZCBUeXBlOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmh0bWwoIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICk7XG5cdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0dmFyIGZpZWxkTGFiZWwgPSAnJztcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB2YWx1ZS5sYWJlbCApIHtcblx0XHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLmxhYmVsO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLm5hbWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIGZpZWxkTGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+Jztcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSwgZGVsYXlUaW1lICk7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHM6XG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVzcG9uc2VcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gZ2V0IHRoZSBhdmFpbGFibGUgU2FsZXNmb3JjZSBvYmplY3QgY2hvaWNlc1xuXHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG59ICk7XG4iLCIvKipcbiAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcbiAqIEBwYXJhbSB7c3RyaW5nfSBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBvYmplY3ROYW1lIHRoZSB2YWx1ZSBmb3IgdGhlIG9iamVjdCBuYW1lIGZyb20gdGhlIHRoZSA8c2VsZWN0PlxuICovXG5mdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdE5hbWUgKSB7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnXG5cdH07XG5cdHZhciBzZWxlY3RGaWVsZCA9ICcuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCc7XG5cdHZhciBmaWVsZHMgPSAnJztcblx0dmFyIGZpcnN0RmllbGQgPSAkKCBzZWxlY3RGaWVsZCArICcgb3B0aW9uJyApLmZpcnN0KCkudGV4dCgpO1xuXHRpZiAoICcnICE9PSAkKCBzZWxlY3RGaWVsZCApLnZhbCgpICkge1xuXHRcdHJldHVybjtcblx0fVxuXHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RGaWVsZCArICc8L29wdGlvbj4nO1xuXHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0TmFtZTtcblx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0ZGF0YVsnc2FsZXNmb3JjZV9vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGZpZWxkcztcblx0fVxuXG5cdCQuYWpheCgge1xuXHRcdHR5cGU6ICdQT1NUJyxcblx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0ZGF0YTogZGF0YSxcblx0XHRiZWZvcmVTZW5kOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSxcblx0XHRzdWNjZXNzOiBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdHZhciBmaWVsZExhYmVsID0gJyc7XG5cdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHZhbHVlLmxhYmVsICkge1xuXHRcdFx0XHRcdFx0ZmllbGRMYWJlbCA9IHZhbHVlLmxhYmVsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRmaWVsZExhYmVsID0gdmFsdWUubmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIGZpZWxkTGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0RmllbGQgKS5odG1sKCBmaWVsZHMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHR9LCAxMDAwICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcbiAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkcyB3aGVuIHRoZSBwYWdlIGxvYWRzXG5cdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpICk7XG59ICk7XG4iLCJcbi8qKlxuICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG4gKi9cbiBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoICdkZXN0cm95JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fVxuXHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdCQoIG5leHRSb3cgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdH0gKTtcblx0fSApO1xuXHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufVxuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIEFkZCBuZXcgZmllbGRtYXAgcm93c1xuICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIER1cGxpY2F0ZSB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHQvLyBzZXR1cCB0aGUgc2VsZWN0MiBmaWVsZHMgaWYgdGhlIGxpYnJhcnkgaXMgcHJlc2VudFxuXHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdH1cbn0gKTtcbiIsIi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdXNoIG9mIG9iamVjdHMgdG8gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdXNoT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdCd3b3JkcHJlc3NfaWQnOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWRcblx0XHRcdH07XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gKTtcblx0fVxufVxuXG4vKipcbiAqIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzIGZyb20gU2FsZXNmb3JjZVxuICovXG5mdW5jdGlvbiBwdWxsT2JqZWN0cygpIHtcblx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZUlkLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdH07XG5cdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuICovXG5mdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJzogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0fTtcblx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIHBsdWdpbiBjYWNoZSBidXR0b25cbiAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cblx0Ly8gSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0cHVzaE9iamVjdHMoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdWxsT2JqZWN0cygpO1xufSApO1xuIiwiLyoqXG4gKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuICovXG5mdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHR9XG5cdH1cbn1cblxuLy8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcbiQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdHRvZ2dsZVNvYXBGaWVsZHMoKTtcbn0gKTtcblxuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuIl19
}(jQuery));
