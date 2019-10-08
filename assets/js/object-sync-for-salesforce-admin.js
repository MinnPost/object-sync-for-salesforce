"use strict";

(function ($) {
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
      var rowKey;
      $(this).text('Add another field mapping');

      if ('' !== wordpressObject && '' !== salesforceObject) {
        rowKey = Math.floor(Date.now() / 1000);
        fieldmapFields(wordpressObject, salesforceObject, rowKey);
        $(this).parent().find('.missing-object').remove();
        salesforceFieldInfo();
      } else {
        $(this).parent().prepend('<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>');
      }

      return false;
    });
  }
  /**
   * Based on the Salesforce field's info, we can set some options for how the data is handled
   */


  function salesforceFieldInfo() {
    var wordpressFieldOptions = '.wordpresss_field_options';
    var salesforceObject = $('#salesforce_object').val();
    $(wordpressFieldOptions).hide();

    if ('' !== salesforceObject) {
      $(document).on('change', '[id^=salesforce_field-]', function () {
        var data = {
          'action': 'get_salesforce_field_info',
          'salesforce_object': salesforceObject,
          'salesforce_field': $(this).val()
        };
        var parent = $(this).parent().parent();
        $(wordpressFieldOptions, $(parent)).hide();
        $.post(ajaxurl, data, function (response) {
          if (true === response.success && 'undefined' !== typeof response.data.type) {
            var salesforceFieldType = response.data.type;
            $(wordpressFieldOptions, $(parent)).show();
          }
        });
      });
    }
  }
  /**
   * Gets the WordPress and Salesforce field results via an Ajax call
   * @param string wordpressObject the WordPress object type
   * @param string salesforceObject the Salesforce object type
   * @param int rowKey which row we're working on
   */


  function fieldmapFields(wordpressObject, salesforceObject, rowKey) {
    var data = {
      'action': 'get_wp_sf_object_fields',
      'wordpress_object': wordpressObject,
      'salesforce_object': salesforceObject
    };
    $.post(ajaxurl, data, function (response) {
      var wordpress = '';
      var salesforce = '';
      var markup = '';
      wordpress += '<select name="wordpress_field[' + rowKey + ']" id="wordpress_field-' + rowKey + '">';
      wordpress += '<option value="">- Select WordPress field -</option>';
      $.each(response.data.wordpress, function (index, value) {
        wordpress += '<option value="' + value.key + '">' + value.key + '</option>';
      });
      wordpress += '</select>';
      salesforce += '<select name="salesforce_field[' + rowKey + ']" id="salesforce_field-' + rowKey + '">';
      salesforce += '<option value="">- Select Salesforce field -</option>';
      $.each(response.data.salesforce, function (index, value) {
        salesforce += '<option value="' + value.name + '">' + value.label + '</option>';
      });
      salesforce += '</select>';
      markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + rowKey + ']" id="is_prematch-' + rowKey + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + rowKey + ']" id="is_key-' + rowKey + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sync" name="direction[' + rowKey + ']" id="direction-' + rowKey + '-sync" checked>  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + rowKey + ']" id="is_delete-' + rowKey + '" value="1" /></td></tr>';
      $('table.fields tbody').append(markup);

      if (jQuery.fn.select2) {
        $('.column-wordpress_field select').select2();
        $('.column-salesforce_field select').select2();
      }
    });
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
  } // show wsdl field if soap is enabled


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
    toggleSoapFields(); // for the fieldmap add/edit screen

    var timeout;

    if (jQuery.fn.select2) {
      $('select#wordpress_object').select2();
      $('select#salesforce_object').select2();
      $('select#salesforce_record_type_default').select2();
      $('select#pull_trigger_field').select2();
      $('.column-wordpress_field select').select2();
      $('.column-salesforce_field select').select2();
    }

    $('#wordpress_object, #salesforce_object').on('change', function () {
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        $('table.fields tbody tr').fadeOut();
        $('table.fields tbody tr').remove();
      }, 1000);
    }); // todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page

    $(document).ajaxStart(function () {
      $('.spinner').addClass('is-active');
    }).ajaxStop(function () {
      $('.spinner').removeClass('is-active');
    });
    salesforceObjectFields();
    addFieldMappingRow();
    salesforceFieldInfo(); // for push/pull methods running via ajax

    pushAndPullObjects(); // for clearing the plugin cache

    clearSfwpCacheLink();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJ0b2dnbGVTb2FwRmllbGRzIiwibGVuZ3RoIiwiaXMiLCJzaG93IiwiaGlkZSIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJkZWxheSIsInRpbWVyIiwiY2FsbGJhY2siLCJtcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJvbiIsInRoYXQiLCJkZWxheVRpbWUiLCJkYXRhIiwidmFsdWUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwiZWFjaCIsImluZGV4IiwiaHRtbCIsImZpZWxkcyIsIm5hbWUiLCJsYWJlbCIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsInZhbCIsIndvcmRwcmVzc09iamVjdCIsInJvd0tleSIsInRleHQiLCJNYXRoIiwiZmxvb3IiLCJEYXRlIiwibm93IiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicmVtb3ZlIiwic2FsZXNmb3JjZUZpZWxkSW5mbyIsInByZXBlbmQiLCJ3b3JkcHJlc3NGaWVsZE9wdGlvbnMiLCJkb2N1bWVudCIsInN1Y2Nlc3MiLCJ0eXBlIiwic2FsZXNmb3JjZUZpZWxkVHlwZSIsIndvcmRwcmVzcyIsInNhbGVzZm9yY2UiLCJtYXJrdXAiLCJrZXkiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwibm90IiwicHJvcCIsInJlYWR5IiwidGltZW91dCIsImFqYXhTdGFydCIsImFkZENsYXNzIiwiYWpheFN0b3AiLCJyZW1vdmVDbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBRSxXQUFVQSxDQUFWLEVBQWM7QUFFZjs7O0FBR0EsV0FBU0MsZ0JBQVQsR0FBNEI7QUFDM0IsUUFBSyxJQUFJRCxDQUFDLENBQUUseUNBQUYsQ0FBRCxDQUErQ0UsTUFBeEQsRUFBaUU7QUFDaEUsVUFBS0YsQ0FBQyxDQUFFLCtDQUFGLENBQUQsQ0FBcURHLEVBQXJELENBQXlELFVBQXpELENBQUwsRUFBNkU7QUFDNUVILFFBQUFBLENBQUMsQ0FBRSw0Q0FBRixDQUFELENBQWtESSxJQUFsRDtBQUNBLE9BRkQsTUFFTztBQUNOSixRQUFBQSxDQUFDLENBQUUsNENBQUYsQ0FBRCxDQUFrREssSUFBbEQ7QUFDQTtBQUNEO0FBQ0Q7QUFFRDs7Ozs7QUFHQSxXQUFTQyxzQkFBVCxHQUFrQztBQUVqQyxRQUFJQyxLQUFLLEdBQUssWUFBVztBQUN4QixVQUFJQyxLQUFLLEdBQUcsQ0FBWjtBQUNBLGFBQU8sVUFBVUMsUUFBVixFQUFvQkMsRUFBcEIsRUFBeUI7QUFDL0JDLFFBQUFBLFlBQVksQ0FBR0gsS0FBSCxDQUFaO0FBQ0FBLFFBQUFBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFGLEVBQVlDLEVBQVosQ0FBbEI7QUFDQSxPQUhEO0FBSUEsS0FOYSxFQUFkOztBQVFBLFFBQUssTUFBTVYsQ0FBQyxDQUFFLHNDQUFGLENBQUQsQ0FBNENFLE1BQXZELEVBQWdFO0FBQy9ERixNQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0ssSUFBeEM7QUFDQTs7QUFFRCxRQUFLLE1BQU1MLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDRSxNQUF0RCxFQUErRDtBQUM5REYsTUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNLLElBQXZDO0FBQ0E7O0FBQ0QsUUFBSyxN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LEtBRkQsRUFFR0MsUUFGSCxDQUVhLFlBQVc7QUFDdkJqRixNQUFBQSxDQUFDLENBQUUsVUFBRixDQUFELENBQWdCa0YsV0FBaEIsQ0FBNkIsV0FBN0I7QUFDQSxLQUpEO0FBS0E1RSxJQUFBQSxzQkFBc0I7QUFDdEI0QixJQUFBQSxrQkFBa0I7QUFDbEJlLElBQUFBLG1CQUFtQixHQWpDWSxDQW1DL0I7O0FBQ0FZLElBQUFBLGtCQUFrQixHQXBDYSxDQXNDL0I7O0FBQ0FZLElBQUFBLGtCQUFrQjtBQUNsQixHQXhDRDtBQXlDQSxDQTFWQyxFQTBWQzFDLE1BMVZELENBQUYiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdC8qKlxuXHQgKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHQgKi9cblx0ZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBHZW5lcmF0ZXMgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiB0aGUgZHJvcGRvd24gYWN0aXZpdHkgYW5kIEFQSSByZXN1bHRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHRcdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0XHR9O1xuXHRcdH0oKSApO1xuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdH1cblx0XHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdFx0J2luY2x1ZGUnIDogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0XHQnZmllbGRfdHlwZScgOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiB0aGF0LnZhbHVlXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cblx0XHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJycsIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJycsIGRhdGVNYXJrdXAgPSAnJztcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXG5cblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+J1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPidcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIGRlbGF5VGltZSApO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdCAqL1xuXHQgZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHRcdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciByb3dLZXk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRcdHJvd0tleSA9IE1hdGguZmxvb3IoIERhdGUubm93KCkgLyAxMDAwICk7XG5cdFx0XHRcdGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdFx0c2FsZXNmb3JjZUZpZWxkSW5mbygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBCYXNlZCBvbiB0aGUgU2FsZXNmb3JjZSBmaWVsZCdzIGluZm8sIHdlIGNhbiBzZXQgc29tZSBvcHRpb25zIGZvciBob3cgdGhlIGRhdGEgaXMgaGFuZGxlZFxuXHQgKi9cblx0ZnVuY3Rpb24gc2FsZXNmb3JjZUZpZWxkSW5mbygpIHtcblx0XHR2YXIgd29yZHByZXNzRmllbGRPcHRpb25zID0gJy53b3JkcHJlc3NzX2ZpZWxkX29wdGlvbnMnO1xuXHRcdHZhciBzYWxlc2ZvcmNlT2JqZWN0ICAgICAgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdCQoIHdvcmRwcmVzc0ZpZWxkT3B0aW9ucyApLmhpZGUoKTtcblx0XHRpZiAoICcnICE9PSBzYWxlc2ZvcmNlT2JqZWN0ICkge1xuXHRcdFx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICdbaWRePXNhbGVzZm9yY2VfZmllbGQtXScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyAgICAgICAgICAgIDogJ2dldF9zYWxlc2ZvcmNlX2ZpZWxkX2luZm8nLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiBzYWxlc2ZvcmNlT2JqZWN0LFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX2ZpZWxkJyAgOiAkKCB0aGlzICkudmFsKClcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgcGFyZW50ID0gJCggdGhpcyApLnBhcmVudCgpLnBhcmVudCgpO1xuXHRcdFx0XHQkKCB3b3JkcHJlc3NGaWVsZE9wdGlvbnMsICQoIHBhcmVudCApKS5oaWRlKCk7XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHJlc3BvbnNlLmRhdGEudHlwZSApIHtcblx0XHRcdFx0XHRcdHZhciBzYWxlc2ZvcmNlRmllbGRUeXBlID0gcmVzcG9uc2UuZGF0YS50eXBlO1xuXHRcdFx0XHRcdFx0JCggd29yZHByZXNzRmllbGRPcHRpb25zLCAkKCBwYXJlbnQgKSApLnNob3coKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEdldHMgdGhlIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBmaWVsZCByZXN1bHRzIHZpYSBhbiBBamF4IGNhbGxcblx0ICogQHBhcmFtIHN0cmluZyB3b3JkcHJlc3NPYmplY3QgdGhlIFdvcmRQcmVzcyBvYmplY3QgdHlwZVxuXHQgKiBAcGFyYW0gc3RyaW5nIHNhbGVzZm9yY2VPYmplY3QgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGVcblx0ICogQHBhcmFtIGludCByb3dLZXkgd2hpY2ggcm93IHdlJ3JlIHdvcmtpbmcgb25cblx0ICovXG5cdGZ1bmN0aW9uIGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ2dldF93cF9zZl9vYmplY3RfZmllbGRzJyxcblx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiBzYWxlc2ZvcmNlT2JqZWN0XG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0dmFyIHdvcmRwcmVzcyA9ICcnO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2UgPSAnJztcblx0XHRcdHZhciBtYXJrdXAgPSAnJztcblxuXHRcdFx0d29yZHByZXNzICs9ICc8c2VsZWN0IG5hbWU9XCJ3b3JkcHJlc3NfZmllbGRbJyArIHJvd0tleSArICddXCIgaWQ9XCJ3b3JkcHJlc3NfZmllbGQtJyArIHJvd0tleSArICdcIj4nXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBXb3JkUHJlc3MgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEud29yZHByZXNzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0d29yZHByZXNzICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX2ZpZWxkWycgKyByb3dLZXkgKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9maWVsZC0nICsgcm93S2V5ICsgJ1wiPidcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBTYWxlc2ZvcmNlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnNhbGVzZm9yY2UsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0bWFya3VwID0gJzx0cj48dGQgY2xhc3M9XCJjb2x1bW4td29yZHByZXNzX2ZpZWxkXCI+JyArIHdvcmRwcmVzcyArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkXCI+JyArIHNhbGVzZm9yY2UgKyAnPC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfcHJlbWF0Y2hcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX3ByZW1hdGNoWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfcHJlbWF0Y2gtJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19rZXlcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX2tleVsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX2tleS0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4tZGlyZWN0aW9uXCI+PGRpdiBjbGFzcz1cInJhZGlvc1wiPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzZl93cFwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctc2Ytd3BcIj4gIFNhbGVzZm9yY2UgdG8gV29yZFByZXNzPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwid3Bfc2ZcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXdwLXNmXCI+ICBXb3JkUHJlc3MgdG8gU2FsZXNmb3JjZTwvbGFiZWw+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cInN5bmNcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXN5bmNcIiBjaGVja2VkPiAgU3luYzwvbGFiZWw+PC9kaXY+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfZGVsZXRlXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19kZWxldGVbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19kZWxldGUtJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PC90cj4nO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG1hcmt1cCApO1xuXG5cdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIEhhbmRsZSBtYW51YWwgcHVzaCBhbmQgcHVsbCBvZiBvYmplY3RzXG5cdCAqL1xuXHRmdW5jdGlvbiBwdXNoQW5kUHVsbE9iamVjdHMoKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0XHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NJZCA9ICQoICcjd29yZHByZXNzX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19pZCcgOiB3b3JkcHJlc3NJZCxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWRcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdFxuXHRcdFx0fVxuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIFVwZGF0ZXMgdGhlIHVzZXIgcHJvZmlsZSBzdW1tYXJ5IG9mIFNhbGVzZm9yY2UgaW5mby5cblx0ICovXG5cdGZ1bmN0aW9uIHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpIHtcblx0XHR2YXIgbWFwcGluZ0lkID0gJCggJyNtYXBwaW5nX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHRcdCdtYXBwaW5nX2lkJyA6IG1hcHBpbmdJZFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogQ2xlYXIgdGhlIHBsdWdpbiBjYWNoZSB2aWEgQWpheCByZXF1ZXN0LlxuXHQgKi9cblx0ZnVuY3Rpb24gY2xlYXJTZndwQ2FjaGVMaW5rKCkge1xuXHRcdCQoICcjY2xlYXItc2Z3cC1jYWNoZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHRcdH1cblx0XHRcdHZhciB0aGF0ID0gJCggdGhpcyApO1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyAmJiB0cnVlID09PSByZXNwb25zZS5kYXRhLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dGhhdC5wYXJlbnQoKS5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5mYWRlSW4oKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBzaG93IHdzZGwgZmllbGQgaWYgc29hcCBpcyBlbmFibGVkXG5cdCQoIGRvY3VtZW50ICkub24oICdjaGFuZ2UnLCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXHR9KTtcblxuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaFxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogQXMgdGhlIERydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBrZXlcblx0ICovXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXHQvKipcblx0ICogV2hlbiB0aGUgcGx1Z2luIGxvYWRzLCBpbml0aWFsaXplIG9yIGVuYWJsZSB0aGluZ3M6XG5cdCAqIFNlbGVjdDIgb24gc2VsZWN0IGZpZWxkc1xuXHQgKiBDbGVhciBmaWVsZHMgd2hlbiB0aGUgdGFyZ2V0ZWQgV29yZFByZXNzIG9yIFNhbGVzZm9yY2Ugb2JqZWN0IHR5cGUgY2hhbmdlc1xuXHQgKiBBZGQgYSBzcGlubmVyIGZvciBBamF4IHJlcXVlc3RzXG5cdCAqIE1hbmFnZSB0aGUgZGlzcGxheSBmb3IgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFQSSByZXBvbnNlXG5cdCAqIE1hbnVhbCBwdXNoIGFuZCBwdWxsXG5cdCAqIENsZWFyaW5nIHRoZSBjYWNoZVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cblx0XHQvLyBmb3IgbWFpbiBhZG1pbiBzZXR0aW5nc1xuXHRcdHRvZ2dsZVNvYXBGaWVsZHMoKTtcblxuXHRcdC8vIGZvciB0aGUgZmllbGRtYXAgYWRkL2VkaXQgc2NyZWVuXG5cdFx0dmFyIHRpbWVvdXQ7XG5cblx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0fVxuXG5cdFx0JCggJyN3b3JkcHJlc3Nfb2JqZWN0LCAjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5yZW1vdmUoKTtcblx0XHRcdH0sIDEwMDAgKTtcblx0XHR9KTtcblxuXHRcdC8vIHRvZG86IG5lZWQgdG8gZml4IHRoaXMgc28gaXQgZG9lc24ndCBydW4gYWxsIHRoZSBzcGlubmVycyBhdCB0aGUgc2FtZSB0aW1lIHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlcyBvbiB0aGUgc2FtZSBwYWdlXG5cdFx0JCggZG9jdW1lbnQgKS5hamF4U3RhcnQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pLmFqYXhTdG9wKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KTtcblx0XHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG5cdFx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cdFx0c2FsZXNmb3JjZUZpZWxkSW5mbygpO1xuXG5cdFx0Ly8gZm9yIHB1c2gvcHVsbCBtZXRob2RzIHJ1bm5pbmcgdmlhIGFqYXhcblx0XHRwdXNoQW5kUHVsbE9iamVjdHMoKTtcblxuXHRcdC8vIGZvciBjbGVhcmluZyB0aGUgcGx1Z2luIGNhY2hlXG5cdFx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cdH0pO1xufSggalF1ZXJ5ICkgKTtcbiJdfQ==
