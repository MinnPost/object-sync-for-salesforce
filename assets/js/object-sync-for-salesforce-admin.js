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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjAxLXNhbGVzZm9yY2Utb2JqZWN0LmpzIiwiMDItbG9hZC1maWVsZC1vcHRpb25zLmpzIiwiMDMtZmllbGRtYXAtcm93cy5qcyIsIjA0LWludGVyZmFjZS1hamF4LWV2ZW50cy5qcyIsIjA1LXNvYXAuanMiXSwibmFtZXMiOlsic2FsZXNmb3JjZU9iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIiQiLCJsZW5ndGgiLCJoaWRlIiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiZG9jdW1lbnQiLCJyZWFkeSIsImxvYWRGaWVsZE9wdGlvbnMiLCJzeXN0ZW0iLCJvYmplY3ROYW1lIiwic2VsZWN0RmllbGQiLCJmaXJzdEZpZWxkIiwiZmlyc3QiLCJ0ZXh0IiwidmFsIiwiYWpheCIsInR5cGUiLCJ1cmwiLCJiZWZvcmVTZW5kIiwiYWRkQ2xhc3MiLCJzdWNjZXNzIiwia2V5IiwiY29tcGxldGUiLCJyZW1vdmVDbGFzcyIsInRpbWVvdXQiLCJmYWRlT3V0Iiwibm90IiwicmVtb3ZlIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0Iiwid29yZHByZXNzT2JqZWN0IiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiYXR0ciIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInByZXBlbmQiLCJuZXh0Um93IiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJwcm9wIiwiZXZlbnQiLCJwcmV2ZW50RGVmYXVsdCIsImNsb3Nlc3QiLCJ0b2dnbGVDbGFzcyIsInB1c2hPYmplY3RzIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsInB1bGxPYmplY3RzIiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJ0b2dnbGVTb2FwRmllbGRzIiwiaXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7QUFJQSxTQUFTQSxzQkFBVCxHQUFrQztBQUVqQyxNQUFJQyxLQUFLLEdBQUssWUFBVztBQUN4QixRQUFJQyxLQUFLLEdBQUcsQ0FBWjtBQUNBLFdBQU8sVUFBVUMsUUFBVixFQUFvQkMsRUFBcEIsRUFBeUI7QUFDL0JDLE1BQUFBLFlBQVksQ0FBR0gsS0FBSCxDQUFaO0FBQ0FBLE1BQUFBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFGLEVBQVlDLEVBQVosQ0FBbEI7QUFDQSxLQUhEO0FBSUEsR0FOYSxFQUFkOztBQVFBLE1BQUssTUFBTUcsQ0FBQyxDQUFFLHNDQUFGLENBQUQsQ0FBNENDLE1BQXZELEVBQWdFO0FBQy9ERCxJQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0UsSUFBeEM7QUFDQTs7QUFFRCxNQUFLLE1BQU1GLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDQyxNQUF0RCxFQUErRDtBQUM5REQsSUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNFLElBQXZDO0FBQ0E7O0FBQ0QsTUFBSyxNQUFNRixDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQkMsTUFBMUMsRUFBbUQ7QUFDbERELElBQUFBLENBQUMsQ0FB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QTtBQUVEOzs7Ozs7O0FBS0FqRixDQUFDLENBQUV5QixRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0E4RCxFQUFBQSxrQkFBa0IsR0FIYSxDQUsvQjs7QUFDQVosRUFBQUEsV0FBVyxHQU5vQixDQVEvQjs7QUFDQU0sRUFBQUEsV0FBVztBQUNYLENBVkQ7OztBQ2pHQTs7O0FBR0EsU0FBU1EsZ0JBQVQsR0FBNEI7QUFDM0IsTUFBSyxJQUFJMUYsQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NDLE1BQXhELEVBQWlFO0FBQ2hFLFFBQUtELENBQUMsQ0FBRSwrQ0FBRixDQUFELENBQXFEMkYsRUFBckQsQ0FBeUQsVUFBekQsQ0FBTCxFQUE2RTtBQUM1RTNGLE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtEcUIsSUFBbEQ7QUFDQSxLQUZELE1BRU87QUFDTnJCLE1BQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtERSxJQUFsRDtBQUNBO0FBQ0Q7QUFDRCxDLENBRUQ7OztBQUNBRixDQUFDLENBQUV5QixRQUFGLENBQUQsQ0FBY3RCLEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0NBQTVCLEVBQTZFLFlBQVc7QUFDdkZ1RixFQUFBQSxnQkFBZ0I7QUFDaEIsQ0FGRDtBQUlBMUYsQ0FBQyxDQUFFeUIsUUFBRixDQUFELENBQWNDLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBZ0UsRUFBQUEsZ0JBQWdCO0FBQ2hCLENBSkQiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG4gKiBUaGlzIGFsc28gZ2VuZXJhdGVzIG90aGVyIHF1ZXJ5IGZpZWxkcyB0aGF0IGFyZSBvYmplY3Qtc3BlY2lmaWMsIGxpa2UgZGF0ZSBmaWVsZHMsIHJlY29yZCB0eXBlcyBhbGxvd2VkLCBldGMuXG4gKi9cbmZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0fTtcblx0fSgpICk7XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHR9XG5cblx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0fVxuXHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHR9XG5cblx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHQnaW5jbHVkZSc6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdCdmaWVsZF90eXBlJzogJ2RhdGV0aW1lJyxcblx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JzogdGhhdC52YWx1ZVxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJyc7XG5cdFx0XHRcdHZhciByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnO1xuXHRcdFx0XHR2YXIgZGF0ZU1hcmt1cCA9ICcnO1xuXHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+Jztcblx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPic7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0sIGRlbGF5VGltZSApO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlc3BvbnNlXG4gKi9cbiQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xufSApO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG4gKiBAcGFyYW0ge3N0cmluZ30gc3lzdGVtIHdoZXRoZXIgd2Ugd2FudCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBkYXRhXG4gKiBAcGFyYW0ge3N0cmluZ30gb2JqZWN0TmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSB0aGUgPHNlbGVjdD5cbiAqL1xuZnVuY3Rpb24gbG9hZEZpZWxkT3B0aW9ucyggc3lzdGVtLCBvYmplY3ROYW1lICkge1xuXHR2YXIgZGF0YSA9IHtcblx0XHQnYWN0aW9uJzogJ2dldF8nICsgc3lzdGVtICsgJ19vYmplY3RfZmllbGRzJ1xuXHR9O1xuXHR2YXIgc2VsZWN0RmllbGQgPSAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnO1xuXHR2YXIgZmllbGRzID0gJyc7XG5cdHZhciBmaXJzdEZpZWxkID0gJCggc2VsZWN0RmllbGQgKyAnIG9wdGlvbicgKS5maXJzdCgpLnRleHQoKTtcblx0aWYgKCAnJyAhPT0gJCggc2VsZWN0RmllbGQgKS52YWwoKSApIHtcblx0XHRyZXR1cm47XG5cdH1cblx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0RmllbGQgKyAnPC9vcHRpb24+Jztcblx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdE5hbWU7XG5cdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3ROYW1lO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBmaWVsZHM7XG5cdH1cblxuXHQkLmFqYXgoIHtcblx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0dXJsOiBhamF4dXJsLFxuXHRcdGRhdGE6IGRhdGEsXG5cdFx0YmVmb3JlU2VuZDogZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0sXG5cdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdFx0JCggc2VsZWN0RmllbGQgKS5odG1sKCBmaWVsZHMgKTtcblx0XHR9LFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fVxuXHR9ICk7XG59XG5cbi8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lb3V0O1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdH0sIDEwMDAgKTtcbn0gKTtcblxuLy8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHR2YXIgdGltZW91dDtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0fSwgMTAwMCApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkczpcbiAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG4gKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuICovXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkudmFsKCkgKTtcblx0bG9hZEZpZWxkT3B0aW9ucyggJ3NhbGVzZm9yY2UnLCAkKCAnc2VsZWN0I3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCkgKTtcbn0gKTtcbiIsIlxuLyoqXG4gKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqL1xuIGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3Nmd3Atc2FsZXNmb3JjZS1vYmplY3QnICkudmFsKCk7XG5cdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjc2Z3cC13b3JkcHJlc3Mtb2JqZWN0JyApLnZhbCgpO1xuXHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG4gKiB0aGlzIGFwcGVhcnMgbm90IHRvIHdvcmsgd2l0aCBkYXRhKCkgaW5zdGVhZCBvZiBhdHRyKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBvbGRLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG4gKiBAcGFyYW0ge3N0cmluZ30gbmV3S2V5IHRoZSBkYXRhIGtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG4gKiBAcGFyYW0ge29iamVjdH0gbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG4gKi9cbmZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0dmFyIG5leHRSb3cgPSAnJztcblx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoICdkZXN0cm95JyApLmVuZCgpLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcblx0fSBlbHNlIHtcblx0XHRuZXh0Um93ID0gbGFzdFJvdy5jbG9uZSggdHJ1ZSApO1xuXHR9XG5cdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0JCggbmV4dFJvdyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0fSApO1xuXHR9ICk7XG5cdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHR9XG59XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiBjbGlja2luZyBhIGZpZWxkIGFjdGlvbiwgZG9uJ3QgdXNlIHRoZSBkZWZhdWx0XG4gKi9cbiQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuc2Z3cC1hLWZpZWxkbWFwLWZpZWxkLWFjdGlvbicsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcbn0gKTtcblxuLyoqXG4gKiBXaGVuIGNsaWNraW5nIGVkaXQgb24gYSBmaWVsZCwgdG9nZ2xlIGl0cyBleHBhbmRlZCBzdGF0dXNcbiAqL1xuJCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5zZndwLWEtZmllbGRtYXAtZmllbGQtYWN0aW9uLWVkaXQnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdCQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWV4cGFuZGVkJyApO1xufSApO1xuXG4vKipcbiAqIFdoZW4gY2xpY2tpbmcgZGVsZXRlIG9uIGEgZmllbGQsIG9mZmVyIHRvIGRlbGV0ZSBpdFxuICovXG4kKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLnNmd3AtYS1maWVsZG1hcC1maWVsZC1hY3Rpb24tZGVsZXRlJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHQvLyQoIHRoaXMgKS5jbG9zZXN0KCAnLnNmd3AtYS1maWVsZG1hcC12YWx1ZXMnICkudG9nZ2xlQ2xhc3MoICdzZndwLWEtZmllbGRtYXAtdmFsdWVzLWRlbGV0ZWQnICk7XG59ICk7XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQWRkIG5ldyBmaWVsZG1hcCByb3dzXG4gKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gRHVwbGljYXRlIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXG5cdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXdvcmRwcmVzcy1vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdCQoICdzZWxlY3Qjc2Z3cC1zYWxlc2ZvcmNlLW9iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXNhbGVzZm9yY2UtcmVjb3JkLXR5cGUtZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJ3NlbGVjdCNzZndwLXB1bGwtdHJpZ2dlci1maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0JCggJy5zZndwLWZpZWxkbWFwLWZvcm0tZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0fVxufSApO1xuIiwiLyoqXG4gKiBIYW5kbGUgbWFudWFsIHB1c2ggb2Ygb2JqZWN0cyB0byBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1c2hPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCc6IHNhbGVzZm9yY2VJZFxuXHRcdFx0fTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59XG5cbi8qKlxuICogSGFuZGxlIG1hbnVhbCBwdWxsIG9mIG9iamVjdHMgZnJvbSBTYWxlc2ZvcmNlXG4gKi9cbmZ1bmN0aW9uIHB1bGxPYmplY3RzKCkge1xuXHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdFxuXHRcdH07XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHRcdHJldHVybiBmYWxzZTtcblx0fSApO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cbiAqL1xuZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdHZhciBkYXRhID0ge1xuXHRcdCdhY3Rpb24nOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0J21hcHBpbmdfaWQnOiBtYXBwaW5nSWRcblx0fTtcblx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gKTtcbn1cblxuLyoqXG4gKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG4gKi9cbmZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHR9O1xuXHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9ICk7XG59XG5cbi8qKlxuICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzOlxuICogQ2xlYXIgcGx1Z2luIGNhY2hlIGJ1dHRvblxuICogTWFudWFsIHB1c2ggYW5kIHB1bGxcbiAqL1xuJCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0Ly8gQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblxuXHQvLyBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHRwdXNoT2JqZWN0cygpO1xuXG5cdC8vIEhhbmRsZSBtYW51YWwgcHVsbCBvZiBvYmplY3RzXG5cdHB1bGxPYmplY3RzKCk7XG59ICk7XG4iLCIvKipcbiAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG4gKi9cbmZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdH1cblx0fVxufVxuXG4vLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuJCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0dG9nZ2xlU29hcEZpZWxkcygpO1xufSApO1xuXG4kKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHQvLyBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHR0b2dnbGVTb2FwRmllbGRzKCk7XG59ICk7XG4iXX0=
}(jQuery));
