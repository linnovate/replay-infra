/* global ElasticSearchService */
var fs = require('fs');
var start, end;
module.exports.addSubtitle = function (index, type, videoId, sort, callback) {
	console.log('MetadataToCaptions service started.');
	ElasticSearchService.getDataByName(index, type, videoId, sort, function(res) {
		if (res === null) {
			console.log('no Data Found for ', videoId);
			return;
		}
		var baseDate = new Date(res[0]._source.timestamp);
		res.forEach(function(r) {
			if (baseDate === null) {
				baseDate = new Date(r._source.timestamp);
			}
			var d = new Date(r._source.timestamp);
			var timeDiff = Math.abs(d.getTime() - baseDate.getTime());
			d = new Date(timeDiff);
			start = d.getUTCMinutes() + ':' + d.getUTCSeconds() +
			'.' + d.getUTCMilliseconds();
			d.setSeconds(d.getSeconds() + 1);
			end = d.getUTCMinutes() + ':' + d.getUTCSeconds() +
			'.' + d.getUTCMilliseconds();
			var timeLine = start + '-->' + end;
			fs.appendFile(videoId + '.vtt', timeLine + '\n', function(err) {
				if (err) {
					return console.log(err);
				}
			});
			fs.appendFile(videoId + '.vtt', JSON.stringify(r) + '\n', function(err) {
				if (err) {
					return console.log(err);
				}
			});
		});
		console.log('The file was saved!');
	});
};
