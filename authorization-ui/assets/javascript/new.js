$(function() {
	$.ajax({
		type: 'POST',
		data: '',
		contentType: 'application/json',
        url: '/sources',
        success: function(data) {
	        sources = jQuery.parseJSON(data);
	        for(var i in sources)
			{
				console.log(sources[i].name);
	     		$('#sources-list').append($('<option value="'+ sources[i].name+'"></option>'));
			}
		}
	});
});
