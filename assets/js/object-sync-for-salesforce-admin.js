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
      } else {
        $(this).parent().prepend('<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>');
      }

      return false;
    });
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
    addFieldMappingRow(); // for push/pull methods running via ajax

    pushAndPullObjects(); // for clearing the plugin cache

    clearSfwpCacheLink();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJ0b2dnbGVTb2FwRmllbGRzIiwibGVuZ3RoIiwiaXMiLCJzaG93IiwiaGlkZSIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJkZWxheSIsInRpbWVyIiwiY2FsbGJhY2siLCJtcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJvbiIsInRoYXQiLCJkZWxheVRpbWUiLCJkYXRhIiwidmFsdWUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwicmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwIiwicmVjb3JkVHlwZURlZmF1bHRNYXJrdXAiLCJkYXRlTWFya3VwIiwicmVjb3JkVHlwZUluZm9zIiwiZWFjaCIsImluZGV4IiwiaHRtbCIsImZpZWxkcyIsIm5hbWUiLCJsYWJlbCIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsImFkZEZpZWxkTWFwcGluZ1JvdyIsImNsaWNrIiwic2FsZXNmb3JjZU9iamVjdCIsInZhbCIsIndvcmRwcmVzc09iamVjdCIsInJvd0tleSIsInRleHQiLCJNYXRoIiwiZmxvb3IiLCJEYXRlIiwibm93IiwiZmllbGRtYXBGaWVsZHMiLCJwYXJlbnQiLCJmaW5kIiwicmVtb3ZlIiwicHJlcGVuZCIsIndvcmRwcmVzcyIsInNhbGVzZm9yY2UiLCJtYXJrdXAiLCJrZXkiLCJhcHBlbmQiLCJwdXNoQW5kUHVsbE9iamVjdHMiLCJ3b3JkcHJlc3NJZCIsInNhbGVzZm9yY2VJZCIsInN1Y2Nlc3MiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImZhZGVPdXQiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsImRvY3VtZW50Iiwibm90IiwicHJvcCIsInJlYWR5IiwidGltZW91dCIsImFqYXhTdGFy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SUFBQUEsc0JBQXNCO0FBQ3RCNEIsSUFBQUEsa0JBQWtCLEdBaENhLENBa0MvQjs7QUFDQXFCLElBQUFBLGtCQUFrQixHQW5DYSxDQXFDL0I7O0FBQ0FhLElBQUFBLGtCQUFrQjtBQUNsQixHQXZDRDtBQXdDQSxDQTlUQyxFQThUQ3JDLE1BOVRELENBQUYiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdC8qKlxuXHQgKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHQgKi9cblx0ZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBHZW5lcmF0ZXMgdGhlIFNhbGVzZm9yY2Ugb2JqZWN0IGZpZWxkcyBiYXNlZCBvbiB0aGUgZHJvcGRvd24gYWN0aXZpdHkgYW5kIEFQSSByZXN1bHRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHRcdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0XHR9O1xuXHRcdH0oKSApO1xuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdH1cblx0XHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdFx0J2luY2x1ZGUnIDogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0XHQnZmllbGRfdHlwZScgOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiB0aGF0LnZhbHVlXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cblx0XHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJycsIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJycsIGRhdGVNYXJrdXAgPSAnJztcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXG5cblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+J1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPidcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIGRlbGF5VGltZSApO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBEdXBsaWNhdGVzIHRoZSBmaWVsZHMgZm9yIGEgbmV3IHJvdyBpbiB0aGUgZmllbGRtYXAgb3B0aW9ucyBzY3JlZW4uXG5cdCAqL1xuXHQgZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHRcdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciByb3dLZXk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRcdHJvd0tleSA9IE1hdGguZmxvb3IoIERhdGUubm93KCkgLyAxMDAwICk7XG5cdFx0XHRcdGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogR2V0cyB0aGUgV29yZFByZXNzIGFuZCBTYWxlc2ZvcmNlIGZpZWxkIHJlc3VsdHMgdmlhIGFuIEFqYXggY2FsbFxuXHQgKiBAcGFyYW0gc3RyaW5nIHdvcmRwcmVzc09iamVjdCB0aGUgV29yZFByZXNzIG9iamVjdCB0eXBlXG5cdCAqIEBwYXJhbSBzdHJpbmcgc2FsZXNmb3JjZU9iamVjdCB0aGUgU2FsZXNmb3JjZSBvYmplY3QgdHlwZVxuXHQgKiBAcGFyYW0gaW50IHJvd0tleSB3aGljaCByb3cgd2UncmUgd29ya2luZyBvblxuXHQgKi9cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIHdvcmRwcmVzc09iamVjdCwgc2FsZXNmb3JjZU9iamVjdCwgcm93S2V5ICkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAnZ2V0X3dwX3NmX29iamVjdF9maWVsZHMnLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHNhbGVzZm9yY2VPYmplY3Rcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzID0gJyc7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZSA9ICcnO1xuXHRcdFx0dmFyIG1hcmt1cCA9ICcnO1xuXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19maWVsZFsnICsgcm93S2V5ICsgJ11cIiBpZD1cIndvcmRwcmVzc19maWVsZC0nICsgcm93S2V5ICsgJ1wiPidcblx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFdvcmRQcmVzcyBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS53b3JkcHJlc3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHR3b3JkcHJlc3MgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfZmllbGRbJyArIHJvd0tleSArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX2ZpZWxkLScgKyByb3dLZXkgKyAnXCI+J1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFNhbGVzZm9yY2UgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc2FsZXNmb3JjZSwgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRtYXJrdXAgPSAnPHRyPjx0ZCBjbGFzcz1cImNvbHVtbi13b3JkcHJlc3NfZmllbGRcIj4nICsgd29yZHByZXNzICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLXNhbGVzZm9yY2VfZmllbGRcIj4nICsgc2FsZXNmb3JjZSArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19wcmVtYXRjaFwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfcHJlbWF0Y2hbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19wcmVtYXRjaC0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2tleVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfa2V5WycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfa2V5LScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1kaXJlY3Rpb25cIj48ZGl2IGNsYXNzPVwicmFkaW9zXCI+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cInNmX3dwXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy1zZi13cFwiPiAgU2FsZXNmb3JjZSB0byBXb3JkUHJlc3M8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJ3cF9zZlwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctd3Atc2ZcIj4gIFdvcmRQcmVzcyB0byBTYWxlc2ZvcmNlPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic3luY1wiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctc3luY1wiIGNoZWNrZWQ+ICBTeW5jPC9sYWJlbD48L2Rpdj48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19kZWxldGVcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX2RlbGV0ZVsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX2RlbGV0ZS0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48L3RyPic7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbWFya3VwICk7XG5cblx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHR9XG5cblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogSGFuZGxlIG1hbnVhbCBwdXNoIGFuZCBwdWxsIG9mIG9iamVjdHNcblx0ICovXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZFxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJyA6IHNhbGVzZm9yY2VJZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgdXNlciBwcm9maWxlIHN1bW1hcnkgb2YgU2FsZXNmb3JjZSBpbmZvLlxuXHQgKi9cblx0ZnVuY3Rpb24gdXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCkge1xuXHRcdHZhciBtYXBwaW5nSWQgPSAkKCAnI21hcHBpbmdfaWRfYWpheCcgKS52YWwoKTtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nIDogJ3JlZnJlc2hfbWFwcGVkX2RhdGEnLFxuXHRcdFx0J21hcHBpbmdfaWQnIDogbWFwcGluZ0lkXG5cdFx0fVxuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX21lc3NhZ2UnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX2FjdGlvbicgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19hY3Rpb24gKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmMnICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMgKTtcblx0XHRcdFx0aWYgKCAnMScgPT09IHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApIHtcblx0XHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCAnc3VjY2VzcycgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBDbGVhciB0aGUgcGx1Z2luIGNhY2hlIHZpYSBBamF4IHJlcXVlc3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIHNob3cgd3NkbCBmaWVsZCBpZiBzb2FwIGlzIGVuYWJsZWRcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NoYW5nZScsICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtZW5hYmxlLXNvYXAgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHR0b2dnbGVTb2FwRmllbGRzKCk7XG5cdH0pO1xuXG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIHByZW1hdGNoXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBBcyB0aGUgRHJ1cGFsIHBsdWdpbiBkb2VzLCB3ZSBvbmx5IGFsbG93IG9uZSBmaWVsZCB0byBiZSBhIGtleVxuXHQgKi9cblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfa2V5IGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfa2V5IGlucHV0JyApLm5vdCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0fSk7XG5cdC8qKlxuXHQgKiBXaGVuIHRoZSBwbHVnaW4gbG9hZHMsIGluaXRpYWxpemUgb3IgZW5hYmxlIHRoaW5nczpcblx0ICogU2VsZWN0MiBvbiBzZWxlY3QgZmllbGRzXG5cdCAqIENsZWFyIGZpZWxkcyB3aGVuIHRoZSB0YXJnZXRlZCBXb3JkUHJlc3Mgb3IgU2FsZXNmb3JjZSBvYmplY3QgdHlwZSBjaGFuZ2VzXG5cdCAqIEFkZCBhIHNwaW5uZXIgZm9yIEFqYXggcmVxdWVzdHNcblx0ICogTWFuYWdlIHRoZSBkaXNwbGF5IGZvciBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gQVBJIHJlcG9uc2Vcblx0ICogTWFudWFsIHB1c2ggYW5kIHB1bGxcblx0ICogQ2xlYXJpbmcgdGhlIGNhY2hlXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHRcdC8vIGZvciBtYWluIGFkbWluIHNldHRpbmdzXG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXG5cdFx0Ly8gZm9yIHRoZSBmaWVsZG1hcCBhZGQvZWRpdCBzY3JlZW5cblx0XHR2YXIgdGltZW91dDtcblxuXHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHQkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi13b3JkcHJlc3NfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHR9XG5cblx0XHQkKCAnI3dvcmRwcmVzc19vYmplY3QsICNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0ICk7XG5cdFx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkuZmFkZU91dCgpO1xuXHRcdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLnJlbW92ZSgpO1xuXHRcdFx0fSwgMTAwMCApO1xuXHRcdH0pO1xuXG5cdFx0Ly8gdG9kbzogbmVlZCB0byBmaXggdGhpcyBzbyBpdCBkb2Vzbid0IHJ1biBhbGwgdGhlIHNwaW5uZXJzIGF0IHRoZSBzYW1lIHRpbWUgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGVzIG9uIHRoZSBzYW1lIHBhZ2Vcblx0XHQkKCBkb2N1bWVudCApLmFqYXhTdGFydCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXInICkuYWRkQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSkuYWpheFN0b3AoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLnJlbW92ZUNsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pO1xuXHRcdHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKTtcblx0XHRhZGRGaWVsZE1hcHBpbmdSb3coKTtcblxuXHRcdC8vIGZvciBwdXNoL3B1bGwgbWV0aG9kcyBydW5uaW5nIHZpYSBhamF4XG5cdFx0cHVzaEFuZFB1bGxPYmplY3RzKCk7XG5cblx0XHQvLyBmb3IgY2xlYXJpbmcgdGhlIHBsdWdpbiBjYWNoZVxuXHRcdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXHR9KTtcbn0oIGpRdWVyeSApICk7XG4iXX0=
