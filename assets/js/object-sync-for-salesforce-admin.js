"use strict";

(function ($) {
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

    $('#salesforce_object').on('change', function (el) {
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
          'wordpress_id': wordpressId
        };

        if (0 < $('#salesforce_id_ajax').length) {
          data.salesforce_id = salesforceId;
        }

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
  } // as the drupal plugin does, we only allow one field to be a prematch or key


  $(document).on('click', '.column-is_prematch input', function () {
    $('.column-is_prematch input').not(this).prop('checked', false);
  });
  $(document).on('click', '.column-is_key input', function () {
    $('.column-is_key input').not(this).prop('checked', false);
  });
  $(document).ready(function () {
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
    pushAndPullObjects();
    clearSfwpCacheLink();
  });
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiaGlkZSIsIm9uIiwiZWwiLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwialF1ZXJ5IiwiZm4iLCJzZWxlY3QyIiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0IiwidmFsIiwid29yZHByZXNzT2JqZWN0Iiwicm93S2V5IiwidGV4dCIsIk1hdGgiLCJmbG9vciIsIkRhdGUiLCJub3ciLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJyZW1vdmUiLCJwcmVwZW5kIiwid29yZHByZXNzIiwic2FsZXNmb3JjZSIsIm1hcmt1cCIsImtleSIsImFwcGVuZCIsInB1c2hBbmRQdWxsT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic2FsZXNmb3JjZUlkIiwic2FsZXNmb3JjZV9pZCIsInN1Y2Nlc3MiLCJ1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkiLCJ3aWR0aCIsImZhZGVJbiIsImZhZGVPdXQiLCJtYXBwaW5nSWQiLCJsYXN0X3N5bmNfbWVzc2FnZSIsImxhc3Rfc3luY19hY3Rpb24iLCJsYXN0X3N5bmNfc3RhdHVzIiwibGFzdF9zeW5jIiwiY2xlYXJTZndwQ2FjaGVMaW5rIiwibWVzc2FnZSIsImRvY3VtZW50Iiwibm90IiwicHJvcCIsInJlYWR5IiwidGltZW91dCIsImFqYXhTdGFydCIs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QUE2Q1UsRUFBN0MsQ0FBaUQsUUFBakQsRUFBMkQsWUFBVztBQUNyRUosTUFBQUEsWUFBWSxDQUFFb0UsT0FBRixDQUFaO0FBQ0FBLE1BQUFBLE9BQU8sR0FBR25FLFVBQVUsQ0FBRSxZQUFXO0FBQ2hDUCxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QjhELE9BQTdCO0FBQ0E5RCxRQUFBQSxDQUFDLENBQUUsdUJBQUYsQ0FBRCxDQUE2QitDLE1BQTdCO0FBQ0EsT0FIbUIsRUFHakIsSUFIaUIsQ0FBcEI7QUFJQSxLQU5ELEVBYitCLENBcUIvQjs7QUFDQS9DLElBQUFBLENBQUMsQ0FBRXNFLFFBQUYsQ0FBRCxDQUFjSyxTQUFkLENBQXlCLFlBQVc7QUFDbkMzRSxNQUFBQSxDQUFDLENBQUUsVUFBRixDQUFELENBQWdCNEUsUUFBaEIsQ0FBMEIsV0FBMUI7QUFDQSxLQUZELEVBRUdDLFFBRkgsQ0FFYSxZQUFXO0FBQ3ZCN0UsTUFBQUEsQ0FBQyxDQUFFLFVBQUYsQ0FBRCxDQUFnQjhFLFdBQWhCLENBQTZCLFdBQTdCO0FBQ0EsS0FKRDtBQUtBN0UsSUFBQUEsc0JBQXNCO0FBQ3RCZ0MsSUFBQUEsa0JBQWtCO0FBQ2xCcUIsSUFBQUEsa0JBQWtCO0FBQ2xCYyxJQUFBQSxrQkFBa0I7QUFDbEIsR0EvQkQ7QUFpQ0EsQ0E1UUMsRUE0UUN0QyxNQTVRRCxDQUFGIiwiZmlsZSI6Im9iamVjdC1zeW5jLWZvci1zYWxlc2ZvcmNlLWFkbWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCkge1xuXG5cdFx0dmFyIGRlbGF5ID0gKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB0aW1lciA9IDA7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGNhbGxiYWNrLCBtcyApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0ICggdGltZXIgKTtcblx0XHRcdFx0dGltZXIgPSBzZXRUaW1lb3V0KCBjYWxsYmFjaywgbXMgKTtcblx0XHRcdH07XG5cdFx0fSgpICk7XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHRpZiAoIDAgPT09ICQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICggMCA9PT0gJCggJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHQkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oIGVsICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGRlbGF5VGltZSA9IDEwMDA7XG5cdFx0XHRkZWxheSggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdFx0J2luY2x1ZGUnIDogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0XHQnZmllbGRfdHlwZScgOiAnZGF0ZXRpbWUnLFxuXHRcdFx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCcgOiB0aGF0LnZhbHVlXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cblx0XHRcdFx0XHR2YXIgcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwID0gJycsIHJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJycsIGRhdGVNYXJrdXAgPSAnJztcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICs9ICc8L2Rpdj4nO1xuXG5cblx0XHRcdFx0XHRcdHJlY29yZFR5cGVEZWZhdWx0TWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8bGFiZWwgZm9yPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+RGF0ZSBmaWVsZCB0byB0cmlnZ2VyIHB1bGw6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+J1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLmZpZWxkcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8L3NlbGVjdD4nO1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPidcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGpRdWVyeS5mbi5zZWxlY3QyICkge1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdFx0JCggJ3NlbGVjdCNwdWxsX3RyaWdnZXJfZmllbGQnICkuc2VsZWN0MigpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIGRlbGF5VGltZSApO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkRmllbGRNYXBwaW5nUm93KCkge1xuXHRcdCQoICcjYWRkLWZpZWxkLW1hcHBpbmcnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VPYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdCcgKS52YWwoKTtcblx0XHRcdHZhciByb3dLZXk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRcdHJvd0tleSA9IE1hdGguZmxvb3IoIERhdGUubm93KCkgLyAxMDAwICk7XG5cdFx0XHRcdGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIHdvcmRwcmVzc09iamVjdCwgc2FsZXNmb3JjZU9iamVjdCwgcm93S2V5ICkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAnZ2V0X3dwX3NmX29iamVjdF9maWVsZHMnLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnIDogd29yZHByZXNzT2JqZWN0LFxuXHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHNhbGVzZm9yY2VPYmplY3Rcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHR2YXIgd29yZHByZXNzID0gJyc7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZSA9ICcnO1xuXHRcdFx0dmFyIG1hcmt1cCA9ICcnO1xuXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19maWVsZFsnICsgcm93S2V5ICsgJ11cIiBpZD1cIndvcmRwcmVzc19maWVsZC0nICsgcm93S2V5ICsgJ1wiPidcblx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFdvcmRQcmVzcyBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS53b3JkcHJlc3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHdvcmRwcmVzcyArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5rZXkgKyAnXCI+JyArIHZhbHVlLmtleSArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHR3b3JkcHJlc3MgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfZmllbGRbJyArIHJvd0tleSArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX2ZpZWxkLScgKyByb3dLZXkgKyAnXCI+J1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IFNhbGVzZm9yY2UgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuc2FsZXNmb3JjZSwgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0c2FsZXNmb3JjZSArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0fSk7XG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRtYXJrdXAgPSAnPHRyPjx0ZCBjbGFzcz1cImNvbHVtbi13b3JkcHJlc3NfZmllbGRcIj4nICsgd29yZHByZXNzICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLXNhbGVzZm9yY2VfZmllbGRcIj4nICsgc2FsZXNmb3JjZSArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19wcmVtYXRjaFwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfcHJlbWF0Y2hbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19wcmVtYXRjaC0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2tleVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfa2V5WycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfa2V5LScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1kaXJlY3Rpb25cIj48ZGl2IGNsYXNzPVwicmFkaW9zXCI+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cInNmX3dwXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy1zZi13cFwiPiAgU2FsZXNmb3JjZSB0byBXb3JkUHJlc3M8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJ3cF9zZlwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctd3Atc2ZcIj4gIFdvcmRQcmVzcyB0byBTYWxlc2ZvcmNlPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic3luY1wiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd0tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd0tleSArICctc3luY1wiIGNoZWNrZWQ+ICBTeW5jPC9sYWJlbD48L2Rpdj48L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19kZWxldGVcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX2RlbGV0ZVsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX2RlbGV0ZS0nICsgcm93S2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48L3RyPic7XG5cdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5JyApLmFwcGVuZCggbWFya3VwICk7XG5cblx0XHRcdGlmICggalF1ZXJ5LmZuLnNlbGVjdDIgKSB7XG5cdFx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0XHQkKCAnLmNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkIHNlbGVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHR9XG5cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHB1c2hBbmRQdWxsT2JqZWN0cygpIHtcblx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdGlmICggMCA8ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcucHVzaF90b19zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc0lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIHNhbGVzZm9yY2VJZCA9ICQoICcjc2FsZXNmb3JjZV9pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJyA6IHdvcmRwcmVzc0lkXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAwIDwgJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdGRhdGEuc2FsZXNmb3JjZV9pZCA9IHNhbGVzZm9yY2VJZDtcblx0XHRcdFx0fVxuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmh0bWwoICc8cD5UaGlzIG9iamVjdCBoYXMgYmVlbiBwdXNoZWQgdG8gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHQkKCAnLnB1bGxfZnJvbV9zYWxlc2ZvcmNlX2J1dHRvbicgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZUlkID0gJCggJyNzYWxlc2ZvcmNlX2lkX2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0JyA6IHdvcmRwcmVzc09iamVjdFxuXHRcdFx0fVxuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdFx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbicgOiAncmVmcmVzaF9tYXBwZWRfZGF0YScsXG5cdFx0XHQnbWFwcGluZ19pZCcgOiBtYXBwaW5nSWRcblx0XHR9XG5cdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfbWVzc2FnZScgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19tZXNzYWdlICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfYWN0aW9uJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbiApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jX3N0YXR1cycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luYycgKS50ZXh0KCByZXNwb25zZS5kYXRhLmxhc3Rfc3luYyApO1xuXHRcdFx0XHRpZiAoICcxJyA9PT0gcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzICkge1xuXHRcdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoICdzdWNjZXNzJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjbGVhclNmd3BDYWNoZUxpbmsoKSB7XG5cdFx0JCggJyNjbGVhci1zZndwLWNhY2hlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKCB0aGlzICk7XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICYmIHRydWUgPT09IHJlc3BvbnNlLmRhdGEuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR0aGF0LnBhcmVudCgpLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIGFzIHRoZSBkcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2ggb3Iga2V5XG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblxuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHRcdHZhciB0aW1lb3V0O1xuXG5cdFx0aWYgKCBqUXVlcnkuZm4uc2VsZWN0MiApIHtcblx0XHRcdCQoICdzZWxlY3Qjd29yZHByZXNzX29iamVjdCcgKS5zZWxlY3QyKCk7XG5cdFx0XHQkKCAnc2VsZWN0I3NhbGVzZm9yY2Vfb2JqZWN0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3Qjc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICdzZWxlY3QjcHVsbF90cmlnZ2VyX2ZpZWxkJyApLnNlbGVjdDIoKTtcblx0XHRcdCQoICcuY29sdW1uLXdvcmRwcmVzc19maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdFx0JCggJy5jb2x1bW4tc2FsZXNmb3JjZV9maWVsZCBzZWxlY3QnICkuc2VsZWN0MigpO1xuXHRcdH1cblxuXHRcdCQoICcjd29yZHByZXNzX29iamVjdCwgI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0XHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkucmVtb3ZlKCk7XG5cdFx0XHR9LCAxMDAwICk7XG5cdFx0fSk7XG5cblx0XHQvLyB0b2RvOiBuZWVkIHRvIGZpeCB0aGlzIHNvIGl0IGRvZXNuJ3QgcnVuIGFsbCB0aGUgc3Bpbm5lcnMgYXQgdGhlIHNhbWUgdGltZSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZXMgb24gdGhlIHNhbWUgcGFnZVxuXHRcdCQoIGRvY3VtZW50ICkuYWpheFN0YXJ0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KS5hamF4U3RvcCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXInICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSk7XG5cdFx0c2FsZXNmb3JjZU9iamVjdEZpZWxkcygpO1xuXHRcdGFkZEZpZWxkTWFwcGluZ1JvdygpO1xuXHRcdHB1c2hBbmRQdWxsT2JqZWN0cygpO1xuXHRcdGNsZWFyU2Z3cENhY2hlTGluaygpO1xuXHR9KTtcblxufSggalF1ZXJ5ICkgKTtcbiJdfQ==
