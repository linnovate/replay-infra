
function updateSources() {
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
};

$('#myModal').on('show', function() {
    var tit = $('.confirm-delete').data('title');

    $('#myModal .modal-body p').html("האם אתה בטוח שברצונך למחוק את המידור לסרט " + '<b>' + tit +'</b>' + ' ?');
    var id = $(this).data('id'),
    removeBtn = $(this).find('.danger');
})

$('#myAddModal').on('show', function() {
	if($('#sources-list').length<2)
	{
		updateSources();
	}
    var id = $(this).data('id'),
    removeBtn = $(this).find('.danger');
})


$('#myEditModal').on('show', function() {
	if($('#sources-list').length<2)
	{
		updateSources();
	}
    var tit = $('.confirm-edit').data('title');

    //$('#myModal .modal-body p').html("האם אתה בטוח שברצונך למחוק את המידור לסרט " + '<b>' + tit +'</b>' + ' ?');
    var id = $(this).data('id');
    var  formData = "id=" + id;
    $.ajax({
    url : "/midur/findone",
    type: "POST",
    data : formData,
    async: false,
    success: function(midurJson)
    {
    	var midur = JSON.parse(midurJson);
    	removeBtn = $(this).find('.danger');
    	$('#edit-name').val(midur['name']);
    	$('#edit-source').val(midur['source']);
    	$('#edit-start').val(midur['start_time'].substring(0,19));
    	$('#edit-end').val(midur['end_time'].substring(0,19));
    	$('#edit-dest').val(midur['destination']);
    },
    error: function(){
    	alert('התרחשה שגיאה')
    }
	});
});

$('.confirm-edit').on('click', function(e) {
    e.preventDefault();

    var id = $(this).data('id');
    $('#myEditModal').data('id', id).modal('show');
});

$('#addLabel').on('click', function(e) {
    e.preventDefault();

    //var id = $(this).data('id');
    $('#myAddModal').data('id', 'new').modal('show');
});

$('.confirm-delete').on('click', function(e) {
    e.preventDefault();

    var id = $(this).data('id');
    $('#myModal').data('id', id).modal('show');
});

$('#btnYes').click(function() {
    // handle deletion here
    var id = $('#myModal').data('id');
    var  formData = "id=" + id;
    $.ajax({
    url : "/midur/destroy",
    type: "POST",
    data : formData,
    async: false,
    success: function(data)
    {
    	console.log('work')
        if(data == "success")
        {
        	$('[data-id='+id+']').parents('tr').remove();
    		$('#myModal').modal('hide');
        }
        else
       	{
       		alert('התרחשה שגיאה בעת המחיקה')
       	}
    },
    error: function(){
    	alert('התרחשה שגיאה בעת המחיקה')
    }
});
});

$('#btnYesEdit').click(function() {
    // handle deletion here
    var id = $('#myEditModal').data('id');
    var  formData = "id=" + id +
    	'&name=' + $('#edit-name').val() +
    	'&source=' + $('#edit-source').val() +
    	'&start_time=' + $('#edit-start').val() +
    	'&end_time=' + $('#edit-end').val() +
    	'&destination=' + $('#edit-dest').val();
    $.ajax({
    url : "/midur/update",
    type: "POST",
    data : formData,
    async: false,
    success: function(data)
    {
    	console.log('work')
        if(data == "success")
        {
    		//$('#myModal').modal('hide');
    		window.location.reload(true);
        }
        else
       	{
       		$('#myModal').modal('hide');
       		alert('התרחשה שגיאה בעת העדכון')
       	}
    },
    error: function(){
    	$('#myModal').modal('hide');
    	alert('התרחשה שגיאה בעת העדכון')
    }
});
});

$('#btnYesAdd').click(function() {
    // handle deletion here
    var id = $('#myEditModal').data('id');
    var  formData =
    	'name=' + $('#add-name').val() +
    	'&source=' + $('#add-source').val() +
    	'&start_time=' + $('#add-start').val() +
    	'&end_time=' + $('#add-end').val() +
    	'&destination=' + $('#add-dest').val();
    $.ajax({
    url : "/midur/create",
    type: "POST",
    data : formData,
    async: false,
    success: function(data)
    {
    	console.log('work')
        if(data == "success")
        {
    		//$('#myModal').modal('hide');
    		window.location.reload(true);
        }
        else
       	{
       		$('#myModal').modal('hide');
       		alert('התרחשה שגיה בעת יצירת מידור חדש')
       	}
    },
    error: function(){
    	$('#myModal').modal('hide');
    	alert('התרחשה שגיה בעת יצירת מידור חדש')
    }
});
});
