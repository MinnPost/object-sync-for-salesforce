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
   * Generates the WordPress object fields based on the dropdown activity and API results.
   */


  function wordpressObjectFields() {
    var delay = function () {
      var timer = 0;
      return function (callback, ms) {
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
      };
    }();

    if (0 === $('.wordpress_object_default_status > *').length) {
      $('.wordpress_object_default_status').hide();
    }

    $('#wordpress_object').on('change', function () {
      var that = this;
      var delayTime = 1000;
      delay(function () {
        var data = {
          'action': 'get_wordpress_object_description',
          'include': ['statuses'],
          'wordpress_object': that.value
        };
        $.post(ajaxurl, data, function (response) {
          var statusesMarkup = '';

          if (0 < $(response.data.statuses).length) {
            statusesMarkup += '<label for="wordpress_object_default_status">Default ' + that.value + ' status:</label>';
            statusesMarkup += '<select name="wordpress_object_default_status" id="wordpress_object_default_status"><option value="">- Select ' + that.value + ' status -</option>';
            $.each(response.data.statuses, function (index, value) {
              statusesMarkup += '<option value="' + index + '">' + value + '</option>';
            });
            statusesMarkup += '</select>';
            statusesMarkup += '<p class="description">If this fieldmap allows new records to be created from Salesforce data, you can set a default status for them. You can override this default status by making a field that maps to the status field in the field settings below, or by using a developer hook to populate it.</p>';
            statusesMarkup += '<p class="description">The only core object that requires a status is the post. If you do not otherwise set a status, newly created posts will be drafts.</p>';
          }

          $('.wordpress_object_default_status').html(statusesMarkup);

          if ('' !== statusesMarkup) {
            $('.wordpress_object_default_status').show();
          } else {
            $('.wordpress_object_default_status').hide();
          }

          if (jQuery.fn.select2) {
            $('select#wordpress_object_default_status').select2();
          }
        });
      }, delayTime);
    });
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
   * Manage the display for WordPress and Salesforce object fields based on Ajax reponses
   * Manual push and pull
   * Clearing the cache
   */

  $(document).ready(function () {
    // for main admin settings
    toggleSoapFields(); // for the fieldmap add/edit screen

    var timeout;

    if (jQuery.fn.select2) {
      $('select#wordpress_object').select2();
      $('select#wordpress_object_default_status').select2();
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
    wordpressObjectFields();
    salesforceObjectFields();
    addFieldMappingRow(); // for push/pull methods running via ajax

    pushAndPullObjects(); // for clearing the plugin cache

    clearSfwpCacheLink();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJ0b2dnbGVTb2FwRmllbGRzIiwibGVuZ3RoIiwiaXMiLCJzaG93IiwiaGlkZSIsIndvcmRwcmVzc09iamVjdEZpZWxkcyIsImRlbGF5IiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIm9uIiwidGhhdCIsImRlbGF5VGltZSIsImRhdGEiLCJ2YWx1ZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdGF0dXNlc01hcmt1cCIsInN0YXR1c2VzIiwiZWFjaCIsImluZGV4IiwiaHRtbCIsImpRdWVyeSIsImZuIiwic2VsZWN0MiIsInNhbGVzZm9yY2VPYmplY3RGaWVsZHMiLCJyZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAiLCJyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCIsImRhdGVNYXJrdXAiLCJyZWNvcmRUeXBlSW5mb3MiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJhZGRGaWVsZE1hcHBpbmdSb3ciLCJjbGljayIsInNhbGVzZm9yY2VPYmplY3QiLCJ2YWwiLCJ3b3JkcHJlc3NPYmplY3QiLCJyb3dLZXkiLCJ0ZXh0IiwiTWF0aCIsImZsb29yIiwiRGF0ZSIsIm5vdyIsImZpZWxkbWFwRmllbGRzIiwicGFyZW50IiwiZmluZCIsInJlbW92ZSIsInByZXBlbmQiLCJ3b3JkcHJlc3MiLCJzYWxlc2ZvcmNlIiwibWFya3VwIiwia2V5IiwiYXBwZW5kIiwicHVzaEFuZFB1bGxPYmplY3RzIiwid29yZHByZXNzSWQiLCJzYWxlc2ZvcmNlSWQiLCJzdWNjZXNzIiwidXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5Iiwid2lkdGgiLCJmYWRlSW4iLCJmYWRlT3V0IiwibWFwcGluZ0lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyU2Z3cENhY2hlTGluayIsIm1lc3NhZ2UiLCJkb2N1bWVudCIsIm5vdCIsInByb3AiLCJyZWFkeSIsInRpbWVvdXQiLCJhamF4U3RhcnQiLCJhZGRDbGFzcyIsImFqYXhTdG9wIiwicmVtb3ZlQ2xhc3MiXSwibWFwcGluZ3MiOiI7O0FBQUUsV0FBVUEsQ0FBVixFQUFjO0FBRWY7OztBQUdBLFdBQVNDLGdCQUFULEdBQTRCO0FBQzNCLFFBQUssSUFBSUQsQ0FBQyxDQUFFLHlDQUFGLENBQUQsQ0FBK0NFLE1BQXhELEVBQWlFO0FBQ2hFLFVBQUtGLENBQUMsQ0FBRSwrQ0FBRixDQUFELENBQXFERyxFQUFyRCxDQUF5RCxVQUF6RCxDQUFMLEVBQTZFO0FBQzVFSCxRQUFBQSxDQUFDLENBQUUsNENBQUYsQ0FBRCxDQUFrREksSUFBbEQ7QUFDQSxPQUZELE1BRU87QUFDTkosUUFBQUEsQ0FBQyxDQUFFLDRDQUFGLENBQUQsQ0FBa0RLLElBQWxEO0FBQ0E7QUFDRDtBQUNEO0FBRUQ7Ozs7O0FBR0EsV0FBU0MscUJBQVQsR0FBaUM7QUFFaEMsUUFBSUMsS0FBSyxHQUFLLFlBQVc7QUFDeEIsVUFBSUMsS0FBSyxHQUFHLENBQVo7QUFDQSxhQUFPLFVBQVVDLFFBQVYsRUFBb0JDLEVBQXBCLEVBQXlCO0FBQy9CQyxRQUFBQSxZQUFZLENBQUdILEtBQUgsQ0FBWjtBQUNBQSxRQUFBQSxLQUFLLEdBQUdJLFVBQVUsQ0FBRUgsUUFBRixFQUFZQyxFQUFaLENBQWxCO0FBQ0EsT0FIRDtBQUlBLEtBTmEsRUFBZDs7QUFRQSxRQUFLLE1BQU1WLENBQUMsQ0FBRSxzQ0FBRixDQUFELENBQTRDRSxNQUF2RCxFQUFnRTtBQUMvREYsTUFBQUEsQ0FBQyxDQUFFLGtDQUFGLENBQUQsQ0FBd0NLLElBQXhDO0FBQ0E7O0FBRURMLElBQUFBLENBQUMsQ0FBRSxtQkFBRixDQUFELENBQXlCYSxFQUF6QixDQUE2QixRQUE3QixFQUF1QyxZQUFXO0FBQ2pELFVBQUlDLElBQUksR0FBRyxJQUFYO0FBQ0EsVUFBSUMsU0FBUyxHQUFHLElBQWhCO0FBQ0FSLE1BQUFBLEtBQUssQ0FBRSxZQUFXO0FBQ2pCLFlBQUlTLElBQUksR0FBRztBQUNWLG9CQUFXLGtDQUREO0FBRVYscUJBQVksQ0FBRSxVQUFGLENBRkY7QUFHViw4QkFBcUJGLElBQUksQ0FBQ0c7QUFIaEIsU0FBWDtBQUtBakIsUUFBQUEsQ0FBQyxDQUFDa0IsSUFBRixDQUFRQyxPQUFSLEVBQWlCSCxJQUFqQixFQUF1QixVQUFVSSxRQUFWLEVBQXFCO0FBRTNDLGNBQUlDLGNBQWMsR0FBRyxFQUFyQjs7QUFFQSxjQUFLLElBQUlyQixDQUFDLENBQUVvQixRQUFRLENBQUNKLElBQVQsQ0FBY00sUUFBaEIsQ0FBRCxDQUE0QnBCLE1BQXJDLEVBQThDO0FBQzdDbUIsWUFBQUEsY0FBYyxJQUFJLDBEQUEwRFAsSUFBSSxDQUFDRyxLQUEvRCxHQUF1RSxrQkFBekY7QUFDQUksWUFBQUEsY0FBYyxJQUFJLG1IQUFtSFAsSUFBSSxDQUFDRyxLQUF4SCxHQUFnSSxvQkFBbEo7QUFDQWpCLFlBQUFBLENBQUMsQ0FBQ3VCLElBQUYsQ0FBUUgsUUFBUSxDQUFDSixJQUFULENBQWNNLFFBQXRCLEVBQWdDLFVBQVVFLEtBQVYsRUFBaUJQLEtBQWpCLEVBQXlCO0FBQ3hESSxjQUFBQSxjQUFjLElBQUksb0JBQW9CRyxLQUFwQixHQUE0QixJQUE1QixHQUFtQ1AsS0FBbkMsR0FBMkMsV0FBN0Q7QUFDQSxhQUZEO0FBR0FJLFlBQUFBLGNBQWMsSUFBSSxXQUFsQjtBQUNBQSxZQUFBQSxjQUFjLElBQUksMFNBQWxCO0FBQ0FBLFlBQUFBLGNBQWMsSUFBSSwrSkFBbEI7QUFDQTs7QUFFRHJCLFVBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDeUIsSUFBeEMsQ0FBOENKLGNBQTlDOztBQUVBLGNBQUssT0FBT0EsY0FBWixFQUE2QjtBQUM1QnJCLFlBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDSSxJQUF4QztBQUNBLFdBRkQsTUFFTztBQUNOSixZQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0ssSUFBeEM7QUFDQTs7QUFFRCxjQUFLcUIsTUFBTSxDQUFDQyxFQUFQLENBQVVDLE9BQWYsRUFBeUI7QUFDeEI1QixZQUFBQSxDQUFDLENBQUUsd0NBQUYsQ0FBRCxDQUE4QzRCLE9BQTlDO0FBQ0E7QUFFRCxTQTNCRDtBQTRCQSxPQWxDSSxFQWtDRmIsU0FsQ0UsQ0FBTDtBQW1DQSxLQXRDRDtBQXVDQTtBQUVEOzs7OztBQUdBLFdBQVNjLHNCQUFULEdBQWtDO0FBRWpDLFFBQUl0QixLQUFLLEdBQUssWUFBVztBQUN4QixVQUFJQyxLQUFLLEdBQUcsQ0FBWjtBQUNBLGFBQU8sVUFBVUMsUUFBVixFQUFvQkMsRUFBcEIsRUFBeUI7QUFDL0JDLFFBQUFBLFlBQVksQ0FBR0gsS0FBSCxDQUFaO0FBQ0FBLFFBQUFBLEtBQUssR0FBR0ksVUFBVSxDQUFFSCxRQUFGLEVBQVlDLEVBQVosQ0FBbEI7QUFDQSxPQUhEO0FBSUEsS0FOYSxFQUFkOztBQVFBLFFBQUssTUFBTVYsQ0FBQyxDQUFFLHNDQUFGLENBQUQsQ0FBNENFLE1BQXZELEVBQWdFO0FBQy9ERixNQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0ssSUFBeEM7QUFDQTs7QUFFRCxRQUFLLE1BQU1MLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDRSxNQUF0RCxFQUErRDtBQUM5REYsTUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUNLLElBQXZDO0FBQ0E7O0FBQ0QsUUFBSyxNQUFNTCxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQkUsTUFBMUMsRUFBbUQ7QUFDbERGLE1BQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCSyxJQUEzQjtBQUNBOztBQUVETCxJQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQmEsRUFBMUIsQ0FBOEIsUUFBOUIsRUFBd0MsWUFBVztBQUNsRCxVQUFJQyxJQUFJLEdBQUcsSUFBWDtBQUNBLFVBQUlDLFNBQVMsR0FBRyxJQUFoQjtBQUNBUixNQUFBQSxLQUFLLENBQUUsWUFBVztBQUNqQixZQUFJUyxJQUFJLEdBQUc7QUFDVixvQkFBVyxtQ0FERDtBQUVWLHFCQUFZLENBQUUsUUFBRixFQUFZLGlCQUFaLENBRkY7QUFHVix3QkFBZSxVQUhMO0FBSVYsK0JBQXNCRixJQUFJLENBQUNHO0FBSmpCLFNBQVg7QUFNQWpCLFFBQUFBLENBQUMsQ0FBQ2tCLElBQUYsQ0FBUUMsT0FBUixFQUFpQkgsSUFBakIsRUFBdUIsVUFBVUksUUFBVixFQUFxQjtBQUUzQyxjQUFJVSx3QkFBd0IsR0FBRyxFQUEvQjtBQUFBLGNBQW1DQyx1QkFBdUIsR0FBRyxFQUE3RDtBQUFBLGNBQWlFQyxVQUFVLEdBQUcsRUFBOUU7O0FBRUEsY0FBSyxJQUFJaEMsQ0FBQyxDQUFFb0IsUUFBUSxDQUFDSixJQUFULENBQWNpQixlQUFoQixDQUFELENBQW1DL0IsTUFBNUMsRUFBcUQ7QUFDcEQ0QixZQUFBQSx3QkFBd0IsSUFBSSxvR0FBNUI7QUFDQTlCLFlBQUFBLENBQUMsQ0FBQ3VCLElBQUYsQ0FBUUgsUUFBUSxDQUFDSixJQUFULENBQWNpQixlQUF0QixFQUF1QyxVQUFVVCxLQUFWLEVBQWlCUCxLQUFqQixFQUF5QjtBQUMvRGEsY0FBQUEsd0JBQXdCLElBQUksZ0VBQWdFTixLQUFoRSxHQUF3RSwwQ0FBeEUsR0FBcUhBLEtBQXJILEdBQTZILHlDQUE3SCxHQUF5S0EsS0FBekssR0FBaUwsS0FBakwsR0FBeUxQLEtBQXpMLEdBQWlNLFVBQTdOO0FBQ0EsYUFGRDtBQUdBYSxZQUFBQSx3QkFBd0IsSUFBSSxRQUE1QjtBQUdBQyxZQUFBQSx1QkFBdUIsSUFBSSwwRUFBM0I7QUFDQUEsWUFBQUEsdUJBQXVCLElBQUksb0lBQTNCO0FBQ0EvQixZQUFBQSxDQUFDLENBQUN1QixJQUFGLENBQVFILFFBQVEsQ0FBQ0osSUFBVCxDQUFjaUIsZUFBdEIsRUFBdUMsVUFBVVQsS0FBVixFQUFpQlAsS0FBakIsRUFBeUI7QUFDL0RjLGNBQUFBLHVCQUF1QixJQUFJLG9CQUFvQlAsS0FBcEIsR0FBNEIsSUFBNUIsR0FBbUNQLEtBQW5DLEdBQTJDLFdBQXRFO0FBQ0EsYUFGRDtBQUdBOztBQUVEakIsVUFBQUEsQ0FBQyxDQUFFLGtDQUFGLENBQUQsQ0FBd0N5QixJQUF4QyxDQUE4Q0ssd0JBQTlDO0FBQ0E5QixVQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q3lCLElBQXZDLENBQTZDTSx1QkFBN0M7O0FBRUEsY0FBSyxJQUFJL0IsQ0FBQyxDQUFFb0IsUUFBUSxDQUFDSixJQUFULENBQWNrQixNQUFoQixDQUFELENBQTBCaEMsTUFBbkMsRUFBNEM7QUFDM0M4QixZQUFBQSxVQUFVLElBQUkscUVBQWQ7QUFDQUEsWUFBQUEsVUFBVSxJQUFJLDJHQUFkO0FBQ0FoQyxZQUFBQSxDQUFDLENBQUN1QixJQUFGLENBQVFILFFBQVEsQ0FBQ0osSUFBVCxDQUFja0IsTUFBdEIsRUFBOEIsVUFBVVYsS0FBVixFQUFpQlAsS0FBakIsRUFBeUI7QUFDdERlLGNBQUFBLFVBQVUsSUFBSSxvQkFBb0JmLEtBQUssQ0FBQ2tCLElBQTFCLEdBQWlDLElBQWpDLEdBQXdDbEIsS0FBSyxDQUFDbUIsS0FBOUMsR0FBc0QsV0FBcEU7QUFDQSxhQUZEO0FBR0FKLFlBQUFBLFVBQVUsSUFBSSxXQUFkO0FBQ0FBLFlBQUFBLFVBQVUsSUFBSSxtS0FBZDtBQUNBOztBQUVEaEMsVUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJ5QixJQUEzQixDQUFpQ08sVUFBakM7O0FBRUEsY0FBSyxPQUFPRix3QkFBWixFQUF1QztBQUN0QzlCLFlBQUFBLENBQUMsQ0FBRSxrQ0FBRixDQUFELENBQXdDSSxJQUF4QztBQUNBLFdBRkQsTUFFTztBQUNOSixZQUFBQSxDQUFDLENBQUUsa0NBQUYsQ0FBRCxDQUF3Q0ssSUFBeEM7QUFDQTs7QUFDRCxjQUFLLE9BQU8wQix1QkFBWixFQUFzQztBQUNyQy9CLFlBQUFBLENBQUMsQ0FBRSxpQ0FBRixDQUFELENBQXVDSSxJQUF2QztBQUNBLFdBRkQsTUFFTztBQUNOSixZQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1Q0ssSUFBdkM7QUFDQTs7QUFFRCxjQUFLLE9BQU8yQixVQUFaLEVBQXlCO0FBQ3hCaEMsWUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJJLElBQTNCO0FBQ0EsV0FGRCxNQUVPO0FBQ05KLFlBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCSyxJQUEzQjtBQUNBOztBQUVELGNBQUtxQixNQUFNLENBQUNDLEVBQVAsQ0FBVUMsT0FBZixFQUF5QjtBQUN4QjVCLFlBQUFBLENBQUMsQ0FBRSx1Q0FBRixDQUFELENBQTZDNEIsT0FBN0M7QUFDQTVCLFlBQUFBLENBQUMsQ0FBRSwyQkFBRixDQUFELENBQWlDNEIsT0FBakM7QUFDQTtBQUVELFNBeEREO0FBeURBLE9BaEVJLEVBZ0VGYixTQWhFRSxDQUFMO0FBaUVBLEtBcEVEO0FBcUVBO0FBQ0Q7Ozs7O0FBR0MsV0FBU3NCLGtCQUFULEdBQThCO0FBQzlCckMsSUFBQUEsQ0FBQyxDQUFFLG9CQUFGLENBQUQsQ0FBMEJzQyxLQUExQixDQUFpQyxZQUFXO0FBQzNDLFVBQUlDLGdCQUFnQixHQUFHdkMsQ0FBQyxDQUFFLG9CQUFGLENBQUQsQ0FBMEJ3QyxHQUExQixFQUF2QjtBQUNBLFVBQUlDLGVBQWUsR0FBR3pDLENBQUMsQ0FBRSxtQkFBRixDQUFELENBQXlCd0MsR0FBekIsRUFBdEI7QUFDQSxVQUFJRSxNQUFKO0FBQ0ExQyxNQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVUyQyxJQUFWLENBQWdCLDJCQUFoQjs7QUFDQSxVQUFLLE9BQU9GLGVBQVAsSUFBMEIsT0FBT0YsZ0JBQXRDLEVBQXlEO0FBQ3hERyxRQUFBQSxNQUFNLEdBQUdFLElBQUksQ0FBQ0MsS0FBTCxDQUFZQyxJQUFJLENBQUNDLEdBQUwsS0FBYSxJQUF6QixDQUFUO0FBQ0FDLFFBQUFBLGNBQWMsQ0FBRVAsZUFBRixFQUFtQkYsZ0JBQW5CLEVBQXFDRyxNQUFyQyxDQUFkO0FBQ0ExQyxRQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVVpRCxNQUFWLEdBQW1CQyxJQUFuQixDQUF5QixpQkFBekIsRUFBNkNDLE1BQTdDO0FBQ0EsT0FKRCxNQUlPO0FBQ05uRCxRQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVVpRCxNQUFWLEdBQW1CRyxPQUFuQixDQUE0Qix3SUFBNUI7QUFDQTs7QUFDRCxhQUFPLEtBQVA7QUFDQSxLQWJEO0FBY0E7QUFDRDs7Ozs7Ozs7QUFNQSxXQUFTSixjQUFULENBQXlCUCxlQUF6QixFQUEwQ0YsZ0JBQTFDLEVBQTRERyxNQUE1RCxFQUFxRTtBQUNwRSxRQUFJMUIsSUFBSSxHQUFHO0FBQ1YsZ0JBQVcseUJBREQ7QUFFViwwQkFBcUJ5QixlQUZYO0FBR1YsMkJBQXNCRjtBQUhaLEtBQVg7QUFLQXZDLElBQUFBLENBQUMsQ0FBQ2tCLElBQUYsQ0FBUUMsT0FBUixFQUFpQkgsSUFBakIsRUFBdUIsVUFBVUksUUFBVixFQUFxQjtBQUMzQyxVQUFJaUMsU0FBUyxHQUFHLEVBQWhCO0FBQ0EsVUFBSUMsVUFBVSxHQUFHLEVBQWpCO0FBQ0EsVUFBSUMsTUFBTSxHQUFHLEVBQWI7QUFFQUYsTUFBQUEsU0FBUyxJQUFJLG1DQUFtQ1gsTUFBbkMsR0FBNEMseUJBQTVDLEdBQXdFQSxNQUF4RSxHQUFpRixJQUE5RjtBQUNBVyxNQUFBQSxTQUFTLElBQUksc0RBQWI7QUFDQXJELE1BQUFBLENBQUMsQ0FBQ3VCLElBQUYsQ0FBUUgsUUFBUSxDQUFDSixJQUFULENBQWNxQyxTQUF0QixFQUFpQyxVQUFVN0IsS0FBVixFQUFpQlAsS0FBakIsRUFBeUI7QUFDekRvQyxRQUFBQSxTQUFTLElBQUksb0JBQW9CcEMsS0FBSyxDQUFDdUMsR0FBMUIsR0FBZ0MsSUFBaEMsR0FBdUN2QyxLQUFLLENBQUN1QyxHQUE3QyxHQUFtRCxXQUFoRTtBQUNBLE9BRkQ7QUFHQUgsTUFBQUEsU0FBUyxJQUFJLFdBQWI7QUFFQUMsTUFBQUEsVUFBVSxJQUFJLG9DQUFvQ1osTUFBcEMsR0FBNkMsMEJBQTdDLEdBQTBFQSxNQUExRSxHQUFtRixJQUFqRztBQUNBWSxNQUFBQSxVQUFVLElBQUksdURBQWQ7QUFDQXRELE1BQUFBLENBQUMsQ0FBQ3VCLElBQUYsQ0FBUUgsUUFBUSxDQUFDSixJQUFULENBQWNzQyxVQUF0QixFQUFrQyxVQUFVOUIsS0FBVixFQUFpQlAsS0FBakIsRUFBeUI7QUFDMURxQyxRQUFBQSxVQUFVLElBQUksb0JBQW9CckMsS0FBSyxDQUFDa0IsSUFBMUIsR0FBaUMsSUFBakMsR0FBd0NsQixLQUFLLENBQUNtQixLQUE5QyxHQUFzRCxXQUFwRTtBQUNBLE9BRkQ7QUFHQWtCLE1BQUFBLFVBQVUsSUFBSSxXQUFkO0FBRUFDLE1BQUFBLE1BQU0sR0FBRyw0Q0FBNENGLFNBQTVDLEdBQXdELDJDQUF4RCxHQUFzR0MsVUFBdEcsR0FBbUgsK0VBQW5ILEdBQXFNWixNQUFyTSxHQUE4TSxxQkFBOU0sR0FBc09BLE1BQXRPLEdBQStPLDhFQUEvTyxHQUFnVUEsTUFBaFUsR0FBeVUsZ0JBQXpVLEdBQTRWQSxNQUE1VixHQUFxVywrSEFBclcsR0FBdWVBLE1BQXZlLEdBQWdmLG1CQUFoZixHQUFzZ0JBLE1BQXRnQixHQUErZ0Isb0dBQS9nQixHQUFzbkJBLE1BQXRuQixHQUErbkIsbUJBQS9uQixHQUFxcEJBLE1BQXJwQixHQUE4cEIsbUdBQTlwQixHQUFvd0JBLE1BQXB3QixHQUE2d0IsbUJBQTd3QixHQUFteUJBLE1BQW55QixHQUE0eUIsOEdBQTV5QixHQUE2NUJBLE1BQTc1QixHQUFzNkIsbUJBQXQ2QixHQUE0N0JBLE1BQTU3QixHQUFxOEIsMEJBQTk4QjtBQUNBMUMsTUFBQUEsQ0FBQyxDQUFFLG9CQUFGLENBQUQsQ0FBMEJ5RCxNQUExQixDQUFrQ0YsTUFBbEM7O0FBRUEsVUFBSzdCLE1BQU0sQ0FBQ0MsRUFBUCxDQUFVQyxPQUFmLEVBQXlCO0FBQ3hCNUIsUUFBQUEsQ0FBQyxDQUFFLGdDQUFGLENBQUQsQ0FBc0M0QixPQUF0QztBQUNBNUIsUUFBQUEsQ0FBQyxDQUFFLGlDQUFGLENBQUQsQ0FBdUM0QixPQUF2QztBQUNBO0FBRUQsS0EzQkQ7QUE0QkE7QUFDRDs7Ozs7QUFHQSxXQUFTOEIsa0JBQVQsR0FBOEI7QUFDN0IxRCxJQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQ0ssSUFBckM7O0FBQ0EsUUFBSyxJQUFJTCxDQUFDLENBQUUsd0JBQUYsQ0FBRCxDQUE4QkUsTUFBdkMsRUFBZ0Q7QUFDL0NGLE1BQUFBLENBQUMsQ0FBRSw0QkFBRixDQUFELENBQWtDYSxFQUFsQyxDQUFzQyxPQUF0QyxFQUErQyxZQUFXO0FBQ3pELFlBQUk0QixlQUFlLEdBQUd6QyxDQUFDLENBQUUsd0JBQUYsQ0FBRCxDQUE4QndDLEdBQTlCLEVBQXRCO0FBQ0EsWUFBSW1CLFdBQVcsR0FBRzNELENBQUMsQ0FBRSxvQkFBRixDQUFELENBQTBCd0MsR0FBMUIsRUFBbEI7QUFDQSxZQUFJb0IsWUFBWSxHQUFHNUQsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkJ3QyxHQUEzQixFQUFuQjtBQUNBLFlBQUl4QixJQUFJLEdBQUc7QUFDVixvQkFBVyxvQkFERDtBQUVWLDhCQUFxQnlCLGVBRlg7QUFHViwwQkFBaUJrQixXQUhQO0FBSVYsMkJBQWtCQztBQUpSLFNBQVg7QUFNQTVELFFBQUFBLENBQUMsQ0FBQ2tCLElBQUYsQ0FBUUMsT0FBUixFQUFpQkgsSUFBakIsRUFBdUIsVUFBVUksUUFBVixFQUFxQjtBQUMzQyxjQUFLLFNBQVNBLFFBQVEsQ0FBQ3lDLE9BQXZCLEVBQWlDO0FBQ2hDQyxZQUFBQSwyQkFBMkI7QUFDM0I5RCxZQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQytELEtBQXJDLENBQTRDL0QsQ0FBQyxDQUFFLHlCQUFGLENBQUQsQ0FBK0IrRCxLQUEvQixLQUF5QyxFQUFyRjtBQUNBL0QsWUFBQUEsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUN5QixJQUFyQyxDQUEyQyxtREFBM0MsRUFBaUd1QyxNQUFqRyxHQUEwR3pELEtBQTFHLENBQWlILElBQWpILEVBQXdIMEQsT0FBeEg7QUFDQTtBQUNELFNBTkQ7QUFPQSxlQUFPLEtBQVA7QUFDQSxPQWxCRDtBQW1CQTs7QUFDRGpFLElBQUFBLENBQUMsQ0FBRSw4QkFBRixDQUFELENBQW9DYSxFQUFwQyxDQUF3QyxPQUF4QyxFQUFpRCxZQUFXO0FBQzNELFVBQUkrQyxZQUFZLEdBQUc1RCxDQUFDLENBQUUscUJBQUYsQ0FBRCxDQUEyQndDLEdBQTNCLEVBQW5CO0FBQ0EsVUFBSUMsZUFBZSxHQUFHekMsQ0FBQyxDQUFFLHdCQUFGLENBQUQsQ0FBOEJ3QyxHQUE5QixFQUF0QjtBQUNBLFVBQUl4QixJQUFJLEdBQUc7QUFDVixrQkFBVyxzQkFERDtBQUVWLHlCQUFrQjRDLFlBRlI7QUFHViw0QkFBcUJuQjtBQUhYLE9BQVg7QUFLQXpDLE1BQUFBLENBQUMsQ0FBQ2tCLElBQUYsQ0FBUUMsT0FBUixFQUFpQkgsSUFBakIsRUFBdUIsVUFBVUksUUFBVixFQUFxQjtBQUMzQyxZQUFLLFNBQVNBLFFBQVEsQ0FBQ3lDLE9BQXZCLEVBQWlDO0FBQ2hDQyxVQUFBQSwyQkFBMkI7QUFDM0I5RCxVQUFBQSxDQUFDLENBQUUsK0JBQUYsQ0FBRCxDQUFxQytELEtBQXJDLENBQTRDL0QsQ0FBQyxDQUFFLHlCQUFGLENBQUQsQ0FBK0IrRCxLQUEvQixLQUF5QyxFQUFyRjtBQUNBL0QsVUFBQUEsQ0FBQyxDQUFFLCtCQUFGLENBQUQsQ0FBcUN5QixJQUFyQyxDQUEyQyxxREFBM0MsRUFBbUd1QyxNQUFuRyxHQUE0R3pELEtBQTVHLENBQW1ILElBQW5ILEVBQTBIMEQsT0FBMUg7QUFDQTtBQUNELE9BTkQ7QUFPQSxhQUFPLEtBQVA7QUFDQSxLQWhCRDtBQWlCQTtBQUNEOzs7OztBQUdBLFdBQVNILDJCQUFULEdBQXVDO0FBQ3RDLFFBQUlJLFNBQVMsR0FBR2xFLENBQUMsQ0FBRSxrQkFBRixDQUFELENBQXdCd0MsR0FBeEIsRUFBaEI7QUFDQSxRQUFJeEIsSUFBSSxHQUFHO0FBQ1YsZ0JBQVcscUJBREQ7QUFFVixvQkFBZWtEO0FBRkwsS0FBWDtBQUlBbEUsSUFBQUEsQ0FBQyxDQUFDa0IsSUFBRixDQUFRQyxPQUFSLEVBQWlCSCxJQUFqQixFQUF1QixVQUFVSSxRQUFWLEVBQXFCO0FBQzNDLFVBQUssU0FBU0EsUUFBUSxDQUFDeUMsT0FBdkIsRUFBaUM7QUFDaEM3RCxRQUFBQSxDQUFDLENBQUUsc0JBQUYsQ0FBRCxDQUE0QjJDLElBQTVCLENBQWtDdkIsUUFBUSxDQUFDSixJQUFULENBQWNtRCxpQkFBaEQ7QUFDQW5FLFFBQUFBLENBQUMsQ0FBRSxxQkFBRixDQUFELENBQTJCMkMsSUFBM0IsQ0FBaUN2QixRQUFRLENBQUNKLElBQVQsQ0FBY29ELGdCQUEvQztBQUNBcEUsUUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkIyQyxJQUEzQixDQUFpQ3ZCLFFBQVEsQ0FBQ0osSUFBVCxDQUFjcUQsZ0JBQS9DO0FBQ0FyRSxRQUFBQSxDQUFDLENBQUUsY0FBRixDQUFELENBQW9CMkMsSUFBcEIsQ0FBMEJ2QixRQUFRLENBQUNKLElBQVQsQ0FBY3NELFNBQXhDOztBQUNBLFlBQUssUUFBUWxELFFBQVEsQ0FBQ0osSUFBVCxDQUFjcUQsZ0JBQTNCLEVBQThDO0FBQzdDckUsVUFBQUEsQ0FBQyxDQUFFLHFCQUFGLENBQUQsQ0FBMkIyQyxJQUEzQixDQUFpQyxTQUFqQztBQUNBO0FBQ0Q7QUFDRCxLQVZEO0FBV0E7QUFDRDs7Ozs7QUFHQSxXQUFTNEIsa0JBQVQsR0FBOEI7QUFDN0J2RSxJQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5QnNDLEtBQXpCLENBQWdDLFlBQVc7QUFDMUMsVUFBSXRCLElBQUksR0FBRztBQUNWLGtCQUFXO0FBREQsT0FBWDtBQUdBLFVBQUlGLElBQUksR0FBR2QsQ0FBQyxDQUFFLElBQUYsQ0FBWjtBQUNBQSxNQUFBQSxDQUFDLENBQUNrQixJQUFGLENBQVFDLE9BQVIsRUFBaUJILElBQWpCLEVBQXVCLFVBQVVJLFFBQVYsRUFBcUI7QUFDM0MsWUFBSyxTQUFTQSxRQUFRLENBQUN5QyxPQUFsQixJQUE2QixTQUFTekMsUUFBUSxDQUFDSixJQUFULENBQWM2QyxPQUF6RCxFQUFtRTtBQUNsRS9DLFVBQUFBLElBQUksQ0FBQ21DLE1BQUwsR0FBY3hCLElBQWQsQ0FBb0JMLFFBQVEsQ0FBQ0osSUFBVCxDQUFjd0QsT0FBbEMsRUFBNENSLE1BQTVDO0FBQ0E7QUFDRCxPQUpEO0FBS0EsYUFBTyxLQUFQO0FBQ0EsS0FYRDtBQVlBLEdBcFRjLENBc1RmOzs7QUFDQWhFLEVBQUFBLENBQUMsQ0FBRXlFLFFBQUYsQ0FBRCxDQUFjNUQsRUFBZCxDQUFrQixRQUFsQixFQUE0QiwrQ0FBNUIsRUFBNkUsWUFBVztBQUN2RlosSUFBQUEsZ0JBQWdCO0FBQ2hCLEdBRkQ7QUFJQTs7OztBQUdBRCxFQUFBQSxDQUFDLENBQUV5RSxRQUFGLENBQUQsQ0FBYzVELEVBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsMkJBQTNCLEVBQXdELFlBQVc7QUFDbEViLElBQUFBLENBQUMsQ0FBRSwyQkFBRixDQUFELENBQWlDMEUsR0FBakMsQ0FBc0MsSUFBdEMsRUFBNkNDLElBQTdDLENBQW1ELFNBQW5ELEVBQThELEtBQTlEO0FBQ0EsR0FGRDtBQUdBOzs7O0FBR0EzRSxFQUFBQSxDQUFDLENBQUV5RSxRQUFGLENBQUQsQ0FBYzVELEVBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsc0JBQTNCLEVBQW1ELFlBQVc7QUFDN0RiLElBQUFBLENBQUMsQ0FBRSxzQkFBRixDQUFELENBQTRCMEUsR0FBNUIsQ0FBaUMsSUFBakMsRUFBd0NDLElBQXhDLENBQThDLFNBQTlDLEVBQXlELEtBQXpEO0FBQ0EsR0FGRDtBQUdBOzs7Ozs7Ozs7O0FBU0EzRSxFQUFBQSxDQUFDLENBQUV5RSxRQUFGLENBQUQsQ0FBY0csS0FBZCxDQUFxQixZQUFXO0FBRS9CO0FBQ0EzRSxJQUFBQSxnQkFBZ0IsR0FIZSxDQUsvQjs7QUFDQSxRQUFJNEUsT0FBSjs7QUFFQSxRQUFLbkQsTUFBTSxDQUFDQyxFQUFQLENBQVVDLE9BQWYsRUFBeUI7QUFDeEI1QixNQUFBQSxDQUFDLENBQUUseUJBQUYsQ0FBRCxDQUErQjRCLE9BQS9CO0FBQ0E1QixNQUFBQSxDQUFDLENBQUUsd0NBQUYsQ0FBRCxDQUE4QzRCLE9BQTlDO0FBQ0E1QixNQUFBQSxDQUFDLENBQUUsMEJBQUYsQ0FBRCxDQUFnQzRCLE9BQWhDO0FBQ0E1QixNQUFBQSxDQUFDLENBQUUsdUNBQUYsQ0FBRCxDQUE2QzRCLE9BQTdDO0FBQ0E1QixNQUFBQSxDQUFDLENBQUUsMkJBQUYsQ0FBRCxDQUFpQzRCLE9BQWpDO0FBQ0E1QixNQUFBQSxDQUFDLENBQUUsZ0NBQUYsQ0FBRCxDQUFzQzRCLE9BQXRDO0FBQ0E1QixNQUFBQSxDQUFDLENBQUUsaUNBQUYsQ0FBRCxDQUF1QzRCLE9BQXZDO0FBQ0E7O0FBRUQ1QixJQUFBQSxDQUFDLENBQUUsdUNBQUYsQ0FBRCxDQUE2Q2EsRUFBN0MsQ0FBaUQsUUFBakQsRUFBMkQsWUFBVztBQUNyRUYsTUFBQUEsWUFBWSxDQUFFa0UsT0FBRixDQUFaO0FBQ0FBLE1BQUFBLE9BQU8sR0FBR2pFLFVBQVUsQ0FBRSxZQUFXO0FBQ2hDWixRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QmlFLE9BQTdCO0FBQ0FqRSxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2Qm1ELE1BQTdCO0FBQ0EsT0FIbUIsRUFHakIsSUFIaUIsQ0FBcEI7QUFJQSxLQU5ELEVBbEIrQixDQTBCL0I7O0FBQ0FuRCxJQUFBQSxDQUFDLENBQUV5RSxRQUFGLENBQUQsQ0FBY0ssU0FBZCxDQUF5QixZQUFXO0FBQ25DOUUsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQitFLFFBQWhCLENBQTBCLFdBQTFCO0FBQ0EsS0FGRCxFQUVHQyxRQUZILENBRWEsWUFBVztBQUN2QmhGLE1BQUFBLENBQUMsQ0FBRSxVQUFGLENBQUQsQ0FBZ0JpRixXQUFoQixDQUE2QixXQUE3QjtBQUNBLEtBSkQ7QUFLQTNFLElBQUFBLHFCQUFxQjtBQUNyQnVCLElBQUFBLHNCQUFzQjtBQUN0QlEsSUFBQUEsa0JBQWtCLEdBbENhLENBb0MvQjs7QUFDQXFCLElBQUFBLGtCQUFrQixHQXJDYSxDQXVDL0I7O0FBQ0FhLElBQUFBLGtCQUFrQjtBQUNsQixHQXpDRDtBQTBDQSxDQTFYQyxFQTBYQzdDLE1BMVhELENBQUYiLCJmaWxlIjoib2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2UtYWRtaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdC8qKlxuXHQgKiBEb24ndCBzaG93IHRoZSBXU0RMIGZpbGUgZmllbGQgdW5sZXNzIFNPQVAgaXMgZW5hYmxlZFxuXHQgKi9cblx0ZnVuY3Rpb24gdG9nZ2xlU29hcEZpZWxkcygpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWVuYWJsZS1zb2FwJyApLmxlbmd0aCApIHtcblx0XHRcdGlmICggJCggJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCAnLm9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLXNvYXAtd3NkbC1wYXRoJyApLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcub2JqZWN0LXN5bmMtZm9yLXNhbGVzZm9yY2Utc29hcC13c2RsLXBhdGgnICkuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBHZW5lcmF0ZXMgdGhlIFdvcmRQcmVzcyBvYmplY3QgZmllbGRzIGJhc2VkIG9uIHRoZSBkcm9wZG93biBhY3Rpdml0eSBhbmQgQVBJIHJlc3VsdHMuXG5cdCAqL1xuXHRmdW5jdGlvbiB3b3JkcHJlc3NPYmplY3RGaWVsZHMoKSB7XG5cblx0XHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWVyID0gMDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdFx0fTtcblx0XHR9KCkgKTtcblxuXHRcdGlmICggMCA9PT0gJCggJy53b3JkcHJlc3Nfb2JqZWN0X2RlZmF1bHRfc3RhdHVzID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXMnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdCQoICcjd29yZHByZXNzX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2dldF93b3JkcHJlc3Nfb2JqZWN0X2Rlc2NyaXB0aW9uJyxcblx0XHRcdFx0XHQnaW5jbHVkZScgOiBbICdzdGF0dXNlcycgXSxcblx0XHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB0aGF0LnZhbHVlXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cblx0XHRcdFx0XHR2YXIgc3RhdHVzZXNNYXJrdXAgPSAnJztcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuc3RhdHVzZXMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRzdGF0dXNlc01hcmt1cCArPSAnPGxhYmVsIGZvcj1cIndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXNcIj5EZWZhdWx0ICcgKyB0aGF0LnZhbHVlICsgJyBzdGF0dXM6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0c3RhdHVzZXNNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXNcIiBpZD1cIndvcmRwcmVzc19vYmplY3RfZGVmYXVsdF9zdGF0dXNcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgJyArIHRoYXQudmFsdWUgKyAnIHN0YXR1cyAtPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5zdGF0dXNlcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0c3RhdHVzZXNNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHN0YXR1c2VzTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdFx0c3RhdHVzZXNNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5JZiB0aGlzIGZpZWxkbWFwIGFsbG93cyBuZXcgcmVjb3JkcyB0byBiZSBjcmVhdGVkIGZyb20gU2FsZXNmb3JjZSBkYXRhLCB5b3UgY2FuIHNldCBhIGRlZmF1bHQgc3RhdHVzIGZvciB0aGVtLiBZb3UgY2FuIG92ZXJyaWRlIHRoaXMgZGVmYXVsdCBzdGF0dXMgYnkgbWFraW5nIGEgZmllbGQgdGhhdCBtYXBzIHRvIHRoZSBzdGF0dXMgZmllbGQgaW4gdGhlIGZpZWxkIHNldHRpbmdzIGJlbG93LCBvciBieSB1c2luZyBhIGRldmVsb3BlciBob29rIHRvIHBvcHVsYXRlIGl0LjwvcD4nO1xuXHRcdFx0XHRcdFx0c3RhdHVzZXNNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGUgb25seSBjb3JlIG9iamVjdCB0aGF0IHJlcXVpcmVzIGEgc3RhdHVzIGlzIHRoZSBwb3N0LiBJZiB5b3UgZG8gbm90IG90aGVyd2lzZSBzZXQgYSBzdGF0dXMsIG5ld2x5IGNyZWF0ZWQgcG9zdHMgd2lsbCBiZSBkcmFmdHMuPC9wPic7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy53b3JkcHJlc3Nfb2JqZWN0X2RlZmF1bHRfc3RhdHVzJyApLmh0bWwoIHN0YXR1c2VzTWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSBzdGF0dXNlc01hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcud29yZHByZXNzX29iamVjdF9kZWZhdWx0X3N0YXR1cycgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcud29yZHByZXNzX29iamVjdF9kZWZhdWx0X3N0YXR1cycgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0XHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdF9kZWZhdWx0X3N0YXR1cycgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgZGVsYXlUaW1lICk7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogR2VuZXJhdGVzIHRoZSBTYWxlc2ZvcmNlIG9iamVjdCBmaWVsZHMgYmFzZWQgb24gdGhlIGRyb3Bkb3duIGFjdGl2aXR5IGFuZCBBUEkgcmVzdWx0cy5cblx0ICovXG5cdGZ1bmN0aW9uIHNhbGVzZm9yY2VPYmplY3RGaWVsZHMoKSB7XG5cblx0XHR2YXIgZGVsYXkgPSAoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWVyID0gMDtcblx0XHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIG1zICkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQgKCB0aW1lciApO1xuXHRcdFx0XHR0aW1lciA9IHNldFRpbWVvdXQoIGNhbGxiYWNrLCBtcyApO1xuXHRcdFx0fTtcblx0XHR9KCkgKTtcblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHR9XG5cdFx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheVRpbWUgPSAxMDAwO1xuXHRcdFx0ZGVsYXkoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJyA6IFsgJ2ZpZWxkcycsICdyZWNvcmRUeXBlSW5mb3MnIF0sXG5cdFx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCA9ICcnLCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCA9ICcnLCBkYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPidcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5maWVsZHMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxwIGNsYXNzPVwiZGVzY3JpcHRpb25cIj5UaGVzZSBhcmUgZGF0ZSBmaWVsZHMgdGhhdCBjYW4gY2F1c2UgV29yZFByZXNzIHRvIHB1bGwgYW4gdXBkYXRlIGZyb20gU2FsZXNmb3JjZSwgYWNjb3JkaW5nIHRvIHRoZSA8Y29kZT5zYWxlc2ZvcmNlX3B1bGw8L2NvZGU+IGNsYXNzLjwvcD4nO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggJycgIT09IHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gZGF0ZU1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0XHQkKCAnc2VsZWN0I3B1bGxfdHJpZ2dlcl9maWVsZCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgZGVsYXlUaW1lICk7XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIER1cGxpY2F0ZXMgdGhlIGZpZWxkcyBmb3IgYSBuZXcgcm93IGluIHRoZSBmaWVsZG1hcCBvcHRpb25zIHNjcmVlbi5cblx0ICovXG5cdCBmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdFx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHJvd0tleTtcblx0XHRcdCQoIHRoaXMgKS50ZXh0KCAnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycgKTtcblx0XHRcdGlmICggJycgIT09IHdvcmRwcmVzc09iamVjdCAmJiAnJyAhPT0gc2FsZXNmb3JjZU9iamVjdCApIHtcblx0XHRcdFx0cm93S2V5ID0gTWF0aC5mbG9vciggRGF0ZS5ub3coKSAvIDEwMDAgKTtcblx0XHRcdFx0ZmllbGRtYXBGaWVsZHMoIHdvcmRwcmVzc09iamVjdCwgc2FsZXNmb3JjZU9iamVjdCwgcm93S2V5ICk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5maW5kKCAnLm1pc3Npbmctb2JqZWN0JyApLnJlbW92ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLnByZXBlbmQoICc8ZGl2IGNsYXNzPVwiZXJyb3IgbWlzc2luZy1vYmplY3RcIj48c3Bhbj5Zb3UgaGF2ZSB0byBwaWNrIGEgV29yZFByZXNzIG9iamVjdCBhbmQgYSBTYWxlc2ZvcmNlIG9iamVjdCB0byBhZGQgZmllbGQgbWFwcGluZy48L3NwYW4+PC9kaXY+JyApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBXb3JkUHJlc3MgYW5kIFNhbGVzZm9yY2UgZmllbGQgcmVzdWx0cyB2aWEgYW4gQWpheCBjYWxsXG5cdCAqIEBwYXJhbSBzdHJpbmcgd29yZHByZXNzT2JqZWN0IHRoZSBXb3JkUHJlc3Mgb2JqZWN0IHR5cGVcblx0ICogQHBhcmFtIHN0cmluZyBzYWxlc2ZvcmNlT2JqZWN0IHRoZSBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlXG5cdCAqIEBwYXJhbSBpbnQgcm93S2V5IHdoaWNoIHJvdyB3ZSdyZSB3b3JraW5nIG9uXG5cdCAqL1xuXHRmdW5jdGlvbiBmaWVsZG1hcEZpZWxkcyggd29yZHByZXNzT2JqZWN0LCBzYWxlc2ZvcmNlT2JqZWN0LCByb3dLZXkgKSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdnZXRfd3Bfc2Zfb2JqZWN0X2ZpZWxkcycsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogc2FsZXNmb3JjZU9iamVjdFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdHZhciB3b3JkcHJlc3MgPSAnJztcblx0XHRcdHZhciBzYWxlc2ZvcmNlID0gJyc7XG5cdFx0XHR2YXIgbWFya3VwID0gJyc7XG5cblx0XHRcdHdvcmRwcmVzcyArPSAnPHNlbGVjdCBuYW1lPVwid29yZHByZXNzX2ZpZWxkWycgKyByb3dLZXkgKyAnXVwiIGlkPVwid29yZHByZXNzX2ZpZWxkLScgKyByb3dLZXkgKyAnXCI+J1xuXHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgV29yZFByZXNzIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLndvcmRwcmVzcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHdvcmRwcmVzcyArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0c2FsZXNmb3JjZSArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9maWVsZFsnICsgcm93S2V5ICsgJ11cIiBpZD1cInNhbGVzZm9yY2VfZmllbGQtJyArIHJvd0tleSArICdcIj4nXG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgU2FsZXNmb3JjZSBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5zYWxlc2ZvcmNlLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdG1hcmt1cCA9ICc8dHI+PHRkIGNsYXNzPVwiY29sdW1uLXdvcmRwcmVzc19maWVsZFwiPicgKyB3b3JkcHJlc3MgKyAnPC90ZD48dGQgY2xhc3M9XCJjb2x1bW4tc2FsZXNmb3JjZV9maWVsZFwiPicgKyBzYWxlc2ZvcmNlICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWlzX3ByZW1hdGNoXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19wcmVtYXRjaFsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX3ByZW1hdGNoLScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48dGQgY2xhc3M9XCJjb2x1bW4taXNfa2V5XCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19rZXlbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19rZXktJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWRpcmVjdGlvblwiPjxkaXYgY2xhc3M9XCJyYWRpb3NcIj48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic2Zfd3BcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXNmLXdwXCI+ICBTYWxlc2ZvcmNlIHRvIFdvcmRQcmVzczwvbGFiZWw+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cIndwX3NmXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy13cC1zZlwiPiAgV29yZFByZXNzIHRvIFNhbGVzZm9yY2U8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzeW5jXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy1zeW5jXCIgY2hlY2tlZD4gIFN5bmM8L2xhYmVsPjwvZGl2PjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2RlbGV0ZVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfZGVsZXRlWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfZGVsZXRlLScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48L3RkPjwvdHI+Jztcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBtYXJrdXAgKTtcblxuXHRcdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHRcdCQoICcuY29sdW1uLXNhbGVzZm9yY2VfZmllbGQgc2VsZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdH1cblxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBIYW5kbGUgbWFudWFsIHB1c2ggYW5kIHB1bGwgb2Ygb2JqZWN0c1xuXHQgKi9cblx0ZnVuY3Rpb24gcHVzaEFuZFB1bGxPYmplY3RzKCkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdFx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0XHRcdCd3b3JkcHJlc3NfaWQnIDogd29yZHByZXNzSWQsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnIDogc2FsZXNmb3JjZUlkXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nIDogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnIDogc2FsZXNmb3JjZUlkLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3NPYmplY3Rcblx0XHRcdH1cblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0dXBkYXRlU2FsZXNmb3JjZVVzZXJTdW1tYXJ5KCk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdWxsZWQgZnJvbSBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSB1c2VyIHByb2ZpbGUgc3VtbWFyeSBvZiBTYWxlc2ZvcmNlIGluZm8uXG5cdCAqL1xuXHRmdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdFx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0XHQnbWFwcGluZ19pZCcgOiBtYXBwaW5nSWRcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIENsZWFyIHRoZSBwbHVnaW4gY2FjaGUgdmlhIEFqYXggcmVxdWVzdC5cblx0ICovXG5cdGZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0XHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nIDogJ2NsZWFyX3Nmd3BfY2FjaGUnXG5cdFx0XHR9XG5cdFx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gc2hvdyB3c2RsIGZpZWxkIGlmIHNvYXAgaXMgZW5hYmxlZFxuXHQkKCBkb2N1bWVudCApLm9uKCAnY2hhbmdlJywgJy5vYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1lbmFibGUtc29hcCBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdHRvZ2dsZVNvYXBGaWVsZHMoKTtcblx0fSk7XG5cblx0LyoqXG5cdCAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2hcblx0ICovXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblx0LyoqXG5cdCAqIEFzIHRoZSBEcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEga2V5XG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblx0LyoqXG5cdCAqIFdoZW4gdGhlIHBsdWdpbiBsb2FkcywgaW5pdGlhbGl6ZSBvciBlbmFibGUgdGhpbmdzOlxuXHQgKiBTZWxlY3QyIG9uIHNlbGVjdCBmaWVsZHNcblx0ICogQ2xlYXIgZmllbGRzIHdoZW4gdGhlIHRhcmdldGVkIFdvcmRQcmVzcyBvciBTYWxlc2ZvcmNlIG9iamVjdCB0eXBlIGNoYW5nZXNcblx0ICogQWRkIGEgc3Bpbm5lciBmb3IgQWpheCByZXF1ZXN0c1xuXHQgKiBNYW5hZ2UgdGhlIGRpc3BsYXkgZm9yIFdvcmRQcmVzcyBhbmQgU2FsZXNmb3JjZSBvYmplY3QgZmllbGRzIGJhc2VkIG9uIEFqYXggcmVwb25zZXNcblx0ICogTWFudWFsIHB1c2ggYW5kIHB1bGxcblx0ICogQ2xlYXJpbmcgdGhlIGNhY2hlXG5cdCAqL1xuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHRcdC8vIGZvciBtYWluIGFkbWluIHNldHRpbmdzXG5cdFx0dG9nZ2xlU29hcEZpZWxkcygpO1xuXG5cdFx0Ly8gZm9yIHRoZSBmaWVsZG1hcCBhZGQvZWRpdCBzY3JlZW5cblx0XHR2YXIgdGltZW91dDtcblxuXHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHQkKCAnc2VsZWN0I3dvcmRwcmVzc19vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCN3b3JkcHJlc3Nfb2JqZWN0X2RlZmF1bHRfc3RhdHVzJyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9vYmplY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4td29yZHByZXNzX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0fVxuXG5cdFx0JCggJyN3b3JkcHJlc3Nfb2JqZWN0LCAjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5yZW1vdmUoKTtcblx0XHRcdH0sIDEwMDAgKTtcblx0XHR9KTtcblxuXHRcdC8vIHRvZG86IG5lZWQgdG8gZml4IHRoaXMgc28gaXQgZG9lc24ndCBydW4gYWxsIHRoZSBzcGlubmVycyBhdCB0aGUgc2FtZSB0aW1lIHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlcyBvbiB0aGUgc2FtZSBwYWdlXG5cdFx0JCggZG9jdW1lbnQgKS5hamF4U3RhcnQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pLmFqYXhTdG9wKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KTtcblx0XHR3b3JkcHJlc3NPYmplY3RGaWVsZHMoKTtcblx0XHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG5cdFx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cblx0XHQvLyBmb3IgcHVzaC9wdWxsIG1ldGhvZHMgcnVubmluZyB2aWEgYWpheFxuXHRcdHB1c2hBbmRQdWxsT2JqZWN0cygpO1xuXG5cdFx0Ly8gZm9yIGNsZWFyaW5nIHRoZSBwbHVnaW4gY2FjaGVcblx0XHRjbGVhclNmd3BDYWNoZUxpbmsoKTtcblx0fSk7XG59KCBqUXVlcnkgKSApO1xuIl19
