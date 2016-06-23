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

$(document).ready(function() {
	$(document)
		.ajaxStart(function(){
		    $('.spinner').addClass('is-active');
		})
		.ajaxStop(function(){
		    $('.spinner').removeClass('is-active');
		});
	salesforce_date_fields();
});