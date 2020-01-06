;(function($) {
"use strict";

/**
 * Gets the WordPress and Salesforce field results via an Ajax call
 * @param string system whether we want WordPress or Salesforce data
 * @param string object_name the value for the object name from the the <select>
 */
function loadFieldOptions(system, object_name) {
  var data = {
    'action': 'get_' + system + '_object_fields'
  };
  var selectField = '.column-' + system + '_field select';
  var fields = '';
  var first_field = $(selectField + ' option').first().text();

  if ('' !== $(selectField).val()) {
    return;
  }

  fields += '<option value="">' + first_field + '</option>';

  if ('wordpress' === system) {
    data['wordpress_object'] = object_name;
  } else if ('salesforce' === system) {
    data['salesforce_object'] = object_name;
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
}
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
}
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
        var recordTypesAllowedMarkup = '',
            recordTypeDefaultMarkup = '',
            dateMarkup = '';

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
 * @param string oldKey the data key attribute of the set that is being cloned
 * @param string newKey the data key attribute for the one we're appending
 * @param object lastRow the last set of the fieldmap
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
 * Handle manual push and pull of objects
 */


function pushAndPullObjects() {
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
}); // Don't show the WSDL file field unless SOAP is enabled

$(document).on('change', '.object-sync-for-salesforce-enable-soap input', function () {
  toggleSoapFields();
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
 * When the plugin loads, initialize or enable things:
 * Select2 on select fields
 * Clear fields when the targeted WordPress or Salesforce object type changes
 * Manage the display for Salesforce object fields based on API reponse
 * Manual push and pull
 * Clearing the cache
 */

$(document).ready(function () {
  // Don't show the WSDL file field unless SOAP is enabled
  toggleSoapFields(); // if there is already a wp or sf object, make sure it has the right fields when the page loads

  loadFieldOptions('wordpress', $('select#wordpress_object').val());
  loadFieldOptions('salesforce', $('select#salesforce_object').val()); // setup the select2 fields if the library is present

  if (jQuery.fn.select2) {
    $('select#wordpress_object').select2();
    $('select#salesforce_object').select2();
    $('select#salesforce_record_type_default').select2();
    $('select#pull_trigger_field').select2();
    $('.column-wordpress_field select').select2();
    $('.column-salesforce_field select').select2();
  } // get the available Salesforce object choices


  salesforceObjectFields(); // Duplicate the fields for a new row in the fieldmap options screen.

  addFieldMappingRow(); // Handle manual push and pull of objects

  pushAndPullObjects(); // Clear the plugin cache via Ajax request.

  clearSfwpCacheLink();
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbImxvYWRGaWVsZE9wdGlvbnMiLCJzeXN0ZW0iLCJvYmplY3RfbmFtZSIsImRhdGEiLCJzZWxlY3RGaWVsZCIsImZpZWxkcyIsImZpcnN0X2ZpZWxkIiwiJCIsImZpcnN0IiwidGV4dCIsInZhbCIsImFqYXgiLCJ0eXBlIiwidXJsIiwiYWpheHVybCIsImJlZm9yZVNlbmQiLCJhZGRDbGFzcyIsInN1Y2Nlc3MiLCJyZXNwb25zZSIsImVhY2giLCJpbmRleCIsInZhbHVlIiwia2V5IiwibmFtZSIsImxhYmVsIiwiaHRtbCIsImNvbXBsZXRlIiwicmVtb3ZlQ2xhc3MiLCJ0b2dnbGVTb2FwRmllbGRzIiwibGVuZ3RoIiwiaXMiLCJzaG93IiwiaGlkZSIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJkZWxheSIsInRpbWVyIiwiY2FsbGJhY2siLCJtcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJvbiIsInRoYXQiLCJkZWxheVRpbWUiLCJwb3N0IiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0Iiwid29yZHByZXNzT2JqZWN0IiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiYXR0ciIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInJlbW92ZSIsInByZXBlbmQiLCJuZXh0Um93IiwiZW5kIiwiY2xvbmUiLCJpIiwiaCIsInJlcGxhY2UiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwiZG9jdW1lbnQiLCJ0aW1lb3V0Iiwibm90IiwicHJvcCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUVDOzs7OztBQUtBLFNBQVNBLGdCQUFULENBQTJCQyxNQUEzQixFQUFtQ0MsV0FBbkMsRUFBaUQ7QUFDaEQsTUFBSUMsSUFBSSxHQUFHO0FBQ1YsY0FBVyxTQUFTRixNQUFULEdBQWtCO0FBRG5CLEdBQVg7QUFHQSxNQUFJRyxXQUFXLEdBQUcsYUFBYUgsTUFBYixHQUFzQixlQUF4QztBQUNBLE1BQUlJLE1BQU0sR0FBRyxFQUFiO0FBQ0EsTUFBSUMsV0FBVyxHQUFHQyxDQUFDLENBQUVILFdBQVcsR0FBRyxTQUFoQixDQUFELENBQTRCSSxLQUE1QixHQUFvQ0MsSUFBcEMsRUFBbEI7O0FBQ0EsTUFBSyxPQUFPRixDQUFDLENBQUVILFdBQUYsQ0FBRCxDQUFpQk0sR0FBakIsRUFBWixFQUFxQztBQUNwQztBQUNBOztBQUNETCxFQUFBQSxNQUFNLElBQUksc0JBQXNCQyxXQUF0QixHQUFvQyxXQUE5Qzs7QUFDQSxNQUFLLGdCQUFnQkwsTUFBckIsRUFBOEI7QUFDN0JFLElBQUFBLElBQUksQ0FBQyxrQkFBRCxDQUFKLEdBQTJCRCxXQUEzQjtBQUNBLEdBRkQsTUFFTyxJQUFLLGlCQUFpQkQsTUFBdEIsRUFBK0I7QUFDckNFLElBQUFBLElBQUksQ0FBQyxtQkFBRCxDQUFKLEdBQTRCRCxXQUE1QjtBQUNBLEdBRk0sTUFFQTtBQUNOLFdBQU9HLE1BQVA7QUFDQTs7QUFFREUsRUFBQUEsQ0FBQyxDQUFDSSxJQUFGLENBQU87QUFDTkMsSUFBQUEsSUFBSSxFQUFFLE1BREE7QUFFTkMsSUFBQUEsR0FBRyxFQUFFQyxPQUZDO0FBR05YLElBQUFB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QixDQUFFLFdBQUYsRUFBZU8sQ0FBQyxDQUFFLHlCQUFGLENBQUQsQ0FBK0JHLEdBQS9CLEVBQWYsQ0FBaEI7QUFDQVYsRUFBQUEsZ0JBQWdCLENBQUUsWUFBRixFQUFnQk8sQ0FBQyxDQUFFLDBCQUFGLENBQUQsQ0FBZ0NHLEdBQWhDLEVBQWhCLENBQWhCLENBUCtCLENBUy9COztBQUNBLE1BQUtzQyxNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4QjNDLElBQUFBLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCMkMsT0FBL0I7QUFDQTNDLElBQUFBLENBQUMsQ0FBRSwwQkFBRixDQUFELENBQWdDMkMsT0FBaEM7QUFDQTNDLElBQUFBLENBQUMsQ0FBRSx1Q0FBRixDQUFELENBQTZDMkMsT0FBN0M7QUFDQTNDLElBQUFBLENBQUMsQ0FBRSwyQkFBRixDQUFELENBQWlDMkMsT0FBakM7QUFDQTNDLElBQUFBLENBQUMsQ0FBRSxnQ0FBRixDQUFELENBQXNDMkMsT0FBdEM7QUFDQTNDLElBQUFBLENBQUMsQ0FBRSxpQ0FBRixDQUFELENBQXVDMkMsT0FBdkM7QUFDQSxHQWpCOEIsQ0FtQi9COzs7QUFDQWpCLEVBQUFBLHNCQUFzQixHQXBCUyxDQXNCL0I7O0FBQ0FrQixFQUFBQSxrQkFBa0IsR0F2QmEsQ0F5Qi9COztBQUNBd0IsRUFBQUEsa0JBQWtCLEdBMUJhLENBNEIvQjs7QUFDQVksRUFBQUEsa0JBQWtCO0FBQ2xCLENBOUJEIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cblx0LyoqXG5cdCAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcblx0ICogQHBhcmFtIHN0cmluZyBzeXN0ZW0gd2hldGhlciB3ZSB3YW50IFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIGRhdGFcblx0ICogQHBhcmFtIHN0cmluZyBvYmplY3RfbmFtZSB0aGUgdmFsdWUgZm9yIHRoZSBvYmplY3QgbmFtZSBmcm9tIHRoZSB0aGUgPHNlbGVjdD5cblx0ICovXG5cdGZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0X25hbWUgKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcycsXG5cdFx0fVxuXHRcdHZhciBzZWxlY3RGaWVsZCA9ICcuY29sdW1uLScgKyBzeXN0ZW0gKyAnX2ZpZWxkIHNlbGVjdCc7XG5cdFx0dmFyIGZpZWxkcyA9ICcnO1xuXHRcdHZhciBmaXJzdF9maWVsZCA9ICQoIHNlbGVjdEZpZWxkICsgJyBvcHRpb24nKS5maXJzdCgpLnRleHQoKTtcblx0XHRpZiAoICcnICE9PSAkKCBzZWxlY3RGaWVsZCApLnZhbCgpICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4nICsgZmlyc3RfZmllbGQgKyAnPC9vcHRpb24+Jztcblx0XHRpZiAoICd3b3JkcHJlc3MnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRkYXRhWyd3b3JkcHJlc3Nfb2JqZWN0J10gPSBvYmplY3RfbmFtZTtcblx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdGRhdGFbJ3NhbGVzZm9yY2Vfb2JqZWN0J10gPSBvYmplY3RfbmFtZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGZpZWxkcztcblx0XHR9XG5cblx0XHQkLmFqYXgoe1xuXHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdGJlZm9yZVNlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAnLnNwaW5uZXItJyArIHN5c3RlbSApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdFx0fSxcbiAgICBcdFx0c3VjY2VzczogZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuICAgIFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBzZWxlY3RGaWVsZCApLmh0bWwoIGZpZWxkcyApO1xuICAgIFx0XHR9LFxuICAgIFx0XHRjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgIFx0XHRcdCQoICcuc3Bpbm5lci0nICsgc3lzdGVtICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG4gICAgXHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHQgKi9cblx0ZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBHZW5lcmF0ZXMgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiB0aGUgZHJvcGRvd24gYWN0aXZpdHkgYW5kIEFQSSByZXN1bHRzLlxuXHQgKiBUaGlzIGFsc28gZ2VuZXJhdGVzIG90aGVyIHF1ZXJ5IGZpZWxkcyB0aGF0IGFyZSBvYmplY3Qtc3BlY2lmaWMsIGxpa2UgZGF0ZSBmaWVsZHMsIHJlY29yZCB0eXBlcyBhbGxvd2VkLCBldGMuXG5cdCAqL1xuXHRmdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdFx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aW1lciA9IDA7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHRcdH07XG5cdFx0fSgpICk7XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0XHQnaW5jbHVkZScgOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdFx0XHRcdCdmaWVsZF90eXBlJyA6ICdkYXRldGltZScsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHRoYXQudmFsdWVcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJywgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJywgZGF0ZU1hcmt1cCA9ICcnO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cblxuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj5EZWZhdWx0IFJlY29yZCBUeXBlOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmh0bWwoIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nXG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+J1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgZGVsYXlUaW1lICk7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0ICogdGhpcyBhcHBlYXJzIG5vdCB0byB3b3JrIHdpdGggZGF0YSgpIGluc3RlYWQgb2YgYXR0cigpXG5cdCAqL1xuXHQgZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHRcdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciBuZXdLZXkgPSBuZXcgRGF0ZSgpLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuXHRcdFx0dmFyIGxhc3RSb3cgPSAkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmxhc3QoKTtcblx0XHRcdHZhciBvbGRLZXkgPSBsYXN0Um93LmF0dHIoICdkYXRhLWtleScgKTtcblx0XHRcdG9sZEtleSA9IG5ldyBSZWdFeHAoIG9sZEtleSwgJ2cnICk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRcdGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogQ2xvbmVzIHRoZSBmaWVsZHNldCBtYXJrdXAgcHJvdmlkZWQgYnkgdGhlIHNlcnZlci1zaWRlIHRlbXBsYXRlIGFuZCBhcHBlbmRzIGl0IGF0IHRoZSBlbmQuXG5cdCAqIHRoaXMgYXBwZWFycyBub3QgdG8gd29yayB3aXRoIGRhdGEoKSBpbnN0ZWFkIG9mIGF0dHIoKVxuXHQgKiBAcGFyYW0gc3RyaW5nIG9sZEtleSB0aGUgZGF0YSBrZXkgYXR0cmlidXRlIG9mIHRoZSBzZXQgdGhhdCBpcyBiZWluZyBjbG9uZWRcblx0ICogQHBhcmFtIHN0cmluZyBuZXdLZXkgdGhlIGRhdGEga2V5IGF0dHJpYnV0ZSBmb3IgdGhlIG9uZSB3ZSdyZSBhcHBlbmRpbmdcblx0ICogQHBhcmFtIG9iamVjdCBsYXN0Um93IHRoZSBsYXN0IHNldCBvZiB0aGUgZmllbGRtYXBcblx0ICovXG5cdGZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCBvbGRLZXksIG5ld0tleSwgbGFzdFJvdyApIHtcblx0XHR2YXIgbmV4dFJvdyA9ICcnO1xuICAgICAgICBpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuICAgICAgICBcdG5leHRSb3cgPSBsYXN0Um93LmZpbmQoICdzZWxlY3QnIClcblx0ICAgICAgICAgICAgLnNlbGVjdDIoICdkZXN0cm95JyApXG5cdCAgICAgICAgICAgIC5lbmQoKVxuXHQgICAgICAgICAgICAuY2xvbmUoIHRydWUgKS5yZW1vdmVDbGFzcyggJ2ZpZWxkbWFwLXRlbXBsYXRlJyApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICBcdG5leHRSb3cgPSBsYXN0Um93LmNsb25lKCB0cnVlICk7XG4gICAgICAgIH1cblx0XHQkKCBuZXh0Um93ICkuYXR0ciggJ2RhdGEta2V5JywgbmV3S2V5ICk7XG5cdFx0JCggbmV4dFJvdyApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCB0aGlzICkuaHRtbCggZnVuY3Rpb24oIGksIGggKSB7XG5cdFx0XHRcdHJldHVybiBoLnJlcGxhY2UoIG9sZEtleSwgbmV3S2V5ICk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbmV4dFJvdyApO1xuXHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRsYXN0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0bmV4dFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHR9XG5cdH1cblx0LyoqXG5cdCAqIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdCAqL1xuXHRmdW5jdGlvbiBwdXNoQW5kUHVsbE9iamVjdHMoKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0XHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19pZCcgOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWRcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdFxuXHRcdFx0fVxuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cblx0ICovXG5cdGZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0XHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHRcdCdtYXBwaW5nX2lkJyA6IG1hcHBpbmdJZFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHQgKi9cblx0ZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHRcdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHRcdH1cblx0XHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBsb2FkIGF2YWlsYWJsZSBvcHRpb25zIGlmIHRoZSB3b3JkcHJlc3Mgb2JqZWN0IGNoYW5nZXNcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aW1lb3V0O1xuXHRcdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCB0aGlzICkudmFsKCkgKTtcblx0XHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubm90KCAnLmZpZWxkbWFwLXRlbXBsYXRlJyApLnJlbW92ZSgpO1xuXHRcdH0sIDEwMDAgKTtcblx0fSk7XG5cblx0Ly8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgc2FsZXNmb3JjZSBvYmplY3QgY2hhbmdlc1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciB0aW1lb3V0O1xuXHRcdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggdGhpcyApLnZhbCgpICk7XG5cdFx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdFx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0XHR9LCAxMDAwICk7XG5cdH0pO1xuXG5cdC8vIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdCQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXHR9KTtcblxuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcblx0ICovXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzLCBpbml0aWFsaXplIG9yIGVuYWJsZSB0aGluZ3M6XG5cdCAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuXHQgKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuXHQgKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiBBUEkgcmVwb25zZVxuXHQgKiBNYW51YWwgcHVzaCBhbmQgcHVsbFxuXHQgKiBDbGVhcmluZyB0aGUgY2FjaGVcblx0ICovXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdFx0Ly8gRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0XHR0b2dnbGVTb2FwRmllbGRzKCk7XG5cblx0XHQvLyBpZiB0aGVyZSBpcyBhbHJlYWR5IGEgd3Agb3Igc2Ygb2JqZWN0LCBtYWtlIHN1cmUgaXQgaGFzIHRoZSByaWdodCBmaWVsZHMgd2hlbiB0aGUgcGFnZSBsb2Fkc1xuXHRcdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkudmFsKCkgKTtcblx0XHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCkgKTtcblxuXHRcdC8vIHNldHVwIHRoZSBzZWxlY3QyIGZpZWxkcyBpZiB0aGUgbGlicmFyeSBpcyBwcmVzZW50XG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblxuXHRcdC8vIGdldCB0aGUgYXZhaWxhYmxlIFNhbGVzZm9yY2Ugb2JqZWN0IGNob2ljZXNcblx0XHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG5cblx0XHQvLyBEdXBsaWNhdGUgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0XHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHRcdC8vIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdFx0cHVzaEFuZFB1bGxPYmplY3RzKCk7XG5cblx0XHQvLyBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdFx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cdH0pO1xuXG4iXX0=
}(jQuery));
