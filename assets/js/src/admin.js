var $ = window.jQuery;

function salesforce_object_fields() {
	if ($('.record_types_allowed > *').length === 0) {
		$('.record_types_allowed').hide();
	}
	if ($('.record_type_default > *').length === 0) {
		$('.record_type_default').hide();
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
			record_types_allowed_markup += '<label for="record_types_allowed">Allowed Record Types:</label><div class="checkboxes">';
			$.each(response.data.recordTypeInfos, function(index, value) {
				record_types_allowed_markup += '<label><input type="checkbox" class="form-checkbox" value="' + index + '" name="record_types_allowed[' + index + ']" id="record_types_allowed-' + index + '"> ' + value + '</label>';
			});
			record_types_allowed_markup += '</div>';

			record_type_default_markup += '<label for="record_type_default">Default Record Type:</label>';
			record_type_default_markup += '<select name="record_type_default" id="record_type_default"><option value="">- Select record type -</option>';
			$.each(response.data.recordTypeInfos, function(index, value) {
				record_type_default_markup += '<option value="' + index + '">' + value + '</option>';
			});

			date_markup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
			date_markup += '<select name="pull_trigger_field" id="pull_trigger_field"><option value="">- Select date field -</option>'
			$.each(response.data.fields, function(index, value) {
				date_markup += '<option value="' + value.name + '">' + value.label + '</option>';
			});
			date_markup += '</select>';
			date_markup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>'
			$('.record_types_allowed').html(record_types_allowed_markup);
			$('.record_type_default').html(record_type_default_markup);
			$('.pull_trigger_field').html(date_markup);
			if (record_types_allowed_markup !== '') {
				$('.record_types_allowed').show();
			}
			if (record_type_default_markup !== '') {
				$('.record_type_default').show();	
			}
			$('.pull_trigger_field').show();
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
	})
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

		var markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_prematch"><input type="checkbox" name="is_prematch[' + row_count + ']" id="is_prematch-' + row_count + '" value="1" /><td class="column-is_key"><input type="checkbox" name="is_key[' + row_count + ']" id="is_key-' + row_count + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[0]" id="direction-' + row_count + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[0]" id="direction-' + row_count + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sf_wp" name="direction' + row_count + '" id="direction-' + row_count + '-sync">  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + row_count + ']" id="is_delete-' + row_count + '" value="1" /></td></tr>';
		$('table.fields tbody').append(markup);

	});
}

$(document).ready(function() {

	$('#wordpress_object, #salesforce_object').on('change', function() {
		$('table.fields tbody tr').remove();
	})

	// todo: need to fix this so it doesn't run all the spinners at the same time when there are multiples on the same page
	$(document).ajaxStart(function(){
		$('.spinner').addClass('is-active');
	}).ajaxStop(function() {
		$('.spinner').removeClass('is-active');
	});
	salesforce_object_fields();
	add_field_mapping_row();
});