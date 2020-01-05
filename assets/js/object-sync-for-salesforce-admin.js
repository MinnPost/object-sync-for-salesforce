"use strict";

(function ($) {
  function loadFieldOptions(system, object_name) {
    var data = {
      'action': 'get_' + system + '_object_fields'
    };
    var fields = '';
    var first_field = $('.column-' + system + '_field select option').first().text();
    fields += '<option value="">' + first_field + '</option>';

    if ('wordpress' === system) {
      data['wordpress_object'] = object_name;
    } else if ('salesforce' === system) {
      data['salesforce_object'] = object_name;
    } else {
      return fields;
    }

    $.post(ajaxurl, data, function (response) {
      $.each(response.data.fields, function (index, value) {
        if ('wordpress' === system) {
          fields += '<option value="' + value.key + '">' + value.key + '</option>';
        } else if ('salesforce' === system) {
          fields += '<option value="' + value.name + '">' + value.label + '</option>';
        }
      });
      $('.column-' + system + '_field select').html(fields);
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
   * Gets the WordPress and Salesforce field results via an Ajax call
   * @param string oldKey the data-key attribute of the set that is being cloned
   * @param string newKey the data-key attribute for the one we're appending
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
  }); // show wsdl field if soap is enabled

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
   * Add a spinner for Ajax requests
   * Manage the display for Salesforce object fields based on API reponse
   * Manual push and pull
   * Clearing the cache
   */

  $(document).ready(function () {
    // for main admin settings
    toggleSoapFields(); // if there is already a wp or sf object, make sure it has the right fields

    loadFieldOptions('wordpress', $('select#wordpress_object').val());
    loadFieldOptions('salesforce', $('select#salesforce_object').val());

    if (jQuery.fn.select2) {
      $('select#wordpress_object').select2();
      $('select#salesforce_object').select2();
      $('select#salesforce_record_type_default').select2();
      $('select#pull_trigger_field').select2();
      $('.column-wordpress_field select').select2();
      $('.column-salesforce_field select').select2();
    } // todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page


    $(document).ajaxStart(function () {
      $('.spinner').addClass('is-active');
    }).ajaxStop(function () {
      $('.spinner').removeClass('is-active');
    });
    salesforceObjectFields();
    addFieldMappingRow(); // for push/pull methods running via ajax

    pushAndPullObjects(); // for clearing the plugin cache

    clearSfwpCacheLink();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0X25hbWUiLCJkYXRhIiwiZmllbGRzIiwiZmlyc3RfZmllbGQiLCJmaXJzdCIsInRleHQiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJrZXkiLCJuYW1lIiwibGFiZWwiLCJodG1sIiwidG9nZ2xlU29hcEZpZWxkcyIsImxlbmd0aCIsImlzIiwic2hvdyIsImhpZGUiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0IiwidmFsIiwid29yZHByZXNzT2JqZWN0IiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiYXR0ciIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInJlbW92ZSIsInByZXBlbmQiLCJuZXh0Um93IiwiZW5kIiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsInB1c2hBbmRQdWxsT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwic3VjY2VzcyIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwiZG9jdW1lbnQiLCJ0aW1lb3V0Iiwibm90IiwicHJvcCIsInJlYWR5IiwiYWpheFN0YXJ0IiwiYWRkQ2xhc3MiLCJhamF4U3RvcCJdLCJtYXBwaW5ncyI6Ijs7QUFBRSxXQUFVQSxDQUFWLEVBQWM7QUFFZixXQUFTQyxnQkFBVCxDQUEyQkMsTUFBM0IsRUFBbUNDLFdBQW5DLEVBQWlEO0FBQ2hELFFBQUlDLElBQUksR0FBRztBQUNWLGdCQUFXLFNBQVNGLE1BQVQsR0FBa0I7QUFEbkIsS0FBWDtBQUdBLFFBQUlHLE1BQU0sR0FBRyxFQUFiO0FBQ0EsUUFBSUMsV0FBVyxHQUFHTixDQUFDLENBQUUsYUFBYUUsTUFBYixHQUFzQixzQkFBeEIsQ0FBRCxDQUFpREssS0FBakQsR0FBeURDLElBQXpELEVBQWxCO0FBQ0FILElBQUFBLE1BQU0sSUFBSSxzQkFBc0JDLFdBQXRCLEdBQW9DLFdBQTlDOztBQUNBLFFBQUssZ0JBQWdCSixNQUFyQixFQUE4QjtBQUM3QkUsTUFBQUEsSUFBSSxDQUFDLGtCQUFELENBQUosR0FBMkJELFdBQTNCO0FBQ0EsS0FGRCxNQUVPLElBQUssaUJBQWlCRCxNQUF0QixFQUErQjtBQUNyQ0UsTUFBQUEsSUFBSSxDQUFDLG1CQUFELENBQUosR0FBNEJELFdBQTVCO0FBQ0EsS0FGTSxNQUVBO0FBQ04sYUFBT0UsTUFBUDtBQUNBOztBQUNETCxJQUFBQSxDQUFDLENBQUNTLElBQUYsQ0FBUUMsT0FBUixFQUFpQk4sSUFBakIsRUFBdUIsVUFBVU8sUUFBVixFQUFxQjtBQUMzQ1gsTUFBQUEsQ0FBQyxDQUFDWSxJQUFGLENBQVFELFFBQVEsQ0FBQ1AsSUFBVCxDQUFjQyxNQUF0QixFQUE4QixVQUFVUSxLQUFWLEVBQWlCQyxLQUFqQixFQUF5QjtBQUN0RCxZQUFLLGdCQUFnQlosTUFBckIsRUFBOEI7QUFDN0JHLFVBQUFBLE1BQU0sSUFBSSxvQkFBb0JTLEtBQUssQ0FBQ0MsR0FBMUIsR0FBZ0MsSUFBaEMsR0FBdUNELEtBQUssQ0FBQ0MsR0FBN0MsR0FBbUQsV0FBN0Q7QUFDQSxTQUZELE1BRU8sSUFBSyxpQkFBaUJiLE1BQXRCLEVBQStCO0FBQ3JDRyxVQUFBQSxNQUFNLElBQUksb0JBQW9CUyxLQUFLLENBQUNFLElBQTFCLEdBQWlDLElBQWpDLEdBQXdDRixLQUFLLENBQUNHLEtBQTlDLEdBQXNELFdBQWhFO0FBQ0E7QUFDRCxPQU5EO0FBT0FqQixNQUFBQSxDQUFDLENBQUUsYUFBYUUsTUFBYixHQUFzQixlQUF4QixDQUFELENBQTJDZ0IsSUFBM0MsQ0FBaURiLE1BQWpEO0FBQ0EsS0FURDtBQVVBO0FBRUQ7Ozs7O0FBR0EsV0FBU2MsZ0JBQVQsR0FBNEI7QUFDM0IsUUFBSyxJQUFJbkIsQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NvQixNQUF4RCxFQUFpRTtBQUNoRSxVQUFLcEIsQ0FBQyxDQUFFLCtDQUFGLENBQUQsQ0FBcURxQixFQUFyRCxDQUF5RCxVQUF6RCxDQUFMLEVBQTZFO0FBQzVFckIsUUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0RzQixJQUFsRDtBQUNBLE9BRkQsTUFFTztBQUNOdEIsUUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0R1QixJQUFsRDtBQUNBO0FBQ0Q7QUFDRDtBQUVEOzs7OztBQUdBLFdBQVNDLHNCQUFULEdBQWtDO0FBRWpDLFFBQUlDLEtBQUssR0FBSyxZQUFXO0FBQ3hCLFVBQUlDLEtBQUssR0FBRyxDQUFaO0FBQ0EsYUFBTyxVQUFVQyxRQUFWLEVBQW9CQyxFQUFwQixFQUF5QjtBQUMvQkMsUUFBQUEsWUFBWSxDQUFHSCxLQUFILENBQVo7QUFDQUEsUUFBQUEsS0FBSyxHQUFHSSxVQUFVLENBQUVILFFBQUYsRUFBWUMsRUFBWixDQUFsQjtBQUNBLE9BSEQ7QUFJQSxLQU5hLEVBQWQ7O0FBUUEsUUFBSyxNQUFNNUIsQ0FBQyxDQUFFLHNDQUFGLENBQUQsQ0FBNENvQixNQUF2RCxFQUFnRTtBQUMvRHBCLE1BQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDdUIsSUFBeEM7QUFDQTs7QUFFRCxRQUFLLE1BQU12QixDQUFDLENBQUUscUNBQUYsQ0FBRCxDQUEyQ29CLE1BQXRELEVBQStEO0FBQzlEcEIsTUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUN1QixJQUF2QztBQUNBOztBQUNELFFBQUssTUFBTXZCLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCb0IsTUFBMUMsRUFBbUQ7QUFDbERwQixNQUFBQSxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQnVCLElBQTNCO0FBQ0E7O0FBRUR2QixJQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQitCLEVBQTFCLENBQThCLFFBQTlCLEVBQXdDLFlBQVc7QUFDbEQsVUFBSUMsSUFBSSxHQUFHLElBQVg7QUFDQSxVQUFJQyxTQUFTLEdBQUcsSUFBaEI7QUFDQVIsTUFBQUEsS0FBSyxDQUFFLFlBQVc7QUFDakIsWUFBSXJCLElBQUksR0FBRztBQUNWLG9CQUFXLG1DQUREO0FBRVYscUJBQVksQ0FBRSxRQUFGLEVBQVksaUJBQVosQ0FGRjtBQUdWLHdCQUFlLFVBSEw7QUFJViwrQkFBc0I0QixJQUFJLENBQUNsQjtBQUpqQixTQUFYO0FBTUFkLFFBQUFBLENBQUMsQ0FBQ1MsSUFBRixDQUFRQyxPQUFSLEVBQWlCTixJQUFqQixFQUF1QixVQUFVTyxRQUFWLEVBQXFCO0FBRTNDLGNBQUl1Qix3QkFBd0IsR0FBRyxFQUEvQjtBQUFBLGNBQW1DQyx1QkFBdUIsR0FBRyxFQUE3RDtBQUFBLGNBQWlFQyxVQUFVLEdBQUcsRUFBOUU7O0FBRUEsY0FBSyxJQUFJcEMsQ0FBQyxDQUFFVyxRQUFRLENBQUNQLElBQVQsQ0FBY2lDLGVBQWhCLENBQUQsQ0FBbUNqQixNQUE1QyxFQUFxRDtBQUNwRGMsWUFBQUEsd0JBQXdCLElBQUksb0dBQTVCO0FBQ0FsQyxZQUFBQSxDQUFDLENBQUNZLElBQUYsQ0FBUUQsUUFBUSxDQUFDUCxJQUFULENBQWNpQyxlQUF0QixFQUF1QyxVQUFVeEIsS0FBVixFQUFpQkMsS0FBakIsRUFBeUI7QUFDL0RvQixjQUFBQSx3QkFBd0IsSUFBSSxnRUFBZ0VyQixLQUFoRSxHQUF3RSwwQ0FBeEUsR0FBcUhBLEtBQXJILEdBQTZILHlDQUE3SCxHQUF5S0EsS0FBekssR0FBaUwsS0FBakwsR0FBeUxDLEtBQXpMLEdBQWlNLFVBQTdOO0FBQ0EsYUFGRDtBQUdBb0IsWUFBQUEsd0JBQXdCLElBQUksUUFBNUI7QUFHQUMsWUFBQUEsdUJBQXVCLElBQUksMEVBQTNCO0FBQ0FBLFlBQUFBLHVCQUF1QixJQUFJLG9JQUEzQjtBQUNBbkMsWUFBQUEsQ0FBQyxDQUFDWSxJQUFGLENBQVFELFFBQVEsQ0FBQ1AsSUFBVCxDQUFjaUMsZUFBdEIsRUFBdUMsVUFBVXhCLEtBQVYsRUFBaUJDLEtBQWpCLEVBQXlCO0FBQy9EcUIsY0FBQUEsdUJBQXVCLElBQUksb0JBQW9CdEIsS0FBcEIsR0FBNEIsSUFBNUIsR0FBbUNDLEtBQW5DLEdBQTJDLFdBQXRFO0FBQ0EsYUFGRDtBQUdBOztBQUVEZCxVQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q2tCLElBQXhDLENBQThDZ0Isd0JBQTlDO0FBQ0FsQyxVQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q2tCLElBQXZDLENBQTZDaUIsdUJBQTdDOztBQUVBLGNBQUssSUFBSW5DLENBQUMsQ0FBRVcsUUFBUSxDQUFDUCxJQUFULENBQWNDLE1BQWhCLENBQUQsQ0FBMEJlLE1BQW5DLEVBQTRDO0FBQzNDZ0IsWUFBQUEsVUFBVSxJQUFJLHFFQUFkO0FBQ0FBLFlBQUFBLFVBQVUsSUFBSSwyR0FBZDtBQUNBcEMsWUFBQUEsQ0FBQyxDQUFDWSxJQUFGLENBQVFELFFBQVEsQ0FBQ1AsSUFBVCxDQUFjQyxNQUF0QixFQUE4QixVQUFVUSxLQUFWLEVBQWlCQyxLQUFqQixFQUF5QjtBQUN0RHNCLGNBQUFBLFVBQVUsSUFBSSxvQkFBb0J0QixLQUFLLENBQUNFLElBQTFCLEdBQWlDLElBQWpDLEdBQXdDRixLQUFLLENBQUNHLEtBQTlDLEdBQXNELFdBQXBFO0FBQ0EsYUFGRDtBQUdBbUIsWUFBQUEsVUFBVSxJQUFJLFdBQWQ7QUFDQUEsWUFBQUEsVUFBVSxJQUFJLG1LQUFkO0FBQ0E7O0FBRURwQyxVQUFBQSxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQmtCLElBQTNCLENBQWlDa0IsVUFBakM7O0FBRUEsY0FBSyxPQUFPRix3QkFBWixFQUF1QztBQUN0Q2xDLFlBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDc0IsSUFBeEM7QUFDQSxXQUZELE1BRU87QUFDTnRCLFlBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDdUIsSUFBeEM7QUFDQTs7QUFDRCxjQUFLLE9BQU9ZLHVCQUFaLEVBQXNDO0FBQ3JDbkMsWUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNzQixJQUF2QztBQUNBLFdBRkQsTUFFTztBQUNOdEIsWUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUN1QixJQUF2QztBQUNBOztBQUVELGNBQUssT0FBT2EsVUFBWixFQUF5QjtBQUN4QnBDLFlBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCc0IsSUFBM0I7QUFDQSxXQUZELE1BRU87QUFDTnRCLFlBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCdUIsSUFBM0I7QUFDQTs7QUFFRCxjQUFLZSxNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4QnhDLFlBQUFBLENBQUMsQ0FBRSx1Q0FBRixDQUFELENBQTZDd0MsT0FBN0M7QUFDQXhDLFlBQUFBLENBQUMsQ0FBRSwyQkFBRixDQUFELENBQWlDd0MsT0FBakM7QUFDQTtBQUVELFNBeEREO0FBeURBLE9BaEVJLEVBZ0VGUCxTQWhFRSxDQUFMO0FBaUVBLEtBcEVEO0FBcUVBO0FBQ0Q7Ozs7O0FBR0MsV0FBU1Esa0JBQVQsR0FBOEI7QUFDOUJ6QyxJQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQjBDLEtBQTFCLENBQWlDLFlBQVc7QUFDM0MsVUFBSUMsZ0JBQWdCLEdBQUczQyxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQjRDLEdBQTFCLEVBQXZCO0FBQ0EsVUFBSUMsZUFBZSxHQUFHN0MsQ0FBQyxDQUFFLG1CQUFGLENBQUQsQ0FBeUI0QyxHQUF6QixFQUF0QjtBQUNBLFVBQUlFLE1BQU0sR0FBRyxJQUFJQyxJQUFKLEdBQVdDLGtCQUFYLEVBQWI7QUFDQSxVQUFJQyxPQUFPLEdBQUdqRCxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QmtELElBQTdCLEVBQWQ7QUFDQSxVQUFJQyxNQUFNLEdBQUdGLE9BQU8sQ0FBQ0csSUFBUixDQUFjLFVBQWQsQ0FBYjtBQUNBRCxNQUFBQSxNQUFNLEdBQUcsSUFBSUUsTUFBSixDQUFZRixNQUFaLEVBQW9CLEdBQXBCLENBQVQ7QUFDQW5ELE1BQUFBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVVEsSUFBVixDQUFnQiwyQkFBaEI7O0FBQ0EsVUFBSyxPQUFPcUMsZUFBUCxJQUEwQixPQUFPRixnQkFBdEMsRUFBeUQ7QUFDeERXLFFBQUFBLGNBQWMsQ0FBRUgsTUFBRixFQUFVTCxNQUFWLEVBQWtCRyxPQUFsQixDQUFkO0FBQ0FqRCxRQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVV1RCxNQUFWLEdBQW1CQyxJQUFuQixDQUF5QixpQkFBekIsRUFBNkNDLE1BQTdDO0FBQ0EsT0FIRCxNQUdPO0FBQ056RCxRQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVV1RCxNQUFWLEdBQW1CRyxPQUFuQixDQUE0Qix3SUFBNUI7QUFDQTs7QUFDRCxhQUFPLEtBQVA7QUFDQSxLQWZEO0FBZ0JBO0FBQ0Q7Ozs7Ozs7O0FBTUEsV0FBU0osY0FBVCxDQUF5QkgsTUFBekIsRUFBaUNMLE1BQWpDLEVBQXlDRyxPQUF6QyxFQUFtRDtBQUNsRCxRQUFJVSxPQUFPLEdBQUcsRUFBZDs7QUFDTSxRQUFLckIsTUFBTSxDQUFDQyxFQUFQLENBQVVDLE9BQWYsRUFBeUI7QUFDeEJtQixNQUFBQSxPQUFPLEdBQUdWLE9BQU8sQ0FBQ08sSUFBUixDQUFjLFFBQWQsRUFDTGhCLE9BREssQ0FDSSxTQURKLEVBRUxvQixHQUZLLEdBR0xDLEtBSEssQ0FHRSxJQUhGLEVBR1NDLFdBSFQsQ0FHc0IsbUJBSHRCLENBQVY7QUFJQSxLQUxELE1BS087QUFDTkgsTUFBQUEsT0FBTyxHQUFHVixPQUFPLENBQUNZLEtBQVIsQ0FBZSxJQUFmLENBQVY7QUFDQTs7QUFDUDdELElBQUFBLENBQUMsQ0FBRTJELE9BQUYsQ0FBRCxDQUFhUCxJQUFiLENBQW1CLFVBQW5CLEVBQStCTixNQUEvQjtBQUNBOUMsSUFBQUEsQ0FBQyxDQUFFMkQsT0FBRixDQUFELENBQWEvQyxJQUFiLENBQWtCLFlBQVc7QUFDNUJaLE1BQUFBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVWtCLElBQVYsQ0FBZ0IsVUFBVTZDLENBQVYsRUFBYUMsQ0FBYixFQUFpQjtBQUNoQyxlQUFPQSxDQUFDLENBQUNDLE9BQUYsQ0FBV2QsTUFBWCxFQUFtQkwsTUFBbkIsQ0FBUDtBQUNBLE9BRkQ7QUFHQSxLQUpEO0FBS0E5QyxJQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQmtFLE1BQTFCLENBQWtDUCxPQUFsQzs7QUFDQSxRQUFLckIsTUFBTSxDQUFDQyxFQUFQLENBQVVDLE9BQWYsRUFBeUI7QUFDeEJTLE1BQUFBLE9BQU8sQ0FBQ08sSUFBUixDQUFjLFFBQWQsRUFBeUJoQixPQUF6QjtBQUNBbUIsTUFBQUEsT0FBTyxDQUFDSCxJQUFSLENBQWMsUUFBZCxFQUF5QmhCLE9BQXpCO0FBQ0E7QUFDRDtBQUNEOzs7OztBQUdBLFdBQVMyQixrQkFBVCxHQUE4QjtBQUM3Qm5FLElBQUFBLENBQUMsQ0FBRSwrQkFBRixDQUFELENBQXFDdUIsSUFBckM7O0FBQ0EsUUFBSyxJQUFJdkIsQ0FBQyxDQUFFLHdCQUFGLENBQUQsQ0FBOEJvQixNQUF2QyxFQUFnRDtBQUMvQ3BCLE1BQUFBLENBQUMsQ0FBRSw0QkFBRixDQUFELENBQWtDK0IsRUFBbEMsQ0FBc0MsT0FBdEMsRUFBK0MsWUFBVztBQUN6RCxZQUFJYyxlQUFlLEdBQUc3QyxDQUFDLENBQUUsd0JBQUYsQ0FBRCxDQUE4QjRDLEdBQTlCLEVBQXRCO0FBQ0EsWUFBSXdCLFdBQVcsR0FBR3BFLENBQUMsQ0FBRSxvQkFBRixDQUFELENBQTBCNEMsR0FBMUIsRUFBbEI7QUFDQSxZQUFJeUIsWUFBWSxHQUFHckUsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkI0QyxHQUEzQixFQUFuQjtBQUNBLFlBQUl4QyxJQUFJLEdBQUc7QUFDVixvQkFBVyxvQkFERDtBQUVWLDhCQUFxQnlDLGVBRlg7QUFHViwwQkFBaUJ1QixXQUhQO0FBSVYsMkJBQWtCQztBQUpSLFNBQVg7QUFNQXJFLFFBQUFBLENBQUMsQ0FBQ1MsSUFBRixDQUFRQyxPQUFSLEVBQWlCTixJQUFqQixFQUF1QixVQUFVTyxRQUFWLEVBQXFCO0FBQzNDLGNBQUssU0FBU0EsUUFBUSxDQUFDMkQsT0FBdkIsRUFBaUM7QUFDaENDLFlBQUFBLDJCQUEyQjtBQUMzQnZFLFlBQUFBLENBQUMsQ0FBRSwrQkFBRixDQUFELENBQXFDd0UsS0FBckMsQ0FBNEN4RSxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQndFLEtBQS9CLEtBQXlDLEVBQXJGO0FBQ0F4RSxZQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ2tCLElBQXJDLENBQTJDLG1EQUEzQyxFQUFpR3VELE1BQWpHLEdBQTBHaEQsS0FBMUcsQ0FBaUgsSUFBakgsRUFBd0hpRCxPQUF4SDtBQUNBO0FBQ0QsU0FORDtBQU9BLGVBQU8sS0FBUDtBQUNBLE9BbEJEO0FBbUJBOztBQUNEMUUsSUFBQUEsQ0FBQyxDQUFFLDhCQUFGLENBQUQsQ0FBb0MrQixFQUFwQyxDQUF3QyxPQUF4QyxFQUFpRCxZQUFXO0FBQzNELFVBQUlzQyxZQUFZLEdBQUdyRSxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQjRDLEdBQTNCLEVBQW5CO0FBQ0EsVUFBSUMsZUFBZSxHQUFHN0MsQ0FBQyxDQUFFLHdCQUFGLENBQUQsQ0FBOEI0QyxHQUE5QixFQUF0QjtBQUNBLFVBQUl4QyxJQUFJLEdBQUc7QUFDVixrQkFBVyxzQkFERDtBQUVWLHlCQUFrQmlFLFlBRlI7QUFHViw0QkFBcUJ4QjtBQUhYLE9BQVg7QUFLQTdDLE1BQUFBLENBQUMsQ0FBQ1MsSUFBRixDQUFRQyxPQUFSLEVBQWlCTixJQUFqQixFQUF1QixVQUFVTyxRQUFWLEVBQXFCO0FBQzNDLFlBQUssU0FBU0EsUUFBUSxDQUFDMkQsT0FBdkIsRUFBaUM7QUFDaENDLFVBQUFBLDJCQUEyQjtBQUMzQnZFLFVBQUFBLENBQUMsQ0FBRSwrQkFBRixDQUFELENBQXFDd0UsS0FBckMsQ0FBNEN4RSxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQndFLEtBQS9CLEtBQXlDLEVBQXJGO0FBQ0F4RSxVQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ2tCLElBQXJDLENBQTJDLHFEQUEzQyxFQUFtR3VELE1BQW5HLEdBQTRHaEQsS0FBNUcsQ0FBbUgsSUFBbkgsRUFBMEhpRCxPQUExSDtBQUNBO0FBQ0QsT0FORDtBQU9BLGFBQU8sS0FBUDtBQUNBLEtBaEJEO0FBaUJBO0FBQ0Q7Ozs7O0FBR0EsV0FBU0gsMkJBQVQsR0FBdUM7QUFDdEMsUUFBSUksU0FBUyxHQUFHM0UsQ0FBQyxDQUFFLGtCQUFGLENBQUQsQ0FBd0I0QyxHQUF4QixFQUFoQjtBQUNBLFFBQUl4QyxJQUFJLEdBQUc7QUFDVixnQkFBVyxxQkFERDtBQUVWLG9CQUFldUU7QUFGTCxLQUFYO0FBSUEzRSxJQUFBQSxDQUFDLENBQUNTLElBQUYsQ0FBUUMsT0FBUixFQUFpQk4sSUFBakIsRUFBdUIsVUFBVU8sUUFBVixFQUFxQjtBQUMzQyxVQUFLLFNBQVNBLFFBQVEsQ0FBQzJELE9BQXZCLEVBQWlDO0FBQ2hDdEUsUUFBQUEsQ0FBQyxDQUFFLHNCQUFGLENBQUQsQ0FBNEJRLElBQTVCLENBQWtDRyxRQUFRLENBQUNQLElBQVQsQ0FBY3dFLGlCQUFoRDtBQUNBNUUsUUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJRLElBQTNCLENBQWlDRyxRQUFRLENBQUNQLElBQVQsQ0FBY3lFLGdCQUEvQztBQUNBN0UsUUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJRLElBQTNCLENBQWlDRyxRQUFRLENBQUNQLElBQVQsQ0FBYzBFLGdCQUEvQztBQUNBOUUsUUFBQUEsQ0FBQyxDQUFFLGNBQUYsQ0FBRCxDQUFvQlEsSUFBcEIsQ0FBMEJHLFFBQVEsQ0FBQ1AsSUFBVCxDQUFjMkUsU0FBeEM7O0FBQ0EsWUFBSyxRQUFRcEUsUUFBUSxDQUFDUCxJQUFULENBQWMwRSxnQkFBM0IsRUFBOEM7QUFDN0M5RSxVQUFBQSxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQlEsSUFBM0IsQ0FBaUMsU0FBakM7QUFDQTtBQUNEO0FBQ0QsS0FWRDtBQVdBO0FBQ0Q7Ozs7O0FBR0EsV0FBU3dFLGtCQUFULEdBQThCO0FBQzdCaEYsSUFBQUEsQ0FBQyxDQUFFLG1CQUFGLENBQUQsQ0FBeUIwQyxLQUF6QixDQUFnQyxZQUFXO0FBQzFDLFVBQUl0QyxJQUFJLEdBQUc7QUFDVixrQkFBVztBQURELE9BQVg7QUFHQSxVQUFJNEIsSUFBSSxHQUFHaEMsQ0FBQyxDQUFFLElBQUYsQ0FBWjtBQUNBQSxNQUFBQSxDQUFDLENBQUNTLElBQUYsQ0FBUUMsT0FBUixFQUFpQk4sSUFBakIsRUFBdUIsVUFBVU8sUUFBVixFQUFxQjtBQUMzQyxZQUFLLFNBQVNBLFFBQVEsQ0FBQzJELE9BQWxCLElBQTZCLFNBQVMzRCxRQUFRLENBQUNQLElBQVQsQ0FBY2tFLE9BQXpELEVBQW1FO0FBQ2xFdEMsVUFBQUEsSUFBSSxDQUFDdUIsTUFBTCxHQUFjckMsSUFBZCxDQUFvQlAsUUFBUSxDQUFDUCxJQUFULENBQWM2RSxPQUFsQyxFQUE0Q1IsTUFBNUM7QUFDQTtBQUNELE9BSkQ7QUFLQSxhQUFPLEtBQVA7QUFDQSxLQVhEO0FBWUEsR0F6UWMsQ0EyUWY7OztBQUNBekUsRUFBQUEsQ0FBQyxDQUFFa0YsUUFBRixDQUFELENBQWNuRCxFQUFkLENBQWtCLFFBQWxCLEVBQTRCLHlCQUE1QixFQUF1RCxZQUFXO0FBQ2pFLFFBQUlvRCxPQUFKO0FBQ0FsRixJQUFBQSxnQkFBZ0IsQ0FBRSxXQUFGLEVBQWVELENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVTRDLEdBQVYsRUFBZixDQUFoQjtBQUNBZixJQUFBQSxZQUFZLENBQUVzRCxPQUFGLENBQVo7QUFDQUEsSUFBQUEsT0FBTyxHQUFHckQsVUFBVSxDQUFFLFlBQVc7QUFDaEM5QixNQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjBFLE9BQTdCO0FBQ0ExRSxNQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2Qm9GLEdBQTdCLENBQWtDLG9CQUFsQyxFQUF5RDNCLE1BQXpEO0FBQ0EsS0FIbUIsRUFHakIsSUFIaUIsQ0FBcEI7QUFJQSxHQVJELEVBNVFlLENBc1JmOztBQUNBekQsRUFBQUEsQ0FBQyxDQUFFa0YsUUFBRixDQUFELENBQWNuRCxFQUFkLENBQWtCLFFBQWxCLEVBQTRCLDBCQUE1QixFQUF3RCxZQUFXO0FBQ2xFLFFBQUlvRCxPQUFKO0FBQ0FsRixJQUFBQSxnQkFBZ0IsQ0FBRSxZQUFGLEVBQWdCRCxDQUFDLENBQUUsSUFBRixDQUFELENBQVU0QyxHQUFWLEVBQWhCLENBQWhCO0FBQ0FmLElBQUFBLFlBQVksQ0FBRXNELE9BQUYsQ0FBWjtBQUNBQSxJQUFBQSxPQUFPLEdBQUdyRCxVQUFVLENBQUUsWUFBVztBQUNoQzlCLE1BQUFBLENBQUMsQ0FBRSx1QkFBRixDQUFELENBQTZCMEUsT0FBN0I7QUFDQTFFLE1BQUFBLENBQUMsQ0FBRSx1QkFBRixDQUFELENBQTZCb0YsR0FBN0IsQ0FBa0Msb0JBQWxDLEVBQXlEM0IsTUFBekQ7QUFDQSxLQUhtQixFQUdqQixJQUhpQixDQUFwQjtBQUlBLEdBUkQsRUF2UmUsQ0FpU2Y7O0FBQ0F6RCxFQUFBQSxDQUFDLENBQUVrRixRQUFGLENBQUQsQ0FBY25ELEVBQWQsQ0FBa0IsUUFBbEIsRUFBNEIsK0NBQTVCLEVBQTZFLFlBQVc7QUFDdkZaLElBQUFBLGdCQUFnQjtBQUNoQixHQUZEO0FBSUE7Ozs7QUFHQW5CLEVBQUFBLENBQUMsQ0FBRWtGLFFBQUYsQ0FBRCxDQUFjbkQsRUFBZCxDQUFrQixPQUFsQixFQUEyQiwyQkFBM0IsRUFBd0QsWUFBVztBQUNsRS9CLElBQUFBLENBQUMsQ0FBRSwyQkFBRixDQUFELENBQWlDb0YsR0FBakMsQ0FBc0MsSUFBdEMsRUFBNkNDLElBQTdDLENBQW1ELFNBQW5ELEVBQThELEtBQTlEO0FBQ0EsR0FGRDtBQUdBOzs7O0FBR0FyRixFQUFBQSxDQUFDLENBQUVrRixRQUFGLENBQUQsQ0FBY25ELEVBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsc0JBQTNCLEVBQW1ELFlBQVc7QUFDN0QvQixJQUFBQSxDQUFDLENBQUUsc0JBQUYsQ0FBRCxDQUE0Qm9GLEdBQTVCLENBQWlDLElBQWpDLEVBQXdDQyxJQUF4QyxDQUE4QyxTQUE5QyxFQUF5RCxLQUF6RDtBQUNBLEdBRkQ7QUFHQTs7Ozs7Ozs7OztBQVNBckYsRUFBQUEsQ0FBQyxDQUFFa0YsUUFBRixDQUFELENBQWNJLEtBQWQsQ0FBcUIsWUFBVztBQUUvQjtBQUNBbkUsSUFBQUEsZ0JBQWdCLEdBSGUsQ0FLL0I7O0FBQ0FsQixJQUFBQSxnQkFBZ0IsQ0FBRSxXQUFGLEVBQWVELENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCNEMsR0FBL0IsRUFBZixDQUFoQjtBQUNBM0MsSUFBQUEsZ0JBQWdCLENBQUUsWUFBRixFQUFnQkQsQ0FBQyxDQUFFLDBCQUFGLENBQUQsQ0FBZ0M0QyxHQUFoQyxFQUFoQixDQUFoQjs7QUFFQSxRQUFLTixNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4QnhDLE1BQUFBLENBQUMsQ0FBRSx5QkFBRixDQUFELENBQStCd0MsT0FBL0I7QUFDQXhDLE1BQUFBLENBQUMsQ0FBRSwwQkFBRixDQUFELENBQWdDd0MsT0FBaEM7QUFDQXhDLE1BQUFBLENBQUMsQ0FBRSx1Q0FBRixDQUFELENBQTZDd0MsT0FBN0M7QUFDQXhDLE1BQUFBLENBQUMsQ0FBRSwyQkFBRixDQUFELENBQWlDd0MsT0FBakM7QUFDQXhDLE1BQUFBLENBQUMsQ0FBRSxnQ0FBRixDQUFELENBQXNDd0MsT0FBdEM7QUFDQXhDLE1BQUFBLENBQUMsQ0FBRSxpQ0FBRixDQUFELENBQXVDd0MsT0FBdkM7QUFDQSxLQWhCOEIsQ0FrQi9COzs7QUFDQXhDLElBQUFBLENBQUMsQ0FBRWtGLFFBQUYsQ0FBRCxDQUFjSyxTQUFkLENBQXlCLFlBQVc7QUFDbkN2RixNQUFBQSxDQUFDLENBQUUsVUFBRixDQUFELENBQWdCd0YsUUFBaEIsQ0FBMEIsV0FBMUI7QUFDQSxLQUZELEVBRUdDLFFBRkgsQ0FFYSxZQUFXO0FBQ3ZCekYsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQjhELFdBQWhCLENBQTZCLFdBQTdCO0FBQ0EsS0FKRDtBQUtBdEMsSUFBQUEsc0JBQXNCO0FBQ3RCaUIsSUFBQUEsa0JBQWtCLEdBekJhLENBMkIvQjs7QUFDQTBCLElBQUFBLGtCQUFrQixHQTVCYSxDQThCL0I7O0FBQ0FhLElBQUFBLGtCQUFrQjtBQUNsQixHQWhDRDtBQWlDQSxDQTVWQyxFQTRWQzFDLE1BNVZELENBQUYiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGxvYWRGaWVsZE9wdGlvbnMoIHN5c3RlbSwgb2JqZWN0X25hbWUgKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdnZXRfJyArIHN5c3RlbSArICdfb2JqZWN0X2ZpZWxkcycsXG5cdFx0fVxuXHRcdHZhciBmaWVsZHMgPSAnJztcblx0XHR2YXIgZmlyc3RfZmllbGQgPSAkKCAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3Qgb3B0aW9uJykuZmlyc3QoKS50ZXh0KCk7XG5cdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+JyArIGZpcnN0X2ZpZWxkICsgJzwvb3B0aW9uPic7XG5cdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0ZGF0YVsnd29yZHByZXNzX29iamVjdCddID0gb2JqZWN0X25hbWU7XG5cdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRkYXRhWydzYWxlc2ZvcmNlX29iamVjdCddID0gb2JqZWN0X25hbWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBmaWVsZHM7XG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0aWYgKCAnd29yZHByZXNzJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0XHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAnc2FsZXNmb3JjZScgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQkKCAnLmNvbHVtbi0nICsgc3lzdGVtICsgJ19maWVsZCBzZWxlY3QnICkuaHRtbCggZmllbGRzICk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogRG9uJ3Qgc2hvdyB0aGUgV1NETCBmaWxlIGZpZWxkIHVubGVzcyBTT0FQIGlzIGVuYWJsZWRcblx0ICovXG5cdGZ1bmN0aW9uIHRvZ2dsZVNvYXBGaWVsZHMoKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCcgKS5sZW5ndGggKSB7XG5cdFx0XHRpZiAoICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cblx0ICovXG5cdGZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0XHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWVyID0gMDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdFx0fTtcblx0XHR9KCkgKTtcblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHR9XG5cdFx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJyA6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnLCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnLCBkYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPidcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaHRtbCggZGF0ZU1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSBkYXRlTWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9LCBkZWxheVRpbWUgKTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogRHVwbGljYXRlcyB0aGUgZmllbGRzIGZvciBhIG5ldyByb3cgaW4gdGhlIGZpZWxkbWFwIG9wdGlvbnMgc2NyZWVuLlxuXHQgKi9cblx0IGZ1bmN0aW9uIGFkZEZpZWxkTWFwcGluZ1JvdygpIHtcblx0XHQkKCAnI2FkZC1maWVsZC1tYXBwaW5nJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ID0gJCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgbmV3S2V5ID0gbmV3IERhdGUoKS5nZXRVVENNaWxsaXNlY29uZHMoKTtcblx0XHRcdHZhciBsYXN0Um93ID0gJCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5sYXN0KCk7XG5cdFx0XHR2YXIgb2xkS2V5ID0gbGFzdFJvdy5hdHRyKCAnZGF0YS1rZXknICk7XG5cdFx0XHRvbGRLZXkgPSBuZXcgUmVnRXhwKCBvbGRLZXksICdnJyApO1xuXHRcdFx0JCggdGhpcyApLnRleHQoICdBZGQgYW5vdGhlciBmaWVsZCBtYXBwaW5nJyApO1xuXHRcdFx0aWYgKCAnJyAhPT0gd29yZHByZXNzT2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0XHRmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKTtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZpbmQoICcubWlzc2luZy1vYmplY3QnICkucmVtb3ZlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkucHJlcGVuZCggJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcblx0ICogQHBhcmFtIHN0cmluZyBvbGRLZXkgdGhlIGRhdGEta2V5IGF0dHJpYnV0ZSBvZiB0aGUgc2V0IHRoYXQgaXMgYmVpbmcgY2xvbmVkXG5cdCAqIEBwYXJhbSBzdHJpbmcgbmV3S2V5IHRoZSBkYXRhLWtleSBhdHRyaWJ1dGUgZm9yIHRoZSBvbmUgd2UncmUgYXBwZW5kaW5nXG5cdCAqIEBwYXJhbSBvYmplY3QgbGFzdFJvdyB0aGUgbGFzdCBzZXQgb2YgdGhlIGZpZWxkbWFwXG5cdCAqL1xuXHRmdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggb2xkS2V5LCBuZXdLZXksIGxhc3RSb3cgKSB7XG5cdFx0dmFyIG5leHRSb3cgPSAnJztcbiAgICAgICAgaWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcbiAgICAgICAgXHRuZXh0Um93ID0gbGFzdFJvdy5maW5kKCAnc2VsZWN0JyApXG5cdCAgICAgICAgICAgIC5zZWxlY3QyKCAnZGVzdHJveScgKVxuXHQgICAgICAgICAgICAuZW5kKClcblx0ICAgICAgICAgICAgLmNsb25lKCB0cnVlICkucmVtb3ZlQ2xhc3MoICdmaWVsZG1hcC10ZW1wbGF0ZScgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgXHRuZXh0Um93ID0gbGFzdFJvdy5jbG9uZSggdHJ1ZSApO1xuICAgICAgICB9XG5cdFx0JCggbmV4dFJvdyApLmF0dHIoICdkYXRhLWtleScsIG5ld0tleSApO1xuXHRcdCQoIG5leHRSb3cgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggdGhpcyApLmh0bWwoIGZ1bmN0aW9uKCBpLCBoICkge1xuXHRcdFx0XHRyZXR1cm4gaC5yZXBsYWNlKCBvbGRLZXksIG5ld0tleSApO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG5leHRSb3cgKTtcblx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0bGFzdFJvdy5maW5kKCAnc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdG5leHRSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0fVxuXHR9XG5cdC8qKlxuXHQgKiBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHQgKi9cblx0ZnVuY3Rpb24gcHVzaEFuZFB1bGxPYmplY3RzKCkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdFx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHRcdCd3b3JkcHJlc3NfaWQnIDogd29yZHByZXNzSWQsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnIDogc2FsZXNmb3JjZUlkXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nIDogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnIDogc2FsZXNmb3JjZUlkLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3Rcblx0XHRcdH1cblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG5cdCAqL1xuXHRmdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdFx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0XHQnbWFwcGluZ19pZCcgOiBtYXBwaW5nSWRcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0ICovXG5cdGZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0XHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nIDogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0XHR9XG5cdFx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gbG9hZCBhdmFpbGFibGUgb3B0aW9ucyBpZiB0aGUgd29yZHByZXNzIG9iamVjdCBjaGFuZ2VzXG5cdCQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZW91dDtcblx0XHRsb2FkRmllbGRPcHRpb25zKCAnd29yZHByZXNzJywgJCggdGhpcyApLnZhbCgpICk7XG5cdFx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdFx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLm5vdCggJy5maWVsZG1hcC10ZW1wbGF0ZScgKS5yZW1vdmUoKTtcblx0XHR9LCAxMDAwICk7XG5cdH0pO1xuXG5cdC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZW91dDtcblx0XHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICcuZmllbGRtYXAtdGVtcGxhdGUnICkucmVtb3ZlKCk7XG5cdFx0fSwgMTAwMCApO1xuXHR9KTtcblxuXHQvLyBzaG93IHdzZGwgZmllbGQgaWYgc29hcCBpcyBlbmFibGVkXG5cdCQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXHR9KTtcblxuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcblx0ICovXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzLCBpbml0aWFsaXplIG9yIGVuYWJsZSB0aGluZ3M6XG5cdCAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuXHQgKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuXHQgKiBBZGQgYSBzcGlubmVyIGZvciBBamF4IHJlcXVlc3RzXG5cdCAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG5cdCAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG5cdCAqIENsZWFyaW5nIHRoZSBjYWNoZVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0XHQvLyBmb3IgbWFpbiBhZG1pbiBzZXR0aW5nc1xuXHRcdHRvZ2dsZVNvYXBGaWVsZHMoKTtcblxuXHRcdC8vIGlmIHRoZXJlIGlzIGFscmVhZHkgYSB3cCBvciBzZiBvYmplY3QsIG1ha2Ugc3VyZSBpdCBoYXMgdGhlIHJpZ2h0IGZpZWxkc1xuXHRcdGxvYWRGaWVsZE9wdGlvbnMoICd3b3JkcHJlc3MnLCAkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkudmFsKCkgKTtcblx0XHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCkgKTtcblxuXHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHQkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHR9XG5cblx0XHQvLyB0b2RvOiBuZWVkIHRvIGZpeCB0aGlzIHNvIGl0IGRvZXNuJ3QgcnVuIGFsbCB0aGUgc3Bpbm5lcnMgYXQgdGhlIHNhbWUgdGltZSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZXMgb24gdGhlIHNhbWUgcGFnZVxuXHRcdCQoIGRvY3VtZW50ICkuYWpheFN0YXJ0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KS5hamF4U3RvcCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXInICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSk7XG5cdFx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xuXHRcdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXG5cdFx0Ly8gZm9yIHB1c2gvcHVsbCBtZXRob2RzIHJ1bm5pbmcgdmlhIGFqYXhcblx0XHRwdXNoQW5kUHVsbE9iamVjdHMoKTtcblxuXHRcdC8vIGZvciBjbGVhcmluZyB0aGUgcGx1Z2luIGNhY2hlXG5cdFx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cdH0pO1xufSggalF1ZXJ5ICkgKTtcbiJdfQ==
