var fs = require('fs'),
	path = require('path');

var JobsService = require('replay-jobs-service'),
	Promise = require('bluebird');

var start, end;
var _transactionId;
var _jobStatusTag = 'created-captions-from-metadata';

module.exports.start = function(params, error, done) {
	console.log('MetadataToCaptions service started.');

	if (!validateInput(params)) {
		console.log('Some vital parameters are missing.');
		return error();
	}

	// Make sure we haven't done this job already
	JobsService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				return done();
			}

			return tryCreateCaptions(params.metadatas);
		})
		.then(done)
		.catch(function(err) {
			if (err) {
				console.log(err);
				error();
			}
		});
};

function validateInput(params) {
	var transactionId = params.transactionId;

	// validate params
	if (!transactionId) {
		return false;
	}

	return true;
}

function tryCreateCaptions(metadatas) {
	console.log('=============================================');
	console.log(JSON.stringify(metadatas, null, 2));
	console.log('=============================================');

	if (metadatas.metadatas && metadatas.metadatas.length > 0) {
		return createCaptions(metadatas);
	}
	console.log('No metadatas receieved.');
	return Promise.resolve();
}

function createCaptions(metadatas) {
	return new Promise(function(resolve, reject) {
		var captionsPath = path.join(process.env.STORAGE_PATH, '/captions');
		var videoId;
		videoId = metadatas[0].videoId;
		var baseDate = new Date(metadatas[0].timestamp);
		metadatas.forEach(function(r) {
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
			fs.appendFile(path.join(captionsPath, videoId + '.vtt'), timeLine + '\n', function(err) {
				if (err) {
					return reject(err);
				}
			});
			fs.appendFile(path.join(captionsPath, videoId + '.vtt'), JSON.stringify(r) + '\n', function(err) {
				if (err) {
					return reject(err);
				}
			});
		});
		console.log('The file was saved!');
		resolve();
	});
}
