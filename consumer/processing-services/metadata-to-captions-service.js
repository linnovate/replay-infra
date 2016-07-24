var fs = require('fs'),
	path = require('path');

var JobsService = require('replay-jobs-service'),
	Promise = require('bluebird');

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
				return Promise.resolve();
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

	if (metadatas && metadatas.length > 0) {
		return createCaptions(metadatas);
	}
	console.log('No metadatas receieved.');
	return Promise.resolve();
}

function createCaptions(metadatas) {
	return new Promise(function(resolve, reject) {
		var start, end;
		var dif, timeLine;

		var captionsPath = path.join(process.env.STORAGE_PATH, '/captions/');
		var videoId;
		videoId = metadatas[0].videoId;

		var baseDate = new Date(metadatas[0].timestamp);
		end = getFormatedTime(new Date(0));
		metadatas.forEach(function(r, i) {
			start = end;
			if (i < (metadatas.length - 1)) {
				dif = new Date(getTimeDiff(new Date(metadatas[i + 1].timestamp), baseDate));
				end = getFormatedTime(dif);
			} else {
				dif.setSeconds(dif.getSeconds() + 1);
				end = getFormatedTime(dif);
			}
			timeLine = start + '-->' + end;
			fs.appendFile(captionsPath + videoId + '.vtt', timeLine + '\n' + JSON.stringify(r) + '\n', function(err) {
				if (err) {
					return reject(err);
				}
			});
		});
		console.log('The file was saved!');
		resolve();
	});
}

function getTimeDiff(time, baseDate) {
	if (time === null || baseDate === null) {
		console.log('error : ', 'time is missing');
		return null;
	}
	var timeDiff = Math.abs(time.getTime() - baseDate.getTime());
	return timeDiff;
}

function getFormatedTime(time) {
	return (time.getUTCMinutes() + ':' + time.getUTCSeconds() +
		'.' + time.getUTCMilliseconds());
}
