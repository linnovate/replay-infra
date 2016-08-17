var fs = require('fs'),
	path = require('path');

var JobsService = require('replay-jobs-service'),
	Promise = require('bluebird'),
	mkdirp = require('mkdirp');

var _transactionId;
var _jobStatusTag = 'created-captions-from-metadata';

var LAST_CAPTIONS_TIME = 1; // in seconds

module.exports.start = function(params, error, done) {
	console.log('MetadataToCaptions service startTimeed.');

	if (!validateInput(params)) {
		console.log('MetadataToCaptions - Some vital parameters are missing.');
		return error();
	}
	_transactionId = params.transactionId;

	// Make sure we haven't done this job already
	JobsService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				return Promise.resolve();
			}
			return tryCreateCaptions(params.metadatas);
		})
		.then(function() {
			done();
			return Promise.resolve();
		})
		.then(updateJobStatus)
		.catch(function(err) {
			if (err) {
				console.log(err);
				error();
			}
		});
};

function validateInput(params) {
	// validate params
	if (!params.transactionId) {
		return false;
	}
	return true;
}

function tryCreateCaptions(metadatas) {
	if (metadatas && metadatas.length > 0) {
		return createCaptions(metadatas);
	}
	console.log('MetadataToCaptions - No metadatas receieved.');
	return Promise.resolve();
}

function createCaptions(metadatas) {
	var startTime, endTime, currentTimestamp;
	var timeDiff, timeLine, fileName;

	var captionsPath = path.join(process.env.STORAGE_PATH, 'captions');
	checkAndCreatePath(captionsPath);

	var videoId = metadatas[0].videoId;
	var baseTimestamp = new Date(metadatas[0].timestamp);
	endTime = getFormatedTime(new Date(0));

	return Promise
		.map(metadatas, function(item, index) {
			startTime = endTime;
			if (index < (metadatas.length - 1)) {
				currentTimestamp = new Date(metadatas[index + 1].timestamp);
				timeDiff = getTimeDiff(currentTimestamp, baseTimestamp);
				endTime = getFormatedTime(timeDiff);
			} else {
				timeDiff.setSeconds(timeDiff.getSeconds() + LAST_CAPTIONS_TIME);
				endTime = getFormatedTime(timeDiff);
			}
			timeLine = startTime + '-->' + endTime;
			fileName = path.join(captionsPath, videoId + '.vtt');
			return fs.appendFile(fileName, timeLine + '\n' + JSON.stringify(item) + '\n\n', function(err) {
				if (err) {
					return Promise.reject(err);
				}
				return Promise.resolve();
			});
		}).then(function() {
			console.log('Captions file created successfully!');
			return Promise.resolve();
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

function checkAndCreatePath(path) {
	try {
		fs.accessSync(path, fs.F_OK);
	} catch (err) {
		mkdirp.sync(path);
	}
}

function getTimeDiff(currentTimestamp, baseTimestamp) {
	if (!currentTimestamp || !baseTimestamp) {
		throw new Error('Error! missing params (in function getTimeDiff)');
	}
	var timeDiff = Math.abs(currentTimestamp.getTime() - baseTimestamp.getTime());
	return new Date(timeDiff);
}

function getFormatedTime(time) {
	return (time.getUTCMinutes() + ':' + time.getUTCSeconds() +
		'.' + time.getUTCMilliseconds());
}

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
