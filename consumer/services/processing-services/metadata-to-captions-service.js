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

function addSubtitle(mdata) {
	var path = process.env.STORAGE_PATH + '/captions/';
	var videoId;
	if (mdata === null) {
		console.log('no Data Found ');
		return;
	}
	videoId = mdata[0].videoId;

	var baseDate = new Date(mdata[0].timestamp);
	end = getFormatedTime(new Date(0));
	mdata.forEach(function(r, i) {
		start = end;
		if (i < (mdata.length - 1)) {
			dif = new Date(getTimeDiff(new Date(mdata[i + 1].timestamp), baseDate));
			end = getFormatedTime(dif);
		} else {
			dif.setSeconds(dif.getSeconds() + 1);
			end = getFormatedTime(dif);
		}
		timeLine = start + '-->' + end;
		fs.appendFile(path + videoId + '.vtt', timeLine + '\n' + JSON.stringify(r) + '\n', function(err) {
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
