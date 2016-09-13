var sources;
$(function() {
	$.ajax({
		type: 'POST',
		data: '{"user":"dolev"}',
		contentType: 'application/json',
        url: '/sources',
        success: function(data) {

	        		console.log(data);
	        		sources = jQuery.parseJSON(data);

				}
			});

});

$('#custom-table').datagrid({
  inputs: {
      select: {
        el : $('<select class="form-control datagrid-input">'),
        onShow:function(cell) {
          // Set the options
          if (!$(this).find('option').length) {
            $(this).append($('<option disabled="disabled">בחר מקור:</option>'))
            for(var i in sources)
			{
				console.log(sources[i].name);
	     		$(this).append($('<option value="option-'+ i +'">'+ sources[i].name +'</option>'));
			}
          }
          if(cell != undefined)
          {
          		/*var inputPadding = parseInt(cell.data('padding'))-1
          		$(this).css('padding', inputPadding+'px')
          		$(this).css('width', '100%')
          		$(this).css('height', '100%')
          		$(this).css('top', cell.offset().top.toString+'px')
          		$(this).css('left', cell.offset().left.toString+'px')
				*/
          		$(this).val(cell.data('value'))
          }

        },
        onChange:function(cell) {
          cell.data('value', $(this).val())
          cell.text($(this).find('option[value='+$(this).val()+']').text())
          		/*cell.css('padding', '8px')
          		$(this).css('padding', '8px')
          		$(this).css('width', '100%')
          		$(this).css('height', '100%')
					*/
          		$(this).val(cell.data('value'))
        },
        isChanged:function(cell) {
          return $(this).val() != cell.data('value')
        }
      },
      money: {
        el : $('<input type="date" class="form-control datagrid-input">'),
        onShow:function(cell) {
        	if(cell != undefined)
        	{
        		//var inputPadding = parseInt(cell.data('padding'))-1
          		//$(this).css('padding', inputPadding+'px')
          		$(this).css('width', '100%')
          		$(this).css('height', '100%')
          		$(this).css('top', cell.offset().top.toString+'px')
          		$(this).css('left', cell.offset().left.toString+'px')

          		$(this).val(cell.data('value'))
        	}
        },
        onChange:function(cell) {
          cell.data('value', $(this).val())
          cell.text('$'+$(this).val())
        },
        isChanged:function(cell) {
          return $(this).val() != cell.data('value')
        }
      }
    }
  })
;

$("#data tr").click(function() {
    var selected = $(this).hasClass("highlight");
    $("#data tr").removeClass("highlight");
    if(!selected)
            $(this).addClass("highlight");
});
