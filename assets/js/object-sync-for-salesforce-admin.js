'use strict';

(function ($) {

	function salesforce_object_fields() {
		if ($('.salesforce_record_types_allowed > *').length === 0) {
			$('.salesforce_record_types_allowed').hide();
		}
		if ($('.salesforce_record_type_default > *').length === 0) {
			$('.salesforce_record_type_default').hide();
		}
		if ($('.pull_trigger_field > *').length === 0) {
			$('.pull_trigger_field').hide();
		}

		var delay = function () {
			var timer = 0;
			return function (callback, ms) {
				clearTimeout(timer);
				timer = setTimeout(callback, ms);
			};
		}();

		$('#salesforce_object').on('change', function (el) {
			var that = this;
			var delay_time = 1000;
			delay(function () {
				var data = {
					'action': 'get_salesforce_object_description',
					'include': ['fields', 'recordTypeInfos'],
					'field_type': 'datetime',
					'salesforce_object': that.value
				};
				$.post(ajaxurl, data, function (response) {

					var record_types_allowed_markup = '',
					    record_type_default_markup = '',
					    date_markup = '';

					if ($(response.data.recordTypeInfos).length > 0) {
						record_types_allowed_markup += '<label for="salesforce_record_types_allowed">Allowed Record Types:</label><div class="checkboxes">';
						$.each(response.data.recordTypeInfos, function (index, value) {
							record_types_allowed_markup += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
						});
						record_types_allowed_markup += '</div>';

						record_type_default_markup += '<label for="salesforce_record_type_default">Default Record Type:</label>';
						record_type_default_markup += '<select name="salesforce_record_type_default" id="salesforce_record_type_default"><option value="">- Select record type -</option>';
						$.each(response.data.recordTypeInfos, function (index, value) {
							record_type_default_markup += '<option value="' + index + '">' + value + '</option>';
						});
					}

					$('.salesforce_record_types_allowed').html(record_types_allowed_markup);
					$('.salesforce_record_type_default').html(record_type_default_markup);

					if ($(response.data.fields).length > 0) {
						date_markup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
						date_markup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>';
						$.each(response.data.fields, function (index, value) {
							date_markup += '<option value="' + value.name + '">' + value.label + '</option>';
						});
						date_markup += '</select>';
						date_markup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>';
					}

					$('.pull_trigger_field').html(date_markup);

					if (record_types_allowed_markup !== '') {
						$('.salesforce_record_types_allowed').show();
					} else {
						$('.salesforce_record_types_allowed').hide();
					}
					if (record_type_default_markup !== '') {
						$('.salesforce_record_type_default').show();
					} else {
						$('.salesforce_record_type_default').hide();
					}

					if (date_markup !== '') {
						$('.pull_trigger_field').show();
					} else {
						$('.pull_trigger_field').hide();
					}
				});
			}, delay_time);
		});
	}

	function add_field_mapping_row() {
		$('#add-field-mapping').click(function () {
			$(this).text('Add another field mapping');
			var salesforce_object = $('#salesforce_object').val();
			var wordpress_object = $('#wordpress_object').val();
			if (wordpress_object !== '' && salesforce_object !== '') {
				var row_key = Math.floor(Date.now() / 1000);
				fieldmap_fields(wordpress_object, salesforce_object, row_key);
				$(this).parent().find('.missing-object').remove();
			} else {
				$(this).parent().prepend('<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>');
			}
			return false;
		});
	}

	function fieldmap_fields(wordpress_object, salesforce_object, row_key) {
		var data = {
			'action': 'get_wp_sf_object_fields',
			'wordpress_object': wordpress_object,
			'salesforce_object': salesforce_object
		};
		$.post(ajaxurl, data, function (response) {

			var wordpress = '';
			wordpress += '<select name="wordpress_field[' + row_key + ']" id="wordpress_field-' + row_key + '">';
			wordpress += '<option value="">- Select WordPress field -</option>';
			$.each(response.data.wordpress, function (index, value) {
				wordpress += '<option value="' + value.key + '">' + value.key + '</option>';
			});
			wordpress += '</select>';

			var salesforce = '';
			salesforce += '<select name="salesforce_field[' + row_key + ']" id="salesforce_field-' + row_key + '">';
			salesforce += '<option value="">- Select Salesforce field -</option>';
			$.each(response.data.salesforce, function (index, value) {
				salesforce += '<option value="' + value.name + '">' + value.label + '</option>';
			});
			salesforce += '</select>';

			var markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + row_key + ']" id="is_prematch-' + row_key + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + row_key + ']" id="is_key-' + row_key + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[' + row_key + ']" id="direction-' + row_key + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[' + row_key + ']" id="direction-' + row_key + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sync" name="direction[' + row_key + ']" id="direction-' + row_key + '-sync" checked>  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + row_key + ']" id="is_delete-' + row_key + '" value="1" /></td></tr>';
			$('table.fields tbody').append(markup);
		});
	}

	function push_and_pull_objects() {
		$('.salesforce_user_ajax_message').hide();
		if ($('#wordpress_object_ajax').length > 0) {
			$('.push_to_salesforce_button').on('click', function () {
				var wordpress_object = $('#wordpress_object_ajax').val();
				var wordpress_id = $('#wordpress_id_ajax').val();
				var data = {
					'action': 'push_to_salesforce',
					'wordpress_object': wordpress_object,
					'wordpress_id': wordpress_id
				};
				$.post(ajaxurl, data, function (response) {
					if (response.success === true) {
						update_salesforce_user_summary();
						$('.salesforce_user_ajax_message').width($('.mapped-salesforce-user').width() - 27);
						$('.salesforce_user_ajax_message').html('<p>This object has been pushed to Salesforce.</p>').fadeIn().delay(4000).fadeOut();
					}
				});
				return false;
			});
		}
		$('.pull_from_salesforce_button').on('click', function () {
			var salesforce_id = $('#salesforce_id_ajax').val();
			var wordpress_object = $('#wordpress_object_ajax').val();
			var data = {
				'action': 'pull_from_salesforce',
				'salesforce_id': salesforce_id,
				'wordpress_object': wordpress_object
			};
			$.post(ajaxurl, data, function (response) {
				if (response.success === true) {
					update_salesforce_user_summary();
					$('.salesforce_user_ajax_message').width($('.mapped-salesforce-user').width() - 27);
					$('.salesforce_user_ajax_message').html('<p>This object has been pulled from Salesforce.</p>').fadeIn().delay(4000).fadeOut();
				}
			});
			return false;
		});
	}

	function update_salesforce_user_summary() {
		var mapping_id = $('#mapping_id_ajax').val();
		var data = {
			'action': 'refresh_mapped_data',
			'mapping_id': mapping_id
		};
		$.post(ajaxurl, data, function (response) {
			if (response.success === true) {
				$('td.last_sync_message').text(response.data.last_sync_message);
				$('td.last_sync_action').text(response.data.last_sync_action);
				$('td.last_sync_status').text(response.data.last_sync_status);
				$('td.last_sync').text(response.data.last_sync);
				if (response.data.last_sync_status === '1') {
					$('td.last_sync_status').text('success');
				}
			}
		});
	}

	function clear_sfwp_cache_link() {
		$('#clear-sfwp-cache').click(function () {
			var data = {
				'action': 'clear_sfwp_cache'
			};
			var that = $(this);
			$.post(ajaxurl, data, function (response) {
				if (response.success === true && response.data.success === true) {
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
		salesforce_object_fields();
		add_field_mapping_row();
		push_and_pull_objects();
		clear_sfwp_cache_link();
	});
})(jQuery);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJzYWxlc2ZvcmNlX29iamVjdF9maWVsZHMiLCJsZW5ndGgiLCJoaWRlIiwiZGVsYXkiLCJ0aW1lciIsImNhbGxiYWNrIiwibXMiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwib24iLCJlbCIsInRoYXQiLCJkZWxheV90aW1lIiwiZGF0YSIsInZhbHVlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInJlY29yZF90eXBlc19hbGxvd2VkX21hcmt1cCIsInJlY29yZF90eXBlX2RlZmF1bHRfbWFya3VwIiwiZGF0ZV9tYXJrdXAiLCJyZWNvcmRUeXBlSW5mb3MiLCJlYWNoIiwiaW5kZXgiLCJodG1sIiwiZmllbGRzIiwibmFtZSIsImxhYmVsIiwic2hvdyIsImFkZF9maWVsZF9tYXBwaW5nX3JvdyIsImNsaWNrIiwidGV4dCIsInNhbGVzZm9yY2Vfb2JqZWN0IiwidmFsIiwid29yZHByZXNzX29iamVjdCIsInJvd19rZXkiLCJNYXRoIiwiZmxvb3IiLCJEYXRlIiwibm93IiwiZmllbGRtYXBfZmllbGRzIiwicGFyZW50IiwiZmluZCIsInJlbW92ZSIsInByZXBlbmQiLCJ3b3JkcHJlc3MiLCJrZXkiLCJzYWxlc2ZvcmNlIiwibWFya3VwIiwiYXBwZW5kIiwicHVzaF9hbmRfcHVsbF9vYmplY3RzIiwid29yZHByZXNzX2lkIiwic3VjY2VzcyIsInVwZGF0ZV9zYWxlc2ZvcmNlX3VzZXJfc3VtbWFyeSIsIndpZHRoIiwiZmFkZUluIiwiZmFkZU91dCIsInNhbGVzZm9yY2VfaWQiLCJtYXBwaW5nX2lkIiwibGFzdF9zeW5jX21lc3NhZ2UiLCJsYXN0X3N5bmNfYWN0aW9uIiwibGFzdF9zeW5jX3N0YXR1cyIsImxhc3Rfc3luYyIsImNsZWFyX3Nmd3BfY2FjaGVfbGluayIsIm1lc3NhZ2UiLCJkb2N1bWVudCIsIm5vdCIsInByb3AiLCJyZWFkeSIsInRpbWVvdXQiLCJhamF4U3RhcnQiLCJhZGRDbGFzcyIs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LENBL09ELEVBK09HVyxNQS9PSCIsImZpbGUiOiJvYmplY3Qtc3luYy1mb3Itc2FsZXNmb3JjZS1hZG1pbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigkKXtcblxuXHRmdW5jdGlvbiBzYWxlc2ZvcmNlX29iamVjdF9maWVsZHMoKSB7XG5cdFx0aWYgKCQoJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkID4gKicpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0JCgnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnKS5oaWRlKCk7XG5cdFx0fVxuXHRcdGlmICgkKCcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0ID4gKicpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0JCgnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcpLmhpZGUoKTtcblx0XHR9XG5cdFx0aWYgKCQoJy5wdWxsX3RyaWdnZXJfZmllbGQgPiAqJykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHQkKCcucHVsbF90cmlnZ2VyX2ZpZWxkJykuaGlkZSgpO1xuXHRcdH1cblxuXHRcdHZhciBkZWxheSA9IChmdW5jdGlvbigpe1xuXHRcdCAgdmFyIHRpbWVyID0gMDtcblx0XHQgIHJldHVybiBmdW5jdGlvbihjYWxsYmFjaywgbXMpe1xuXHRcdCAgICBjbGVhclRpbWVvdXQgKHRpbWVyKTtcblx0XHQgICAgdGltZXIgPSBzZXRUaW1lb3V0KGNhbGxiYWNrLCBtcyk7XG5cdFx0ICB9O1xuXHRcdH0pKCk7XG5cblx0XHQkKCcjc2FsZXNmb3JjZV9vYmplY3QnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oZWwpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheV90aW1lID0gMTAwMDtcblx0XHRcdGRlbGF5KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2dldF9zYWxlc2ZvcmNlX29iamVjdF9kZXNjcmlwdGlvbicsXG5cdFx0XHRcdFx0J2luY2x1ZGUnIDogWydmaWVsZHMnLCAncmVjb3JkVHlwZUluZm9zJ10sXG5cdFx0XHRcdFx0J2ZpZWxkX3R5cGUnIDogJ2RhdGV0aW1lJyxcblx0XHRcdFx0XHQnc2FsZXNmb3JjZV9vYmplY3QnIDogdGhhdC52YWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdCQucG9zdChhamF4dXJsLCBkYXRhLCBmdW5jdGlvbihyZXNwb25zZSkge1xuXG5cdFx0XHRcdFx0dmFyIHJlY29yZF90eXBlc19hbGxvd2VkX21hcmt1cCA9ICcnLCByZWNvcmRfdHlwZV9kZWZhdWx0X21hcmt1cCA9ICcnLCBkYXRlX21hcmt1cCA9ICcnO1xuXG5cdFx0XHRcdFx0aWYgKCQocmVzcG9uc2UuZGF0YS5yZWNvcmRUeXBlSW5mb3MpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdHJlY29yZF90eXBlc19hbGxvd2VkX21hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWRcIj5BbGxvd2VkIFJlY29yZCBUeXBlczo8L2xhYmVsPjxkaXYgY2xhc3M9XCJjaGVja2JveGVzXCI+Jztcblx0XHRcdFx0XHRcdCQuZWFjaChyZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdHJlY29yZF90eXBlc19hbGxvd2VkX21hcmt1cCArPSAnPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiB2YWx1ZT1cIicgKyBpbmRleCArICdcIiBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFsnICsgaW5kZXggKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZC0nICsgaW5kZXggKyAnXCI+ICcgKyB2YWx1ZSArICc8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlY29yZF90eXBlc19hbGxvd2VkX21hcmt1cCArPSAnPC9kaXY+JztcblxuXG5cdFx0XHRcdFx0XHRyZWNvcmRfdHlwZV9kZWZhdWx0X21hcmt1cCArPSAnPGxhYmVsIGZvcj1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiPkRlZmF1bHQgUmVjb3JkIFR5cGU6PC9sYWJlbD4nO1xuXHRcdFx0XHRcdFx0cmVjb3JkX3R5cGVfZGVmYXVsdF9tYXJrdXAgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdFwiIGlkPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+PG9wdGlvbiB2YWx1ZT1cIlwiPi0gU2VsZWN0IHJlY29yZCB0eXBlIC08L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkX3R5cGVfZGVmYXVsdF9tYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgaW5kZXggKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcpLmh0bWwocmVjb3JkX3R5cGVzX2FsbG93ZWRfbWFya3VwKTtcblx0XHRcdFx0XHQkKCcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JykuaHRtbChyZWNvcmRfdHlwZV9kZWZhdWx0X21hcmt1cCk7XG5cblx0XHRcdFx0XHRpZiAoJChyZXNwb25zZS5kYXRhLmZpZWxkcykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0ZGF0ZV9tYXJrdXAgKz0gJzxsYWJlbCBmb3I9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj5EYXRlIGZpZWxkIHRvIHRyaWdnZXIgcHVsbDo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRkYXRlX21hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwicHVsbF90cmlnZ2VyX2ZpZWxkXCIgaWQ9XCJwdWxsX3RyaWdnZXJfZmllbGRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgZGF0ZSBmaWVsZCAtPC9vcHRpb24+J1xuXHRcdFx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0ZGF0ZV9tYXJrdXAgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0ZGF0ZV9tYXJrdXAgKz0gJzwvc2VsZWN0Pic7XG5cdFx0XHRcdFx0XHRkYXRlX21hcmt1cCArPSAnPHAgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlRoZXNlIGFyZSBkYXRlIGZpZWxkcyB0aGF0IGNhbiBjYXVzZSBXb3JkUHJlc3MgdG8gcHVsbCBhbiB1cGRhdGUgZnJvbSBTYWxlc2ZvcmNlLCBhY2NvcmRpbmcgdG8gdGhlIDxjb2RlPnNhbGVzZm9yY2VfcHVsbDwvY29kZT4gY2xhc3MuPC9wPidcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkKCcucHVsbF90cmlnZ2VyX2ZpZWxkJykuaHRtbChkYXRlX21hcmt1cCk7XG5cblx0XHRcdFx0XHRpZiAocmVjb3JkX3R5cGVzX2FsbG93ZWRfbWFya3VwICE9PSAnJykge1xuXHRcdFx0XHRcdFx0JCgnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkJykuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocmVjb3JkX3R5cGVfZGVmYXVsdF9tYXJrdXAgIT09ICcnKSB7XG5cdFx0XHRcdFx0XHQkKCcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0Jykuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JykuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChkYXRlX21hcmt1cCAhPT0gJycpIHtcblx0XHRcdFx0XHRcdCQoJy5wdWxsX3RyaWdnZXJfZmllbGQnKS5zaG93KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoJy5wdWxsX3RyaWdnZXJfZmllbGQnKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIGRlbGF5X3RpbWUgKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZF9maWVsZF9tYXBwaW5nX3JvdygpIHtcblx0XHQkKCcjYWRkLWZpZWxkLW1hcHBpbmcnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdCQodGhpcykudGV4dCgnQWRkIGFub3RoZXIgZmllbGQgbWFwcGluZycpO1xuXHRcdFx0dmFyIHNhbGVzZm9yY2Vfb2JqZWN0ID0gJCgnI3NhbGVzZm9yY2Vfb2JqZWN0JykudmFsKCk7XG5cdFx0XHR2YXIgd29yZHByZXNzX29iamVjdCA9ICQoJyN3b3JkcHJlc3Nfb2JqZWN0JykudmFsKCk7XG5cdFx0XHRpZiAod29yZHByZXNzX29iamVjdCAhPT0gJycgJiYgc2FsZXNmb3JjZV9vYmplY3QgIT09ICcnKSB7XG5cdFx0XHRcdHZhciByb3dfa2V5ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG5cdFx0XHRcdGZpZWxkbWFwX2ZpZWxkcyh3b3JkcHJlc3Nfb2JqZWN0LCBzYWxlc2ZvcmNlX29iamVjdCwgcm93X2tleSk7XG5cdFx0XHRcdCQodGhpcykucGFyZW50KCkuZmluZCgnLm1pc3Npbmctb2JqZWN0JykucmVtb3ZlKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnByZXBlbmQoJzxkaXYgY2xhc3M9XCJlcnJvciBtaXNzaW5nLW9iamVjdFwiPjxzcGFuPllvdSBoYXZlIHRvIHBpY2sgYSBXb3JkUHJlc3Mgb2JqZWN0IGFuZCBhIFNhbGVzZm9yY2Ugb2JqZWN0IHRvIGFkZCBmaWVsZCBtYXBwaW5nLjwvc3Bhbj48L2Rpdj4nKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cblx0ZnVuY3Rpb24gZmllbGRtYXBfZmllbGRzKHdvcmRwcmVzc19vYmplY3QsIHNhbGVzZm9yY2Vfb2JqZWN0LCByb3dfa2V5KSB7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdnZXRfd3Bfc2Zfb2JqZWN0X2ZpZWxkcycsXG5cdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3Nfb2JqZWN0LFxuXHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JyA6IHNhbGVzZm9yY2Vfb2JqZWN0XG5cdFx0fVxuXHRcdCQucG9zdChhamF4dXJsLCBkYXRhLCBmdW5jdGlvbihyZXNwb25zZSkge1xuXG5cdFx0XHR2YXIgd29yZHByZXNzID0gJyc7XG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19maWVsZFsnICsgcm93X2tleSArICddXCIgaWQ9XCJ3b3JkcHJlc3NfZmllbGQtJyArIHJvd19rZXkgKyAnXCI+J1xuXHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgV29yZFByZXNzIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKHJlc3BvbnNlLmRhdGEud29yZHByZXNzLCBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblx0XHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHdvcmRwcmVzcyArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0dmFyIHNhbGVzZm9yY2UgPSAnJztcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxzZWxlY3QgbmFtZT1cInNhbGVzZm9yY2VfZmllbGRbJyArIHJvd19rZXkgKyAnXVwiIGlkPVwic2FsZXNmb3JjZV9maWVsZC0nICsgcm93X2tleSArICdcIj4nXG5cdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgU2FsZXNmb3JjZSBmaWVsZCAtPC9vcHRpb24+Jztcblx0XHRcdCQuZWFjaChyZXNwb25zZS5kYXRhLnNhbGVzZm9yY2UsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXHRcdFx0XHRzYWxlc2ZvcmNlICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLm5hbWUgKyAnXCI+JyArIHZhbHVlLmxhYmVsICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzwvc2VsZWN0Pic7XG5cblx0XHRcdHZhciBtYXJrdXAgPSAnPHRyPjx0ZCBjbGFzcz1cImNvbHVtbi13b3JkcHJlc3NfZmllbGRcIj4nICsgd29yZHByZXNzICsgJzwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLXNhbGVzZm9yY2VfZmllbGRcIj4nICsgc2FsZXNmb3JjZSArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1pc19wcmVtYXRjaFwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfcHJlbWF0Y2hbJyArIHJvd19rZXkgKyAnXVwiIGlkPVwiaXNfcHJlbWF0Y2gtJyArIHJvd19rZXkgKyAnXCIgdmFsdWU9XCIxXCIgLz48dGQgY2xhc3M9XCJjb2x1bW4taXNfa2V5XCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19rZXlbJyArIHJvd19rZXkgKyAnXVwiIGlkPVwiaXNfa2V5LScgKyByb3dfa2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4tZGlyZWN0aW9uXCI+PGRpdiBjbGFzcz1cInJhZGlvc1wiPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzZl93cFwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd19rZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dfa2V5ICsgJy1zZi13cFwiPiAgU2FsZXNmb3JjZSB0byBXb3JkUHJlc3M8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJ3cF9zZlwiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd19rZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dfa2V5ICsgJy13cC1zZlwiPiAgV29yZFByZXNzIHRvIFNhbGVzZm9yY2U8L2xhYmVsPjxsYWJlbD48aW5wdXQgdHlwZT1cInJhZGlvXCIgdmFsdWU9XCJzeW5jXCIgbmFtZT1cImRpcmVjdGlvblsnICsgcm93X2tleSArICddXCIgaWQ9XCJkaXJlY3Rpb24tJyArIHJvd19rZXkgKyAnLXN5bmNcIiBjaGVja2VkPiAgU3luYzwvbGFiZWw+PC9kaXY+PC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfZGVsZXRlXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJpc19kZWxldGVbJyArIHJvd19rZXkgKyAnXVwiIGlkPVwiaXNfZGVsZXRlLScgKyByb3dfa2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PC90ZD48L3RyPic7XG5cdFx0XHQkKCd0YWJsZS5maWVsZHMgdGJvZHknKS5hcHBlbmQobWFya3VwKTtcblxuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gcHVzaF9hbmRfcHVsbF9vYmplY3RzKCkge1xuXHRcdCQoJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJykuaGlkZSgpO1xuXHRcdGlmICgkKCcjd29yZHByZXNzX29iamVjdF9hamF4JykubGVuZ3RoID4gMCkge1xuXHRcdFx0JCgnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHdvcmRwcmVzc19vYmplY3QgPSAkKCcjd29yZHByZXNzX29iamVjdF9hamF4JykudmFsKCk7XG5cdFx0XHRcdHZhciB3b3JkcHJlc3NfaWQgPSAkKCcjd29yZHByZXNzX2lkX2FqYXgnKS52YWwoKTtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAncHVzaF90b19zYWxlc2ZvcmNlJyxcblx0XHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3Nfb2JqZWN0LFxuXHRcdFx0XHRcdCd3b3JkcHJlc3NfaWQnIDogd29yZHByZXNzX2lkXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdHVwZGF0ZV9zYWxlc2ZvcmNlX3VzZXJfc3VtbWFyeSgpO1xuXHRcdFx0XHRcdFx0JCgnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnKS53aWR0aCgkKCcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicpLndpZHRoKCkgLSAyNyk7XG5cdFx0XHRcdFx0XHQkKCcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScpLmh0bWwoJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1c2hlZCB0byBTYWxlc2ZvcmNlLjwvcD4nKS5mYWRlSW4oKS5kZWxheSg0MDAwKS5mYWRlT3V0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdCQoJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzYWxlc2ZvcmNlX2lkID0gJCgnI3NhbGVzZm9yY2VfaWRfYWpheCcpLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc19vYmplY3QgPSAkKCcjd29yZHByZXNzX29iamVjdF9hamF4JykudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbicgOiAncHVsbF9mcm9tX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHQnc2FsZXNmb3JjZV9pZCcgOiBzYWxlc2ZvcmNlX2lkLFxuXHRcdFx0XHQnd29yZHByZXNzX29iamVjdCcgOiB3b3JkcHJlc3Nfb2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoYWpheHVybCwgZGF0YSwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFx0XHR1cGRhdGVfc2FsZXNmb3JjZV91c2VyX3N1bW1hcnkoKTtcblx0XHRcdFx0XHQkKCcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScpLndpZHRoKCQoJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJykud2lkdGgoKSAtIDI3KTtcblx0XHRcdFx0XHQkKCcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScpLmh0bWwoJzxwPlRoaXMgb2JqZWN0IGhhcyBiZWVuIHB1bGxlZCBmcm9tIFNhbGVzZm9yY2UuPC9wPicpLmZhZGVJbigpLmRlbGF5KDQwMDApLmZhZGVPdXQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiB1cGRhdGVfc2FsZXNmb3JjZV91c2VyX3N1bW1hcnkoKSB7XG5cdFx0dmFyIG1hcHBpbmdfaWQgPSAkKCcjbWFwcGluZ19pZF9hamF4JykudmFsKCk7XG5cdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHQnYWN0aW9uJyA6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHRcdCdtYXBwaW5nX2lkJyA6IG1hcHBpbmdfaWRcblx0XHR9XG5cdFx0JC5wb3N0KGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHQkKCd0ZC5sYXN0X3N5bmNfbWVzc2FnZScpLnRleHQocmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfbWVzc2FnZSk7XG5cdFx0XHRcdCQoJ3RkLmxhc3Rfc3luY19hY3Rpb24nKS50ZXh0KHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX2FjdGlvbik7XG5cdFx0XHRcdCQoJ3RkLmxhc3Rfc3luY19zdGF0dXMnKS50ZXh0KHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyk7XG5cdFx0XHRcdCQoJ3RkLmxhc3Rfc3luYycpLnRleHQocmVzcG9uc2UuZGF0YS5sYXN0X3N5bmMpO1xuXHRcdFx0XHRpZiAocmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfc3RhdHVzID09PSAnMScpIHtcblx0XHRcdFx0XHQkKCd0ZC5sYXN0X3N5bmNfc3RhdHVzJykudGV4dCgnc3VjY2VzcycpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBjbGVhcl9zZndwX2NhY2hlX2xpbmsoKSB7XG5cdFx0JCgnI2NsZWFyLXNmd3AtY2FjaGUnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHQnYWN0aW9uJyA6ICdjbGVhcl9zZndwX2NhY2hlJ1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRoYXQgPSAkKHRoaXMpO1xuXHRcdFx0JC5wb3N0KGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbChyZXNwb25zZS5kYXRhLm1lc3NhZ2UpLmZhZGVJbigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIGFzIHRoZSBkcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2ggb3Iga2V5XG5cdCQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCgnLmNvbHVtbi1pc19wcmVtYXRjaCBpbnB1dCcpLm5vdCh0aGlzKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHR9KTtcblxuXHQkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCcuY29sdW1uLWlzX2tleSBpbnB1dCcpLm5vdCh0aGlzKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHR9KTtcblxuXHQkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuXHRcdHZhciB0aW1lb3V0O1xuXHRcdCQoJyN3b3JkcHJlc3Nfb2JqZWN0LCAjc2FsZXNmb3JjZV9vYmplY3QnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGltZW91dCk7XG5cdFx0XHR0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0JCgndGFibGUuZmllbGRzIHRib2R5IHRyJykuZmFkZU91dCgpO1xuXHRcdFx0XHQkKCd0YWJsZS5maWVsZHMgdGJvZHkgdHInKS5yZW1vdmUoKTtcblx0XHRcdH0sIDEwMDApO1xuXHRcdH0pO1xuXG5cdFx0Ly8gdG9kbzogbmVlZCB0byBmaXggdGhpcyBzbyBpdCBkb2Vzbid0IHJ1biBhbGwgdGhlIHNwaW5uZXJzIGF0IHRoZSBzYW1lIHRpbWUgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGVzIG9uIHRoZSBzYW1lIHBhZ2Vcblx0XHQkKGRvY3VtZW50KS5hamF4U3RhcnQoZnVuY3Rpb24oKXtcblx0XHRcdCQoJy5zcGlubmVyJykuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXHRcdH0pLmFqYXhTdG9wKGZ1bmN0aW9uKCkge1xuXHRcdFx0JCgnLnNwaW5uZXInKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG5cdFx0fSk7XG5cdFx0c2FsZXNmb3JjZV9vYmplY3RfZmllbGRzKCk7XG5cdFx0YWRkX2ZpZWxkX21hcHBpbmdfcm93KCk7XG5cdFx0cHVzaF9hbmRfcHVsbF9vYmplY3RzKCk7XG5cdFx0Y2xlYXJfc2Z3cF9jYWNoZV9saW5rKCk7XG5cdH0pO1xuXG59KShqUXVlcnkpO1xuIl19
