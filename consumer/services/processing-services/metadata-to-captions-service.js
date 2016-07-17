var fs = require('fs');
var start, end;

module.exports.start = function(params) {
	console.log('MetadataToCaptions service started.');

	console.log('=============================================');
	console.log(JSON.stringify(params, null, 2));
	console.log('=============================================');
	addSubtitle(params);
};

function addSubtitle(res) {
	var path = process.env.STORAGE_PATH + '/captions/';
	var videoId;
	if (res === null) {
		console.log('no Data Found ');
		return;
	}
	videoId = res[0].videoId;
	var baseDate = new Date(res[0].timestamp);
	res.forEach(function(r) {
		if (baseDate === null) {
			baseDate = new Date(r.timestamp);
		}
		var d = new Date(r.timestamp);
		var timeDiff = Math.abs(d.getTime() - baseDate.getTime());
		d = new Date(timeDiff);
		start = d.getUTCMinutes() + ':' + d.getUTCSeconds() + '.' + d.getUTCMilliseconds();
		d.setSeconds(d.getSeconds() + 1);
		end = d.getUTCMinutes() + ':' + d.getUTCSeconds() + '.' + d.getUTCMilliseconds();
		var timeLine = start + '-->' + end;
		fs.appendFile(path + videoId + '.vtt', timeLine + '\n', function(err) {
			if (err) {
				return console.log(err);
			}
		});
		fs.appendFile(path + videoId + '.vtt', JSON.stringify(r) + '\n', function(err) {
			if (err) {
				return console.log(err);
			}
		});
	});
	console.log('The file was saved!');
}
