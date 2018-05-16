'use strict';

(function ($) {

	function add_field_mapping_row() {
		$('#add-field-mapping').click(function () {
			var salesforce_object = $('#salesforce_object').val();
			var wordpress_object = $('#wordpress_object').val();
			var row_key = Math.floor(Date.now() / 1000);
			$(this).text('Add another field mapping');
			if ('' !== wordpress_object && '' !== salesforce_object) {
				fieldmap_fields(wordpress_object, salesforce_object, row_key);
				$(this).parent().find('.missing-object').remove();
			} else {
				$(this).parent().prepend('<div class="error missing-object"><span>You have to pick a WordPress object and a Salesforce object to add field mapping.</span></div>');
			}
			return false;
		});
	}

	function clear_sfwp_cache_link() {
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

	function fieldmap_fields(wordpress_object, salesforce_object, row_key) {
		var data = {
			'action': 'get_wp_sf_object_fields',
			'wordpress_object': wordpress_object,
			'salesforce_object': salesforce_object
		};
		$.post(ajaxurl, data, function (response) {

			var wordpress = '';
			var salesforce = '';
			var markup = '';

			wordpress += '<select name="wordpress_field[' + row_key + ']" id="wordpress_field-' + row_key + '">';
			wordpress += '<option value="">- Select WordPress field -</option>';
			$.each(response.data.wordpress, function (index, value) {
				wordpress += '<option value="' + value.key + '">' + value.key + '</option>';
			});
			wordpress += '</select>';

			salesforce += '<select name="salesforce_field[' + row_key + ']" id="salesforce_field-' + row_key + '">';
			salesforce += '<option value="">- Select Salesforce field -</option>';
			$.each(response.data.salesforce, function (index, value) {
				salesforce += '<option value="' + value.name + '">' + value.label + '</option>';
			});
			salesforce += '</select>';

			markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + row_key + ']" id="is_prematch-' + row_key + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + row_key + ']" id="is_key-' + row_key + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[' + row_key + ']" id="direction-' + row_key + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[' + row_key + ']" id="direction-' + row_key + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sync" name="direction[' + row_key + ']" id="direction-' + row_key + '-sync" checked>  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + row_key + ']" id="is_delete-' + row_key + '" value="1" /></td></tr>';
			$('table.fields tbody').append(markup);
		});
	}

	function push_and_pull_objects() {
		$('.salesforce_user_ajax_message').hide();
		if (0 < $('#wordpress_object_ajax').length) {
			$('.push_to_salesforce_button').on('click', function () {
				var wordpress_object = $('#wordpress_object_ajax').val();
				var wordpress_id = $('#wordpress_id_ajax').val();
				var data = {
					'action': 'push_to_salesforce',
					'wordpress_object': wordpress_object,
					'wordpress_id': wordpress_id
				};
				$.post(ajaxurl, data, function (response) {
					if (true === response.success) {
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
				if (true === response.success) {
					update_salesforce_user_summary();
					$('.salesforce_user_ajax_message').width($('.mapped-salesforce-user').width() - 27);
					$('.salesforce_user_ajax_message').html('<p>This object has been pulled from Salesforce.</p>').fadeIn().delay(4000).fadeOut();
				}
			});
			return false;
		});
	}

	function salesforce_object_fields() {

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

					if (0 < $(response.data.recordTypeInfos).length) {
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

					if (0 < $(response.data.fields).length) {
						date_markup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
						date_markup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>';
						$.each(response.data.fields, function (index, value) {
							date_markup += '<option value="' + value.name + '">' + value.label + '</option>';
						});
						date_markup += '</select>';
						date_markup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>';
					}

					$('.pull_trigger_field').html(date_markup);

					if ('' !== record_types_allowed_markup) {
						$('.salesforce_record_types_allowed').show();
					} else {
						$('.salesforce_record_types_allowed').hide();
					}
					if ('' !== record_type_default_markup) {
						$('.salesforce_record_type_default').show();
					} else {
						$('.salesforce_record_type_default').hide();
					}

					if ('' !== date_markup) {
						$('.pull_trigger_field').show();
					} else {
						$('.pull_trigger_field').hide();
					}
				});
			}, delay_time);
		});
	}

	function update_salesforce_user_summary() {
		var mapping_id = $('#mapping_id_ajax').val();
		var data = {
			'action': 'refresh_mapped_data',
			'mapping_id': mapping_id
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkbWluLmpzIl0sIm5hbWVzIjpbIiQiLCJhZGRfZmllbGRfbWFwcGluZ19yb3ciLCJjbGljayIsInNhbGVzZm9yY2Vfb2JqZWN0IiwidmFsIiwid29yZHByZXNzX29iamVjdCIsInJvd19rZXkiLCJNYXRoIiwiZmxvb3IiLCJEYXRlIiwibm93IiwidGV4dCIsImZpZWxkbWFwX2ZpZWxkcyIsInBhcmVudCIsImZpbmQiLCJyZW1vdmUiLCJwcmVwZW5kIiwiY2xlYXJfc2Z3cF9jYWNoZV9saW5rIiwiZGF0YSIsInRoYXQiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImh0bWwiLCJtZXNzYWdlIiwiZmFkZUluIiwid29yZHByZXNzIiwic2FsZXNmb3JjZSIsIm1hcmt1cCIsImVhY2giLCJpbmRleCIsInZhbHVlIiwia2V5IiwibmFtZSIsImxhYmVsIiwiYXBwZW5kIiwicHVzaF9hbmRfcHVsbF9vYmplY3RzIiwiaGlkZSIsImxlbmd0aCIsIm9uIiwid29yZHByZXNzX2lkIiwidXBkYXRlX3NhbGVzZm9yY2VfdXNlcl9zdW1tYXJ5Iiwid2lkdGgiLCJkZWxheSIsImZhZGVPdXQiLCJzYWxlc2ZvcmNlX2lkIiwic2FsZXNmb3JjZV9vYmplY3RfZmllbGRzIiwidGltZXIiLCJjYWxsYmFjayIsIm1zIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImVsIiwiZGVsYXlfdGltZSIsInJlY29yZF90eXBlc19hbGxvd2VkX21hcmt1cCIsInJlY29yZF90eXBlX2RlZmF1bHRfbWFya3VwIiwiZGF0ZV9tYXJrdXAiLCJyZWNvcmRUeXBlSW5mb3MiLCJmaWVsZHMiLCJzaG93IiwibWFwcGluZ19pZCIsImxhc3Rfc3luY19tZXNzYWdlIiwibGFzdF9zeW5jX2FjdGlvbiIsImxhc3Rfc3luY19zdGF0dXMiLCJsYXN0X3N5bmMiLCJkb2N1bWVudCIsIm5vdCIsInByb3AiLCJyZWFkeSIsInRpbWVvdXQiLCJhamF4U3RhcnQiLCJhZGRDbGFzcyIs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LmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBhZGRfZmllbGRfbWFwcGluZ19yb3coKSB7XG5cdFx0JCggJyNhZGQtZmllbGQtbWFwcGluZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZV9vYmplY3QgPSAkKCAnI3NhbGVzZm9yY2Vfb2JqZWN0JyApLnZhbCgpO1xuXHRcdFx0dmFyIHdvcmRwcmVzc19vYmplY3QgPSAkKCAnI3dvcmRwcmVzc19vYmplY3QnICkudmFsKCk7XG5cdFx0XHR2YXIgcm93X2tleSA9IE1hdGguZmxvb3IoIERhdGUubm93KCkgLyAxMDAwICk7XG5cdFx0XHQkKCB0aGlzICkudGV4dCggJ0FkZCBhbm90aGVyIGZpZWxkIG1hcHBpbmcnICk7XG5cdFx0XHRpZiAoICcnICE9PSB3b3JkcHJlc3Nfb2JqZWN0ICYmICcnICE9PSBzYWxlc2ZvcmNlX29iamVjdCApIHtcblx0XHRcdFx0ZmllbGRtYXBfZmllbGRzKCB3b3JkcHJlc3Nfb2JqZWN0LCBzYWxlc2ZvcmNlX29iamVjdCwgcm93X2tleSApO1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkuZmluZCggJy5taXNzaW5nLW9iamVjdCcgKS5yZW1vdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5wcmVwZW5kKCAnPGRpdiBjbGFzcz1cImVycm9yIG1pc3Npbmctb2JqZWN0XCI+PHNwYW4+WW91IGhhdmUgdG8gcGljayBhIFdvcmRQcmVzcyBvYmplY3QgYW5kIGEgU2FsZXNmb3JjZSBvYmplY3QgdG8gYWRkIGZpZWxkIG1hcHBpbmcuPC9zcGFuPjwvZGl2PicgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGNsZWFyX3Nmd3BfY2FjaGVfbGluaygpIHtcblx0XHQkKCAnI2NsZWFyLXNmd3AtY2FjaGUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdCdhY3Rpb24nOiAnY2xlYXJfc2Z3cF9jYWNoZSdcblx0XHRcdH07XG5cdFx0XHR2YXIgdGhhdCA9ICQoIHRoaXMgKTtcblx0XHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgJiYgdHJ1ZSA9PT0gcmVzcG9uc2UuZGF0YS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHRoYXQucGFyZW50KCkuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuZmFkZUluKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmllbGRtYXBfZmllbGRzKCB3b3JkcHJlc3Nfb2JqZWN0LCBzYWxlc2ZvcmNlX29iamVjdCwgcm93X2tleSApIHtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdCdhY3Rpb24nOiAnZ2V0X3dwX3NmX29iamVjdF9maWVsZHMnLFxuXHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3Nfb2JqZWN0LFxuXHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0Jzogc2FsZXNmb3JjZV9vYmplY3Rcblx0XHR9O1xuXHRcdCQucG9zdCggYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXG5cdFx0XHR2YXIgd29yZHByZXNzID0gJyc7XG5cdFx0XHR2YXIgc2FsZXNmb3JjZSA9ICcnO1xuXHRcdFx0dmFyIG1hcmt1cCA9ICcnO1xuXG5cdFx0XHR3b3JkcHJlc3MgKz0gJzxzZWxlY3QgbmFtZT1cIndvcmRwcmVzc19maWVsZFsnICsgcm93X2tleSArICddXCIgaWQ9XCJ3b3JkcHJlc3NfZmllbGQtJyArIHJvd19rZXkgKyAnXCI+J1xuXHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgV29yZFByZXNzIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLndvcmRwcmVzcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0d29yZHByZXNzICs9ICc8b3B0aW9uIHZhbHVlPVwiJyArIHZhbHVlLmtleSArICdcIj4nICsgdmFsdWUua2V5ICsgJzwvb3B0aW9uPic7XG5cdFx0XHR9KTtcblx0XHRcdHdvcmRwcmVzcyArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0c2FsZXNmb3JjZSArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9maWVsZFsnICsgcm93X2tleSArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX2ZpZWxkLScgKyByb3dfa2V5ICsgJ1wiPidcblx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBTYWxlc2ZvcmNlIGZpZWxkIC08L29wdGlvbj4nO1xuXHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnNhbGVzZm9yY2UsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdHNhbGVzZm9yY2UgKz0gJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUubmFtZSArICdcIj4nICsgdmFsdWUubGFiZWwgKyAnPC9vcHRpb24+Jztcblx0XHRcdH0pO1xuXHRcdFx0c2FsZXNmb3JjZSArPSAnPC9zZWxlY3Q+JztcblxuXHRcdFx0bWFya3VwID0gJzx0cj48dGQgY2xhc3M9XCJjb2x1bW4td29yZHByZXNzX2ZpZWxkXCI+JyArIHdvcmRwcmVzcyArICc8L3RkPjx0ZCBjbGFzcz1cImNvbHVtbi1zYWxlc2ZvcmNlX2ZpZWxkXCI+JyArIHNhbGVzZm9yY2UgKyAnPC90ZD48dGQgY2xhc3M9XCJjb2x1bW4taXNfcHJlbWF0Y2hcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImlzX3ByZW1hdGNoWycgKyByb3dfa2V5ICsgJ11cIiBpZD1cImlzX3ByZW1hdGNoLScgKyByb3dfa2V5ICsgJ1wiIHZhbHVlPVwiMVwiIC8+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2tleVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfa2V5WycgKyByb3dfa2V5ICsgJ11cIiBpZD1cImlzX2tleS0nICsgcm93X2tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWRpcmVjdGlvblwiPjxkaXYgY2xhc3M9XCJyYWRpb3NcIj48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic2Zfd3BcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dfa2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93X2tleSArICctc2Ytd3BcIj4gIFNhbGVzZm9yY2UgdG8gV29yZFByZXNzPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwid3Bfc2ZcIiBuYW1lPVwiZGlyZWN0aW9uWycgKyByb3dfa2V5ICsgJ11cIiBpZD1cImRpcmVjdGlvbi0nICsgcm93X2tleSArICctd3Atc2ZcIj4gIFdvcmRQcmVzcyB0byBTYWxlc2ZvcmNlPC9sYWJlbD48bGFiZWw+PGlucHV0IHR5cGU9XCJyYWRpb1wiIHZhbHVlPVwic3luY1wiIG5hbWU9XCJkaXJlY3Rpb25bJyArIHJvd19rZXkgKyAnXVwiIGlkPVwiZGlyZWN0aW9uLScgKyByb3dfa2V5ICsgJy1zeW5jXCIgY2hlY2tlZD4gIFN5bmM8L2xhYmVsPjwvZGl2PjwvdGQ+PHRkIGNsYXNzPVwiY29sdW1uLWlzX2RlbGV0ZVwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwiaXNfZGVsZXRlWycgKyByb3dfa2V5ICsgJ11cIiBpZD1cImlzX2RlbGV0ZS0nICsgcm93X2tleSArICdcIiB2YWx1ZT1cIjFcIiAvPjwvdGQ+PC90cj4nO1xuXHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keScgKS5hcHBlbmQoIG1hcmt1cCApO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRmdW5jdGlvbiBwdXNoX2FuZF9wdWxsX29iamVjdHMoKSB7XG5cdFx0JCggJy5zYWxlc2ZvcmNlX3VzZXJfYWpheF9tZXNzYWdlJyApLmhpZGUoKTtcblx0XHRpZiAoIDAgPCAkKCAnI3dvcmRwcmVzc19vYmplY3RfYWpheCcgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1c2hfdG9fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgd29yZHByZXNzX29iamVjdCA9ICQoICcjd29yZHByZXNzX29iamVjdF9hamF4JyApLnZhbCgpO1xuXHRcdFx0XHR2YXIgd29yZHByZXNzX2lkID0gJCggJyN3b3JkcHJlc3NfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbic6ICdwdXNoX3RvX3NhbGVzZm9yY2UnLFxuXHRcdFx0XHRcdCd3b3JkcHJlc3Nfb2JqZWN0Jzogd29yZHByZXNzX29iamVjdCxcblx0XHRcdFx0XHQnd29yZHByZXNzX2lkJzogd29yZHByZXNzX2lkXG5cdFx0XHRcdH1cblx0XHRcdFx0JC5wb3N0KCBhamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0dXBkYXRlX3NhbGVzZm9yY2VfdXNlcl9zdW1tYXJ5KCk7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfdXNlcl9hamF4X21lc3NhZ2UnICkud2lkdGgoICQoICcubWFwcGVkLXNhbGVzZm9yY2UtdXNlcicgKS53aWR0aCgpIC0gMjcgKTtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVzaGVkIHRvIFNhbGVzZm9yY2UuPC9wPicgKS5mYWRlSW4oKS5kZWxheSggNDAwMCApLmZhZGVPdXQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0JCggJy5wdWxsX2Zyb21fc2FsZXNmb3JjZV9idXR0b24nICkub24oICdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNhbGVzZm9yY2VfaWQgPSAkKCAnI3NhbGVzZm9yY2VfaWRfYWpheCcgKS52YWwoKTtcblx0XHRcdHZhciB3b3JkcHJlc3Nfb2JqZWN0ID0gJCggJyN3b3JkcHJlc3Nfb2JqZWN0X2FqYXgnICkudmFsKCk7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0J2FjdGlvbic6ICdwdWxsX2Zyb21fc2FsZXNmb3JjZScsXG5cdFx0XHRcdCdzYWxlc2ZvcmNlX2lkJzogc2FsZXNmb3JjZV9pZCxcblx0XHRcdFx0J3dvcmRwcmVzc19vYmplY3QnOiB3b3JkcHJlc3Nfb2JqZWN0XG5cdFx0XHR9XG5cdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdHVwZGF0ZV9zYWxlc2ZvcmNlX3VzZXJfc3VtbWFyeSgpO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS53aWR0aCggJCggJy5tYXBwZWQtc2FsZXNmb3JjZS11c2VyJyApLndpZHRoKCkgLSAyNyApO1xuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV91c2VyX2FqYXhfbWVzc2FnZScgKS5odG1sKCAnPHA+VGhpcyBvYmplY3QgaGFzIGJlZW4gcHVsbGVkIGZyb20gU2FsZXNmb3JjZS48L3A+JyApLmZhZGVJbigpLmRlbGF5KCA0MDAwICkuZmFkZU91dCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNhbGVzZm9yY2Vfb2JqZWN0X2ZpZWxkcygpIHtcblxuXHRcdHZhciBkZWxheSA9ICggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGltZXIgPSAwO1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBjYWxsYmFjaywgbXMgKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCAoIHRpbWVyICk7XG5cdFx0XHRcdHRpbWVyID0gc2V0VGltZW91dCggY2FsbGJhY2ssIG1zICk7XG5cdFx0XHR9O1xuXHRcdH0oKSApO1xuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQgPiAqJyApLmxlbmd0aCApIHtcblx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAwID09PSAkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCA+IConICkubGVuZ3RoICkge1xuXHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdH1cblx0XHRpZiAoIDAgPT09ICQoICcucHVsbF90cmlnZ2VyX2ZpZWxkID4gKicgKS5sZW5ndGggKSB7XG5cdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0JCggJyNzYWxlc2ZvcmNlX29iamVjdCcgKS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCBlbCApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBkZWxheV90aW1lID0gMTAwMDtcblx0XHRcdGRlbGF5KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbic6ICdnZXRfc2FsZXNmb3JjZV9vYmplY3RfZGVzY3JpcHRpb24nLFxuXHRcdFx0XHRcdCdpbmNsdWRlJzogWyAnZmllbGRzJywgJ3JlY29yZFR5cGVJbmZvcycgXSxcblx0XHRcdFx0XHQnZmllbGRfdHlwZSc6ICdkYXRldGltZScsXG5cdFx0XHRcdFx0J3NhbGVzZm9yY2Vfb2JqZWN0JzogdGhhdC52YWx1ZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblxuXHRcdFx0XHRcdHZhciByZWNvcmRfdHlwZXNfYWxsb3dlZF9tYXJrdXAgPSAnJywgcmVjb3JkX3R5cGVfZGVmYXVsdF9tYXJrdXAgPSAnJywgZGF0ZV9tYXJrdXAgPSAnJztcblxuXHRcdFx0XHRcdGlmICggMCA8ICQoIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zICkubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0cmVjb3JkX3R5cGVzX2FsbG93ZWRfbWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZFwiPkFsbG93ZWQgUmVjb3JkIFR5cGVzOjwvbGFiZWw+PGRpdiBjbGFzcz1cImNoZWNrYm94ZXNcIj4nO1xuXHRcdFx0XHRcdFx0JC5lYWNoKCByZXNwb25zZS5kYXRhLnJlY29yZFR5cGVJbmZvcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0cmVjb3JkX3R5cGVzX2FsbG93ZWRfbWFya3VwICs9ICc8bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiZm9ybS1jaGVja2JveFwiIHZhbHVlPVwiJyArIGluZGV4ICsgJ1wiIG5hbWU9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkWycgKyBpbmRleCArICddXCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlc19hbGxvd2VkLScgKyBpbmRleCArICdcIj4gJyArIHZhbHVlICsgJzwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmVjb3JkX3R5cGVzX2FsbG93ZWRfbWFya3VwICs9ICc8L2Rpdj4nO1xuXG5cblx0XHRcdFx0XHRcdHJlY29yZF90eXBlX2RlZmF1bHRfbWFya3VwICs9ICc8bGFiZWwgZm9yPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCI+RGVmYXVsdCBSZWNvcmQgVHlwZTo8L2xhYmVsPic7XG5cdFx0XHRcdFx0XHRyZWNvcmRfdHlwZV9kZWZhdWx0X21hcmt1cCArPSAnPHNlbGVjdCBuYW1lPVwic2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0XCIgaWQ9XCJzYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHRcIj48b3B0aW9uIHZhbHVlPVwiXCI+LSBTZWxlY3QgcmVjb3JkIHR5cGUgLTwvb3B0aW9uPic7XG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEucmVjb3JkVHlwZUluZm9zLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRyZWNvcmRfdHlwZV9kZWZhdWx0X21hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyBpbmRleCArICdcIj4nICsgdmFsdWUgKyAnPC9vcHRpb24+Jztcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZXNfYWxsb3dlZCcgKS5odG1sKCByZWNvcmRfdHlwZXNfYWxsb3dlZF9tYXJrdXAgKTtcblx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVfZGVmYXVsdCcgKS5odG1sKCByZWNvcmRfdHlwZV9kZWZhdWx0X21hcmt1cCApO1xuXG5cdFx0XHRcdFx0aWYgKCAwIDwgJCggcmVzcG9uc2UuZGF0YS5maWVsZHMgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRkYXRlX21hcmt1cCArPSAnPGxhYmVsIGZvcj1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPkRhdGUgZmllbGQgdG8gdHJpZ2dlciBwdWxsOjwvbGFiZWw+Jztcblx0XHRcdFx0XHRcdGRhdGVfbWFya3VwICs9ICc8c2VsZWN0IG5hbWU9XCJwdWxsX3RyaWdnZXJfZmllbGRcIiBpZD1cInB1bGxfdHJpZ2dlcl9maWVsZFwiPjxvcHRpb24gdmFsdWU9XCJcIj4tIFNlbGVjdCBkYXRlIGZpZWxkIC08L29wdGlvbj4nXG5cdFx0XHRcdFx0XHQkLmVhY2goIHJlc3BvbnNlLmRhdGEuZmllbGRzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRkYXRlX21hcmt1cCArPSAnPG9wdGlvbiB2YWx1ZT1cIicgKyB2YWx1ZS5uYW1lICsgJ1wiPicgKyB2YWx1ZS5sYWJlbCArICc8L29wdGlvbj4nO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRkYXRlX21hcmt1cCArPSAnPC9zZWxlY3Q+Jztcblx0XHRcdFx0XHRcdGRhdGVfbWFya3VwICs9ICc8cCBjbGFzcz1cImRlc2NyaXB0aW9uXCI+VGhlc2UgYXJlIGRhdGUgZmllbGRzIHRoYXQgY2FuIGNhdXNlIFdvcmRQcmVzcyB0byBwdWxsIGFuIHVwZGF0ZSBmcm9tIFNhbGVzZm9yY2UsIGFjY29yZGluZyB0byB0aGUgPGNvZGU+c2FsZXNmb3JjZV9wdWxsPC9jb2RlPiBjbGFzcy48L3A+J1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQoICcucHVsbF90cmlnZ2VyX2ZpZWxkJyApLmh0bWwoIGRhdGVfbWFya3VwICk7XG5cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRfdHlwZXNfYWxsb3dlZF9tYXJrdXAgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNhbGVzZm9yY2VfcmVjb3JkX3R5cGVzX2FsbG93ZWQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICcnICE9PSByZWNvcmRfdHlwZV9kZWZhdWx0X21hcmt1cCApIHtcblx0XHRcdFx0XHRcdCQoICcuc2FsZXNmb3JjZV9yZWNvcmRfdHlwZV9kZWZhdWx0JyApLnNob3coKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggJy5zYWxlc2ZvcmNlX3JlY29yZF90eXBlX2RlZmF1bHQnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggJycgIT09IGRhdGVfbWFya3VwICkge1xuXHRcdFx0XHRcdFx0JCggJy5wdWxsX3RyaWdnZXJfZmllbGQnICkuc2hvdygpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnLnB1bGxfdHJpZ2dlcl9maWVsZCcgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sIGRlbGF5X3RpbWUgKTtcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZV9zYWxlc2ZvcmNlX3VzZXJfc3VtbWFyeSgpIHtcblx0XHR2YXIgbWFwcGluZ19pZCA9ICQoICcjbWFwcGluZ19pZF9hamF4JyApLnZhbCgpO1xuXHRcdHZhciBkYXRhID0ge1xuXHRcdFx0J2FjdGlvbic6ICdyZWZyZXNoX21hcHBlZF9kYXRhJyxcblx0XHRcdCdtYXBwaW5nX2lkJzogbWFwcGluZ19pZFxuXHRcdH1cblx0XHQkLnBvc3QoIGFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19tZXNzYWdlJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX21lc3NhZ2UgKTtcblx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19hY3Rpb24nICkudGV4dCggcmVzcG9uc2UuZGF0YS5sYXN0X3N5bmNfYWN0aW9uICk7XG5cdFx0XHRcdCQoICd0ZC5sYXN0X3N5bmNfc3RhdHVzJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jX3N0YXR1cyApO1xuXHRcdFx0XHQkKCAndGQubGFzdF9zeW5jJyApLnRleHQoIHJlc3BvbnNlLmRhdGEubGFzdF9zeW5jICk7XG5cdFx0XHRcdGlmICggJzEnID09PSByZXNwb25zZS5kYXRhLmxhc3Rfc3luY19zdGF0dXMgKSB7XG5cdFx0XHRcdFx0JCggJ3RkLmxhc3Rfc3luY19zdGF0dXMnICkudGV4dCggJ3N1Y2Nlc3MnICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8vIGFzIHRoZSBkcnVwYWwgcGx1Z2luIGRvZXMsIHdlIG9ubHkgYWxsb3cgb25lIGZpZWxkIHRvIGJlIGEgcHJlbWF0Y2ggb3Iga2V5XG5cdCQoIGRvY3VtZW50ICkub24oICdjbGljaycsICcuY29sdW1uLWlzX3ByZW1hdGNoIGlucHV0JywgZnVuY3Rpb24oKSB7XG5cdFx0JCggJy5jb2x1bW4taXNfcHJlbWF0Y2ggaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblxuXHQkKCBkb2N1bWVudCApLm9uKCAnY2xpY2snLCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnLCBmdW5jdGlvbigpIHtcblx0XHQkKCAnLmNvbHVtbi1pc19rZXkgaW5wdXQnICkubm90KCB0aGlzICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHR9KTtcblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblxuXHRcdHZhciB0aW1lb3V0O1xuXHRcdCQoICcjd29yZHByZXNzX29iamVjdCwgI3NhbGVzZm9yY2Vfb2JqZWN0JyApLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQoIHRpbWVvdXQgKTtcblx0XHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggJ3RhYmxlLmZpZWxkcyB0Ym9keSB0cicgKS5mYWRlT3V0KCk7XG5cdFx0XHRcdCQoICd0YWJsZS5maWVsZHMgdGJvZHkgdHInICkucmVtb3ZlKCk7XG5cdFx0XHR9LCAxMDAwICk7XG5cdFx0fSk7XG5cblx0XHQvLyB0b2RvOiBuZWVkIHRvIGZpeCB0aGlzIHNvIGl0IGRvZXNuJ3QgcnVuIGFsbCB0aGUgc3Bpbm5lcnMgYXQgdGhlIHNhbWUgdGltZSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZXMgb24gdGhlIHNhbWUgcGFnZVxuXHRcdCQoIGRvY3VtZW50ICkuYWpheFN0YXJ0KCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuc3Bpbm5lcicgKS5hZGRDbGFzcyggJ2lzLWFjdGl2ZScgKTtcblx0XHR9KS5hamF4U3RvcCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnNwaW5uZXInICkucmVtb3ZlQ2xhc3MoICdpcy1hY3RpdmUnICk7XG5cdFx0fSk7XG5cdFx0c2FsZXNmb3JjZV9vYmplY3RfZmllbGRzKCk7XG5cdFx0YWRkX2ZpZWxkX21hcHBpbmdfcm93KCk7XG5cdFx0cHVzaF9hbmRfcHVsbF9vYmplY3RzKCk7XG5cdFx0Y2xlYXJfc2Z3cF9jYWNoZV9saW5rKCk7XG5cdH0pO1xuXG59KCBqUXVlcnkgKSApO1xuIl19
