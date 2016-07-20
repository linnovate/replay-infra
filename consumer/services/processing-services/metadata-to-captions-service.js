var fs = require('fs');
var start, end;
var dif, timeLine, timeDiff;

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

	var baseDate = new Date(res[0]._source.timestamp);
	end = getFormatedTime(new Date(0));
	res.forEach(function(r, i) {
		start = end;
		if (i < (res.length - 1)) {
			console.log(res[i + 1]._source.timestamp, r._source.timestamp);
			dif = new Date(getTimeDiff(new Date(res[i + 1]._source.timestamp), baseDate));
			end = getFormatedTime(dif);
		} else {
			dif.setSeconds(dif.getSeconds() + 1);
			end = getFormatedTime(dif);
		}
		timeLine = start + '-->' + end;
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

	function getTimeDiff(time, baseDate) {
		if (time === null || baseDate === null) {
			console.log('error : ', 'time is missing');
			return null;
		}
		timeDiff = Math.abs(time.getTime() - baseDate.getTime());
		return timeDiff;
	}

	function getFormatedTime(time) {
		return (time.getUTCMinutes() + ':' + time.getUTCSeconds() +
			'.' + time.getUTCMilliseconds());
	}
}
