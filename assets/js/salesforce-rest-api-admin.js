var $ = window.jQuery;

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
	$('#salesforce_object').on('change', function() {
		var data = {
			'action' : 'get_salesforce_object_description',
			'include' : ['fields', 'recordTypeInfos'],
			'field_type' : 'datetime',
			'salesforce_object' : this.value
		}
		$.post(ajaxurl, data, function(response) {

			var record_types_allowed_markup = '', record_type_default_markup = '', date_markup = '';

			if ($(response.data.recordTypeInfos).length > 0) {
				record_types_allowed_markup += '<label for="salesforce_record_types_allowed">Allowed Record Types:</label><div class="checkboxes">';
				$.each(response.data.recordTypeInfos, function(index, value) {
					record_types_allowed_markup += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="salesforce_record_types_allowed[' + index + ']" id="salesforce_record_types_allowed-' + index + '"> ' + value + '</label>';
				});
				record_types_allowed_markup += '</div>';


				record_type_default_markup += '<label for="salesforce_record_type_default">Default Record Type:</label>';
				record_type_default_markup += '<select name="salesforce_record_type_default" id="salesforce_record_type_default"><option value="">- Select record type -</option>';
				$.each(response.data.recordTypeInfos, function(index, value) {
					record_type_default_markup += '<option value="' + index + '">' + value + '</option>';
				});
			}

			$('.salesforce_record_types_allowed').html(record_types_allowed_markup);
			$('.salesforce_record_type_default').html(record_type_default_markup);

			if ($(response.data.fields).length > 0) {
				date_markup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
				date_markup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>'
				$.each(response.data.fields, function(index, value) {
					date_markup += '<option value="' + value.name + '">' + value.label + '</option>';
				});
				date_markup += '</select>';
				date_markup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>'
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
	});
}

function add_field_mapping_row() {
	$('#add-field-mapping').click(function() {
		$(this).text('Add another field mapping');
		var salesforce_object = $('#salesforce_object').val();
		var wordpress_object = $('#wordpress_object').val();
		if (wordpress_object !== '' && salesforce_object !== '') {
			var row_count = $('table.fields tbody tr').length;				
			fieldmap_fields(wordpress_object, salesforce_object, row_count);
			$(this).parent().find('.missing-object').remove();
		} else {
			$(this).parent().append('<span class="missing-object">You have to pick a WordPress object and a Salesforce object to add field mapping.');
		}
		return false;
	});
}


function fieldmap_fields(wordpress_object, salesforce_object, row_count) {
	var data = {
		'action' : 'get_wp_sf_object_fields',
		'wordpress_object' : wordpress_object,
		'salesforce_object' : salesforce_object
	}
	$.post(ajaxurl, data, function(response) {

		var wordpress = '';
		wordpress += '<select name="wordpress_field[' + row_count + ']" id="wordpress_field-' + row_count + '">'
		wordpress += '<option value="">- Select WordPress field -</option>';
		$.each(response.data.wordpress, function(index, value) {
			wordpress += '<option value="' + value.key + '">' + value.key + '</option>';
		});
		wordpress += '</select>';

		var salesforce = '';
		salesforce += '<select name="salesforce_field[' + row_count + ']" id="salesforce_field-' + row_count + '">'
		salesforce += '<option value="">- Select Salesforce field -</option>';
		$.each(response.data.salesforce, function(index, value) {
			salesforce += '<option value="' + value.name + '">' + value.label + '</option>';
		});
		salesforce += '</select>';

		var markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + row_count + ']" id="is_prematch-' + row_count + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + row_count + ']" id="is_key-' + row_count + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[' + row_count + ']" id="direction-' + row_count + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[' + row_count + ']" id="direction-' + row_count + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sync" name="direction[' + row_count + ']" id="direction-' + row_count + '-sync" checked>  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + row_count + ']" id="is_delete-' + row_count + '" value="1" /></td></tr>';
		$('table.fields tbody').append(markup);

	});
}

function push_and_pull_objects() {
	$('.push_to_salesforce_button').on('click', function() {
		var wordpress_object = $('#wordpress_object_ajax').val();
		var wordpress_id = $('#wordpress_id_ajax').val();
		var data = {
			'action' : 'push_to_salesforce',
			'wordpress_object' : wordpress_object,
			'wordpress_id' : wordpress_id
		}
		$.post(ajaxurl, data, function(response) {
			if (response.success === true) {
				$('.salesforce_user_ajax_message').text('This object has been pushed to Salesforce').delay(2000).fadeOut();
				update_salesforce_user_summary();
			}
		});
		return false;
	});
	$('.pull_from_salesforce_button').on('click', function() {
		var salesforce_id = $('#salesforce_id_ajax').val();
		var wordpress_object = $('#wordpress_object_ajax').val();
		var data = {
			'action' : 'pull_from_salesforce',
			'salesforce_id' : salesforce_id,
			'wordpress_object' : wordpress_object
		}
		$.post(ajaxurl, data, function(response) {
			if (response.success === true) {
				$('.salesforce_user_ajax_message').text('This object has been pulled from Salesforce').delay(2000).fadeOut();
				update_salesforce_user_summary();
			}
		});
		return false;
	});
}

function update_salesforce_user_summary() {
	var mapping_id = $('#mapping_id_ajax').val();
	var data = {
		'action' : 'refresh_mapped_data',
		'mapping_id' : mapping_id
	}
	$.post(ajaxurl, data, function(response) {
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

// as the drupal plugin does, we only allow one field to be a prematch or key
$(document).on('click', '.column-is_prematch input', function() {
	$('.column-is_prematch input').not(this).prop('checked', false);  
});

$(document).on('click', '.column-is_key input', function() {
	$('.column-is_key input').not(this).prop('checked', false);  
});

$(document).ready(function() {

	$('#wordpress_object, #salesforce_object').on('change', function() {
		$('table.fields tbody tr').remove();
	});

	// todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page
	$(document).ajaxStart(function(){
		$('.spinner').addClass('is-active');
	}).ajaxStop(function() {
		$('.spinner').removeClass('is-active');
	});
	salesforce_object_fields();
	add_field_mapping_row();
	push_and_pull_objects();
});