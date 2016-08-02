var $ = window.jQuery;

function salesforce_date_fields() {
	if ($('.pull_trigger_field > *').length === 0) {
		$('.pull_trigger_field').hide();
	}
	$('#salesforce_object').on('change', function() {
		var data = {
			'action' : 'get_salesforce_object_description',
			'type' : 'datetime',
			'salesforce_object' : this.value
		}
		$.post(ajaxurl, data, function(response) {
			var markup = '';
			markup += '<label for="pull_trigger_field">Date field to trigger pull:</label>';
			markup += '<select name="pull_trigger_field" id="pull_trigger_field">'
			$.each(response.data, function(index, value) {
				markup += '<option value="' + value.label + '">' + value.label + '</option>';
			});
			markup += '</select>';
			markup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>'
			$('.pull_trigger_field').html(markup);
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
			salesforce += '<option value="' + value.label + '">' + value.label + '</option>';
		});
		salesforce += '</select>';

		var markup = '<tr><td class="column-wordpress_field">' + wordpress + '</td><td class="column-salesforce_field">' + salesforce + '</td><td class="column-is_key"><input type="checkbox" name="is_key[' + row_count + ']" id="is_key-' + row_count + '" value="1" /></td><td class="column-direction"><div class="radios"><label><input type="radio" value="sf_wp" name="direction[0]" id="direction-' + row_count + '-sf-wp">  Salesforce to WordPress</label><label><input type="radio" value="wp_sf" name="direction[0]" id="direction-' + row_count + '-wp-sf">  WordPress to Salesforce</label><label><input type="radio" value="sf_wp" name="direction' + row_count + '" id="direction-' + row_count + '-sync">  Sync</label></div></td><td class="column-is_delete"><input type="checkbox" name="is_delete[' + row_count + ']" id="is_delete-' + row_count + '" value="1" /></td></tr>';
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
	salesforce_date_fields();
	add_field_mapping_row();
});