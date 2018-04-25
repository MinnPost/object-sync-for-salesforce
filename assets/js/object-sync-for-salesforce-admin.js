'use strict';

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
				});
			}, delayTime);
		});
	}

	function addFieldMappingRow() {
		$('#add-field-mapping').click(function () {
			var salesforceObject = $('#salesforce_object').val();
			var wordpressObject = $('#wordpress_object').val();
			var rowKey = Math.floor(Date.now() / 1000);
			$(this).text('Add another field mapping');
			if ('' !== wordpressObject && '' !== salesforceObject) {
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
		});
	}

	function pushAndPullObjects() {
		$('.salesforce_user_ajax_message').hide();
		if (0 < $('#wordpress_object_ajax').length) {
			$('.push_to_salesforce_button').on('click', function () {
				var wordpressObject = $('#wordpress_object_ajax').val();
				var wordpressId = $('#wordpress_id_ajax').val();
				var data = {
					'action': 'push_to_salesforce',
					'wordpress_object': wordpressObject,
					'wordpress_id': wordpressId
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
	}

	// as the drupal plugin does, we only allow one field to be a prematch or key
	$(document).on('click', '.column-is_prematch input', function () {
		$('.column-is_prematch input').not(this).prop('checked', false);
	});

	$(document).on('click', '.column-is_key input', function () {
		$('.column-is_key input').not(this).prop('checked', false);
	});

	$(document).ready(function () {

		var timeout;
		$('#wordpress_object, #salesforce_object').on('change', function () {
			clearTimeout(timeout);
			timeout = setTimeout(function () {
				$('table.fields tbody tr').fadeOut();
				$('table.fields tbody tr').remove();
			}, 1000);
		});

		// todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJzYWxlc2ZvcmNlT2JqZWN0RmllbGRzIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiaGlkZSIsIm9uIiwiZWwiLCJ0aGF0IiwiZGVsYXlUaW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCIsInJlY29yZFR5cGVEZWZhdWx0TWFya3VwIiwiZGF0ZU1hcmt1cCIsInJlY29yZFR5cGVJbmZvcyIsImVhY2giLCJpbmRleCIsImh0bWwiLCJmaWVsZHMiLCJuYW1lIiwibGFiZWwiLCJzaG93IiwiYWRkRmllbGRNYXBwaW5nUm93IiwiY2xpY2siLCJzYWxlc2ZvcmNlT2JqZWN0IiwidmFsIiwid29yZHByZXNzT2JqZWN0Iiwicm93S2V5IiwiTWF0aCIsImZsb29yIiwiRGF0ZSIsIm5vdyIsInRleHQiLCJmaWVsZG1hcEZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJyZW1vdmUiLCJwcmVwZW5kIiwid29yZHByZXNzIiwic2FsZXNmb3JjZSIsIm1hcmt1cCIsImtleSIsImFwcGVuZCIsInB1c2hBbmRQdWxsT2JqZWN0cyIsIndvcmRwcmVzc0lkIiwic3VjY2VzcyIsInVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsInNhbGVzZm9yY2VJZCIsIm1hcHBpbmdJZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJjbGVhclNmd3BDYWNoZUxpbmsiLCJtZXNzYWdlIiwiZG9jdW1lbnQiLCJub3QiLCJwcm9wIiwicmVhZHkiLCJ0aW1lb3V0IiwiYWpheFN0YXJ0IiwiYWRkQ2xhc3MiLCJhamF4U3RvcCIsInJlbW92ZUNsYXNzIiwialF1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QUVEO0FBQ0F4RCxHQUFHa0UsUUFBSCxFQUFjeEQsRUFBZCxDQUFrQixPQUFsQixFQUEyQiwyQkFBM0IsRUFBd0QsWUFBVztBQUNsRVYsSUFBRywyQkFBSCxFQUFpQ21FLEdBQWpDLENBQXNDLElBQXRDLEVBQTZDQyxJQUE3QyxDQUFtRCxTQUFuRCxFQUE4RCxLQUE5RDtBQUNBLEVBRkQ7O0FBSUFwRSxHQUFHa0UsUUFBSCxFQUFjeEQsRUFBZCxDQUFrQixPQUFsQixFQUEyQixzQkFBM0IsRUFBbUQsWUFBVztBQUM3RFYsSUFBRyxzQkFBSCxFQUE0Qm1FLEdBQTVCLENBQWlDLElBQWpDLEVBQXdDQyxJQUF4QyxDQUE4QyxTQUE5QyxFQUF5RCxLQUF6RDtBQUNBLEVBRkQ7O0FBSUFwRSxHQUFHa0UsUUFBSCxFQUFjRyxLQUFkLENBQXFCLFlBQVc7O0FBRS9CLE1BQUlDLE9BQUo7QUFDQXRFLElBQUcsdUNBQUgsRUFBNkNVLEVBQTdDLENBQWlELFFBQWpELEVBQTJELFlBQVc7QUFDckVKLGdCQUFjZ0UsT0FBZDtBQUNBQSxhQUFVL0QsV0FBWSxZQUFXO0FBQ2hDUCxNQUFHLHVCQUFILEVBQTZCeUQsT0FBN0I7QUFDQXpELE1BQUcsdUJBQUgsRUFBNkI0QyxNQUE3QjtBQUNBLElBSFMsRUFHUCxJQUhPLENBQVY7QUFJQSxHQU5EOztBQVFBO0FBQ0E1QyxJQUFHa0UsUUFBSCxFQUFjSyxTQUFkLENBQXlCLFlBQVc7QUFDbkN2RSxLQUFHLFVBQUgsRUFBZ0J3RSxRQUFoQixDQUEwQixXQUExQjtBQUNBLEdBRkQsRUFFR0MsUUFGSCxDQUVhLFlBQVc7QUFDdkJ6RSxLQUFHLFVBQUgsRUFBZ0IwRSxXQUFoQixDQUE2QixXQUE3QjtBQUNBLEdBSkQ7QUFLQXpFO0FBQ0E2QjtBQUNBcUI7QUFDQWE7QUFDQSxFQXJCRDtBQXVCQSxDQXBQQyxFQW9QQ1csTUFwUEQsQ0FBRiIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gc2FsZXNmb3JjZU9iamVjdEZpZWxkcygpIHtcblxuXHRcdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0XHR9O1xuXHRcdH0oKSApO1xuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICggMCA9PT0gJCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLmhpZGUoKTtcblx0XHR9XG5cdFx0aWYgKCAwID09PSAkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdCQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbiggZWwgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgZGVsYXlUaW1lID0gMTAwMDtcblx0XHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0XHQnZmllbGRfdHlwZSc6ICdkYXRldGltZScsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JzogdGhhdC52YWx1ZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgPSAnJyxcbnJlY29yZFR5cGVEZWZhdWx0TWFya3VwID0gJycsXG5kYXRlTWFya3VwID0gJyc7XG5cblx0XHRcdFx0XHRpZiAoIDAgPCAkKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcyApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZFR5cGVzQWxsb3dlZE1hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaHRtbCggcmVjb3JkVHlwZXNBbGxvd2VkTWFya3VwICk7XG5cdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaHRtbCggcmVjb3JkVHlwZURlZmF1bHRNYXJrdXAgKTtcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEuZmllbGRzICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZGF0ZU1hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInB1bGxfdHJpZ2dlcl9maWVsZFwiIGlkPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IGRhdGUgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGRhdGVNYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0XHRkYXRlTWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+Jztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5odG1sKCBkYXRlTWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlc0FsbG93ZWRNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRUeXBlRGVmYXVsdE1hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJycgIT09IGRhdGVNYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSwgZGVsYXlUaW1lICk7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRGaWVsZE1hcHBpbmdSb3coKSB7XG5cdFx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZU9iamVjdCA9ICQoICcjc2FsZXNmb3JjZV9vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzT2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHJvd0tleSA9IE1hdGguZmxvb3IoIERhdGUubm93KCkgLyAxMDAwICk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3NPYmplY3QgJiYgJycgIT09IHNhbGVzZm9yY2VPYmplY3QgKSB7XG5cdFx0XHRcdGZpZWxkbWFwRmllbGRzKCB3b3JkcHJlc3NPYmplY3QsIHNhbGVzZm9yY2VPYmplY3QsIHJvd0tleSApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gZmllbGRtYXBGaWVsZHMoIHdvcmRwcmVzc09iamVjdCwgc2FsZXNmb3JjZU9iamVjdCwgcm93S2V5ICkge1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdnZXRfd3Bfc2Zfb2JqZWN0X2ZpZWxkcycsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCc6IHdvcmRwcmVzc09iamVjdCxcblx0XHRcdCdzYWxlc2ZvcmNlX29iamVjdCc6IHNhbGVzZm9yY2VPYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHR2YXIgd29yZHByZXNzID0gJyc7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZSA9ICcnO1xuXHRcdFx0dmFyIG1hcmt1cCA9ICcnO1xuXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19maWVsZFsnICsgcm93S2V5ICsgJ11cIiBpZD1cIndvcmRwcmVzc19maWVsZC0nICsgcm93S2V5ICsgJ1wiPic7XG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBXb3JkUHJlc3MgZmllbGQgLTwvb3B0aW9uPic7XG5cdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEud29yZHByZXNzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHR3b3JkcHJlc3MgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUua2V5ICsgJ1wiPicgKyB2YWx1ZS5rZXkgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0d29yZHByZXNzICs9ICc8L3NlbGVjdD4nO1xuXG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8c2VsZWN0IG5hbWU9XCJzYWxlc2ZvcmNlX2ZpZWxkWycgKyByb3dLZXkgKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9maWVsZC0nICsgcm93S2V5ICsgJ1wiPic7XG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgU2FsZXNmb3JjZSBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaCggcmVzcG9uc2UuZGF0YS5zYWxlc2ZvcmNlLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdG1hcmt1cCA9ICc8dHI+PHRkIGNsYXNzPVwiY29sdW1uLXdvcmRwcmVzc19maWVsZFwiPicgKyB3b3JkcHJlc3MgKyAnPC90ZD48dGQgY2xhc3M9XCJjb2x1bW4tc2FsZXNmb3JjZV9maWVsZFwiPicgKyBzYWxlc2ZvcmNlICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWlzX3ByZW1hdGNoXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19wcmVtYXRjaFsnICsgcm93S2V5ICsgJ11cIiBpZD1cImlzX3ByZW1hdGNoLScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48dGQgY2xhc3M9XCJjb2x1bW4taXNfa2V5XCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19rZXlbJyArIHJvd0tleSArICddXCIgaWQ9XCJpc19rZXktJyArIHJvd0tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWRpcmVjdGlvblwiPjxkaXYgY2xhc3M9XCJyYWRpb3NcIj48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic2Zfd3BcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dLZXkgKyAnLXNmLXdwXCI+ICBTYWxlc2ZvcmNlIHRvIFdvcmRQcmVzczwvbGFiZWw+PGxhYmVsPjxpbnB1dCB0eXBlPVwicmFkaW9cIiB2YWx1ZT1cIndwX3NmXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy13cC1zZlwiPiAgV29yZFByZXNzIHRvIFNhbGVzZm9yY2U8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzeW5jXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93S2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93S2V5ICsgJy1zeW5jXCIgY2hlY2tlZD4gIFN5bmM8L2xhYmVsPjwvZGl2PjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2RlbGV0ZVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfZGVsZXRlWycgKyByb3dLZXkgKyAnXVwiIGlkPVwiaXNfZGVsZXRlLScgKyByb3dLZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48L3RkPjwvdHI+Jztcblx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHknICkuYXBwZW5kKCBtYXJrdXAgKTtcblxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gcHVzaEFuZFB1bGxPYmplY3RzKCkge1xuXHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5oaWRlKCk7XG5cdFx0aWYgKCAwIDwgJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5wdXNoX3RvX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc09iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgd29yZHByZXNzSWQgPSAkKCAnI3dvcmRwcmVzc19pZF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJzogJ3B1c2hfdG9fc2FsZXNmb3JjZScsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3NPYmplY3QsXG5cdFx0XHRcdFx0J3dvcmRwcmVzc19pZCc6IHdvcmRwcmVzc0lkXG5cdFx0XHRcdH07XG5cdFx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdHVwZGF0ZVNhbGVzZm9yY2VVc2VyU3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLndpZHRoKCAkKCAnLm1hcHBlZC1zYWxlc2ZvcmNlLXVzZXInICkud2lkdGgoKSAtIDI3ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nICkuZmFkZUluKCkuZGVsYXkoIDQwMDAgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoICcucHVsbF9mcm9tX3NhbGVzZm9yY2VfYnV0dG9uJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlSWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3NPYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJzogJ3B1bGxfZnJvbV9zYWxlc2ZvcmNlJyxcblx0XHRcdFx0J3NhbGVzZm9yY2VfaWQnOiBzYWxlc2ZvcmNlSWQsXG5cdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzT2JqZWN0XG5cdFx0XHR9O1xuXHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHR1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkuaHRtbCggJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVTYWxlc2ZvcmNlVXNlclN1bW1hcnkoKSB7XG5cdFx0dmFyIG1hcHBpbmdJZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ0lkXG5cdFx0fTtcblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsZWFyU2Z3cENhY2hlTGluaygpIHtcblx0XHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHRcdH07XG5cdFx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gYXMgdGhlIGRydXBhbCBwbHVnaW4gZG9lcywgd2Ugb25seSBhbGxvdyBvbmUgZmllbGQgdG8gYmUgYSBwcmVtYXRjaCBvciBrZXlcblx0JCggZG9jdW1lbnQgKS5vbiggJ2NsaWNrJywgJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX2tleSBpbnB1dCcsIGZ1bmN0aW9uKCkge1xuXHRcdCQoICcuY29sdW1uLWlzX2tleSBpbnB1dCcgKS5ub3QoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdH0pO1xuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXG5cdFx0dmFyIHRpbWVvdXQ7XG5cdFx0JCggJyN3b3JkcHJlc3Nfb2JqZWN0LCAjc2FsZXNmb3JjZV9vYmplY3QnICkub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAndGFibGUuZmllbGRzIHRib2R5IHRyJyApLmZhZGVPdXQoKTtcblx0XHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5yZW1vdmUoKTtcblx0XHRcdH0sIDEwMDAgKTtcblx0XHR9KTtcblxuXHRcdC8vIHRvZG86IG5lZWQgdG8gZml4IHRoaXMgc28gaXQgZG9lc24ndCBydW4gYWxsIHRoZSBzcGlubmVycyBhdCB0aGUgc2FtZSB0aW1lIHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlcyBvbiB0aGUgc2FtZSBwYWdlXG5cdFx0JCggZG9jdW1lbnQgKS5hamF4U3RhcnQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zcGlubmVyJyApLmFkZENsYXNzKCAnaXMtYWN0aXZlJyApO1xuXHRcdH0pLmFqYXhTdG9wKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5yZW1vdmVDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KTtcblx0XHRzYWxlc2ZvcmNlT2JqZWN0RmllbGRzKCk7XG5cdFx0YWRkRmllbGRNYXBwaW5nUm93KCk7XG5cdFx0cHVzaEFuZFB1bGxPYmplY3RzKCk7XG5cdFx0Y2xlYXJTZndwQ2FjaGVMaW5rKCk7XG5cdH0pO1xuXG59KCBqUXVlcnkgKSApO1xuIl19
