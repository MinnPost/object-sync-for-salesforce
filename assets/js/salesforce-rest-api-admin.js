var $ = window.jQuery;

function salesforce_date_fields() {
	$('.salesforce_datefield').hide();
	$('#salesforce_object').on('change', function() {
		var data = {
			'action' : 'get_salesforce_object_description',
			'type' : 'datetime',
			'salesforce_object' : this.value
		}
		$.post(ajaxurl, data, function(response) {
			var markup = '';
			markup += '<label for="salesforce_datefield">Date field to trigger pull:</label>';
			markup += '<select name="salesforce_datefield" id="salesforce_datefield">'
			$.each(response.data, function(index, value) {
				markup += '<option value="' + value.label + '">' + value.label + '</option>';
			});
			markup += '</select>';
			markup += '<p class="description">These are date fields that can cause WordPress to pull an update from Salesforce, according to the <code>salesforce_pull</code> class.</p>'
			$('.salesforce_datefield').html(markup);
			$('.salesforce_datefield').show();
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