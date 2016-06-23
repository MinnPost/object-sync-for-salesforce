var $ = window.jQuery;

function salesforce_date_fields() {
	$('#salesforce_object').on('change', function() {
		var data = {
			'action' : 'get_salesforce_object_description',
			//'type' : 'datetime',
			'salesforce_object' : this.value
		}
		$.post(ajaxurl, data, function(response) {
			console.dir(response);
		});
	});
}

$(document).ready(function() {
	salesforce_date_fields();
});