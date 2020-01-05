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
      $('table.fields tbody tr').not(':last').remove();
    }, 1000);
  }); // load available options if the salesforce object changes

  $(document).on('change', 'select#salesforce_object', function () {
    var timeout;
    loadFieldOptions('salesforce', $(this).val());
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      $('table.fields tbody tr').fadeOut();
      $('table.fields tbody tr').not(':last').remove();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJsb2FkRmllbGRPcHRpb25zIiwic3lzdGVtIiwib2JqZWN0X25hbWUiLCJkYXRhIiwiZmllbGRzIiwiZmlyc3RfZmllbGQiLCJmaXJzdCIsInRleHQiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwiZWFjaCIsImluZGV4IiwidmFsdWUiLCJrZXkiLCJuYW1lIiwibGFiZWwiLCJodG1sIiwidG9nZ2xlU29hcEZpZWxkcyIsImxlbmd0aCIsImlzIiwic2hvdyIsImhpZGUiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwib24iLCJ0aGF0IiwiZGVsYXlUaW1lIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0IiwidmFsIiwid29yZHByZXNzT2JqZWN0IiwibmV3S2V5IiwiRGF0ZSIsImdldFVUQ01pbGxpc2Vjb25kcyIsImxhc3RSb3ciLCJsYXN0Iiwib2xkS2V5IiwiYXR0ciIsIlJlZ0V4cCIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInJlbW92ZSIsInByZXBlbmQiLCJuZXh0Um93IiwiZW5kIiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImkiLCJoIiwicmVwbGFjZSIsImFwcGVuZCIsInB1c2hBbmRQdWxsT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwic3VjY2VzcyIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwiZG9jdW1lbnQiLCJ0aW1lb3V0Iiwibm90IiwicHJvcCIsInJlYWR5IiwiYWpheFN0YXJ0IiwiYWRkQ2xhc3MiLCJhamF4U3RvcCJdLCJtYXBwaW5ncyI6Ijs7QUFBRSxXQUFVQSxDQUFWLEVBQWM7QUFFZixXQUFTQyxnQkFBVCxDQUEyQkMsTUFBM0IsRUFBbUNDLFdBQW5DLEVBQWlEO0FBQ2hELFFBQUlDLElBQUksR0FBRztBQUNWLGdCQUFXLFNBQVNGLE1BQVQsR0FBa0I7QUFEbkIsS0FBWDtBQUdBLFFBQUlHLE1BQU0sR0FBRyxFQUFiO0FBQ0EsUUFBSUMsV0FBVyxHQUFHTixDQUFDLENBQUUsYUFBYUUsTUFBYixHQUFzQixzQkFBeEIsQ0FBRCxDQUFpREssS0FBakQsR0FBeURDLElBQXpELEVBQWxCO0FBQ0FILElBQUFBLE1BQU0sSUFBSSxzQkFBc0JDLFdBQXRCLEdBQW9DLFdBQTlDOztBQUNBLFFBQUssZ0JBQWdCSixNQUFyQixFQUE4QjtBQUM3QkUsTUFBQUEsSUFBSSxDQUFDLGtCQUFELENBQUosR0FBMkJELFdBQTNCO0FBQ0EsS0FGRCxNQUVPLElBQUssaUJBQWlCRCxNQUF0QixFQUErQjtBQUNyQ0UsTUFBQUEsSUFBSSxDQUFDLG1CQUFELENBQUosR0FBNEJELFdBQTVCO0FBQ0EsS0FGTSxNQUVBO0FBQ04sYUFBT0UsTUFBUDtBQUNBOztBQUNETCxJQUFBQSxDQUFDLENBQUNTLElBQUYsQ0FBUUMsT0FBUixFQUFpQk4sSUFBakIsRUFBdUIsVUFBVU8sUUFBVixFQUFxQjtBQUMzQ1gsTUFBQUEsQ0FBQyxDQUFDWSxJQUFGLENBQVFELFFBQVEsQ0FBQ1AsSUFBVCxDQUFjQyxNQUF0QixFQUE4QixVQUFVUSxLQUFWLEVBQWlCQyxLQUFqQixFQUF5QjtBQUN0RCxZQUFLLGdCQUFnQlosTUFBckIsRUFBOEI7QUFDN0JHLFVBQUFBLE1BQU0sSUFBSSxvQkFB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RCxDQUFpQ3dDLE9BQWpDO0FBQ0F4QyxNQUFBQSxDQUFDLENBQUUsZ0NBQUYsQ0FBRCxDQUFzQ3dDLE9BQXRDO0FBQ0F4QyxNQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q3dDLE9BQXZDO0FBQ0EsS0FoQjhCLENBa0IvQjs7O0FBQ0F4QyxJQUFBQSxDQUFDLENBQUVrRixRQUFGLENBQUQsQ0FBY0ssU0FBZCxDQUF5QixZQUFXO0FBQ25DdkYsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQndGLFFBQWhCLENBQTBCLFdBQTFCO0FBQ0EsS0FGRCxFQUVHQyxRQUZILENBRWEsWUFBVztBQUN2QnpGLE1BQUFBLENBQUMsQ0FBRSxVQUFGLENBQUQsQ0FBZ0I4RCxXQUFoQixDQUE2QixXQUE3QjtBQUNBLEtBSkQ7QUFLQXRDLElBQUFBLHNCQUFzQjtBQUN0QmlCLElBQUFBLGtCQUFrQixHQXpCYSxDQTJCL0I7O0FBQ0EwQixJQUFBQSxrQkFBa0IsR0E1QmEsQ0E4Qi9COztBQUNBYSxJQUFBQSxrQkFBa0I7QUFDbEIsR0FoQ0Q7QUFpQ0EsQ0E1VkMsRUE0VkMxQyxNQTVWRCxDQUFGIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBsb2FkRmllbGRPcHRpb25zKCBzeXN0ZW0sIG9iamVjdF9uYW1lICkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAnZ2V0XycgKyBzeXN0ZW0gKyAnX29iamVjdF9maWVsZHMnLFxuXHRcdH1cblx0XHR2YXIgZmllbGRzID0gJyc7XG5cdFx0dmFyIGZpcnN0X2ZpZWxkID0gJCggJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0IG9wdGlvbicpLmZpcnN0KCkudGV4dCgpO1xuXHRcdGZpZWxkcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPicgKyBmaXJzdF9maWVsZCArICc8L29wdGlvbj4nO1xuXHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdGRhdGFbJ3dvcmRwcmVzc19vYmplY3QnXSA9IG9iamVjdF9uYW1lO1xuXHRcdH0gZWxzZSBpZiAoICdzYWxlc2ZvcmNlJyA9PT0gc3lzdGVtICkge1xuXHRcdFx0ZGF0YVsnc2FsZXNmb3JjZV9vYmplY3QnXSA9IG9iamVjdF9uYW1lO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gZmllbGRzO1xuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggJ3dvcmRwcmVzcycgPT09IHN5c3RlbSApIHtcblx0XHRcdFx0XHRmaWVsZHMgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0fSBlbHNlIGlmICggJ3NhbGVzZm9yY2UnID09PSBzeXN0ZW0gKSB7XG5cdFx0XHRcdFx0ZmllbGRzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0JCggJy5jb2x1bW4tJyArIHN5c3RlbSArICdfZmllbGQgc2VsZWN0JyApLmh0bWwoIGZpZWxkcyApO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIERvbid0IHNob3cgdGhlIFdTREwgZmlsZSBmaWVsZCB1bmxlc3MgU09BUCBpcyBlbmFibGVkXG5cdCAqL1xuXHRmdW5jdGlvbiB0b2dnbGVTb2FwRmllbGRzKCkge1xuXHRcdGlmICggMCA8ICQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAnICkubGVuZ3RoICkge1xuXHRcdFx0aWYgKCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuc2hvdygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1zb2FwLXdzZGwtcGF0aCcgKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEdlbmVyYXRlcyB0aGUgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdFx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aW1lciA9IDA7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHRcdH07XG5cdFx0fSgpICk7XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAnZ2V0X3NhbGVzZm9yY2Vfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0XHQnaW5jbHVkZScgOiBbICdmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJyBdLFxuXHRcdFx0XHRcdCdmaWVsZF90eXBlJyA6ICdkYXRldGltZScsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHRoYXQudmFsdWVcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJywgcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgPSAnJywgZGF0ZU1hcmt1cCA9ICcnO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkXCI+QWxsb3dlZCBSZWNvcmQgVHlwZXM6PC9sYWJlbD48ZGl2IGNsYXNzPVwiY2hlY2tib3hlc1wiPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJmb3JtLWNoZWNrYm94XCIgdmFsdWU9XCInICsgaW5kZXggKyAnXCIgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRbJyArIGluZGV4ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQtJyArIGluZGV4ICsgJ1wiPiAnICsgdmFsdWUgKyAnPC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKz0gJzwvZGl2Pic7XG5cblxuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj5EZWZhdWx0IFJlY29yZCBUeXBlOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIiBpZD1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCByZWNvcmQgdHlwZSAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmh0bWwoIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmh0bWwoIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLmZpZWxkcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nXG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+J1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgZGVsYXlUaW1lICk7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0ICovXG5cdCBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdFx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIG5ld0tleSA9IG5ldyBEYXRlKCkuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG5cdFx0XHR2YXIgbGFzdFJvdyA9ICQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkubGFzdCgpO1xuXHRcdFx0dmFyIG9sZEtleSA9IGxhc3RSb3cuYXR0ciggJ2RhdGEta2V5JyApO1xuXHRcdFx0b2xkS2V5ID0gbmV3IFJlZ0V4cCggb2xkS2V5LCAnZycgKTtcblx0XHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdFx0ZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG5cdCAqIEBwYXJhbSBzdHJpbmcgb2xkS2V5IHRoZSBkYXRhLWtleSBhdHRyaWJ1dGUgb2YgdGhlIHNldCB0aGF0IGlzIGJlaW5nIGNsb25lZFxuXHQgKiBAcGFyYW0gc3RyaW5nIG5ld0tleSB0aGUgZGF0YS1rZXkgYXR0cmlidXRlIGZvciB0aGUgb25lIHdlJ3JlIGFwcGVuZGluZ1xuXHQgKiBAcGFyYW0gb2JqZWN0IGxhc3RSb3cgdGhlIGxhc3Qgc2V0IG9mIHRoZSBmaWVsZG1hcFxuXHQgKi9cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIG9sZEtleSwgbmV3S2V5LCBsYXN0Um93ICkge1xuXHRcdHZhciBuZXh0Um93ID0gJyc7XG4gICAgICAgIGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKVxuXHQgICAgICAgICAgICAuc2VsZWN0MiggJ2Rlc3Ryb3knIClcblx0ICAgICAgICAgICAgLmVuZCgpXG5cdCAgICAgICAgICAgIC5jbG9uZSggdHJ1ZSApLnJlbW92ZUNsYXNzKCAnZmllbGRtYXAtdGVtcGxhdGUnICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIFx0bmV4dFJvdyA9IGxhc3RSb3cuY2xvbmUoIHRydWUgKTtcbiAgICAgICAgfVxuXHRcdCQoIG5leHRSb3cgKS5hdHRyKCAnZGF0YS1rZXknLCBuZXdLZXkgKTtcblx0XHQkKCBuZXh0Um93ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdCQoIHRoaXMgKS5odG1sKCBmdW5jdGlvbiggaSwgaCApIHtcblx0XHRcdFx0cmV0dXJuIGgucmVwbGFjZSggb2xkS2V5LCBuZXdLZXkgKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBuZXh0Um93ICk7XG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdGxhc3RSb3cuZmluZCggJ3NlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRuZXh0Um93LmZpbmQoICdzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblx0fVxuXHQvKipcblx0ICogSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0ICovXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZFxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHRcdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdFx0J21hcHBpbmdfaWQnIDogbWFwcGluZ0lkXG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHdvcmRwcmVzcyBvYmplY3QgY2hhbmdlc1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JywgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoIHRoaXMgKS52YWwoKSApO1xuXHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICc6bGFzdCcgKS5yZW1vdmUoKTtcblx0XHR9LCAxMDAwICk7XG5cdH0pO1xuXG5cdC8vIGxvYWQgYXZhaWxhYmxlIG9wdGlvbnMgaWYgdGhlIHNhbGVzZm9yY2Ugb2JqZWN0IGNoYW5nZXNcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgdGltZW91dDtcblx0XHRsb2FkRmllbGRPcHRpb25zKCAnc2FsZXNmb3JjZScsICQoIHRoaXMgKS52YWwoKSApO1xuXHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5ub3QoICc6bGFzdCcgKS5yZW1vdmUoKTtcblx0XHR9LCAxMDAwICk7XG5cdH0pO1xuXG5cdC8vIHNob3cgd3NkbCBmaWVsZCBpZiBzb2FwIGlzIGVuYWJsZWRcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHR0b2dnbGVTb2FwRmllbGRzKCk7XG5cdH0pO1xuXG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHMsIGluaXRpYWxpemUgb3IgZW5hYmxlIHRoaW5nczpcblx0ICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG5cdCAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG5cdCAqIEFkZCBhIHNwaW5uZXIgZm9yIEFqYXggcmVxdWVzdHNcblx0ICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2Vcblx0ICogTWFudWFsIHB1c2ggYW5kIHB1bGxcblx0ICogQ2xlYXJpbmcgdGhlIGNhY2hlXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHRcdC8vIGZvciBtYWluIGFkbWluIHNldHRpbmdzXG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXG5cdFx0Ly8gaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdwIG9yIHNmIG9iamVjdCwgbWFrZSBzdXJlIGl0IGhhcyB0aGUgcmlnaHQgZmllbGRzXG5cdFx0bG9hZEZpZWxkT3B0aW9ucyggJ3dvcmRwcmVzcycsICQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS52YWwoKSApO1xuXHRcdGxvYWRGaWVsZE9wdGlvbnMoICdzYWxlc2ZvcmNlJywgJCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS52YWwoKSApO1xuXG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblxuXHRcdC8vIHRvZG86IG5lZWQgdG8gZml4IHRoaXMgc28gaXQgZG9lc24ndCBydW4gYWxsIHRoZSBzcGlubmVycyBhdCB0aGUgc2FtZSB0aW1lIHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlcyBvbiB0aGUgc2FtZSBwYWdlXG5cdFx0JCggZG9jdW1lbnQgKS5hamF4U3RhcnQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pLmFqYXhTdG9wKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KTtcblx0XHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG5cdFx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cblx0XHQvLyBmb3IgcHVzaC9wdWxsIG1ldGhvZHMgcnVubmluZyB2aWEgYWpheFxuXHRcdHB1c2hBbmRQdWxsT2JqZWN0cygpO1xuXG5cdFx0Ly8gZm9yIGNsZWFyaW5nIHRoZSBwbHVnaW4gY2FjaGVcblx0XHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblx0fSk7XG59KCBqUXVlcnkgKSApO1xuIl19
