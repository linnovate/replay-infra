/* global ElasticSearchService */
var fs = require('fs');

module.exports.addSubtitle = function (index, type, videoId, sort, callback) {
	console.log('MetadataToCaptions service started.');
	ElasticSearchService.getDataByName(index, type, videoId, sort, function(res) {
		var baseDate = null;
		res.forEach(function(r) {
			if (baseDate === null) {
				baseDate = new Date(r._source.timestamp);
			}
			var d = new Date(r._source.timestamp);

			var timeDiff = Math.abs(d.getTime() - baseDate.getTime());

			d = new Date(timeDiff);
			var start = d.getUTCMinutes() + ':' + d.getUTCSeconds() +
			'.' + d.getUTCMilliseconds();
			d.setSeconds(d.getSeconds() + 1);
			var end = d.getUTCMinutes() + ':' + d.getUTCSeconds() +
			'.' + d.getUTCMilliseconds();
			var timeLine = start + '-->' + end;
			fs.writeFile(videoId + '.vtt', timeLine, function(err) {
				if (err) {
					return console.log(err);
				}
				fs.writeFile(videoId + '.vtt', r, function(err) {
					if (err) {
						return console.log(err);
					}
				});
			});
		});
		console.log('The file was saved!');
	});
};
