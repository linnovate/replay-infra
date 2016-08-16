var fs = require('fs'),
	path = require('path');

var Promise = require('bluebird'),
	mkdirp = require('mkdirp'),
	rabbit = require('replay-rabbitmq'),
	JobsService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'created-captions-from-metadata';

var LAST_CAPTIONS_TIME = 1; // in seconds
var CAPTIONS_PATH = 'captions';

module.exports.start = function(params, error, done) {
	console.log('MetadataToCaptions service started.');

	if (!validateInput(params)) {
		console.log('MetadataToCaptions - Some vital parameters are missing.');
		return error();
	}
	_transactionId = params.transactionId;

	// Make sure we haven't done this job already
	JobsService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				return Promise.resolve();
			}
			return performCaptionsChain(params.metadatas);
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
	console.log('Transaction id:', params.transactionId);

	// validate params
	if (!process.env.STORAGE_PATH || !params.transactionId) {
		return false;
	}
	return true;
}

function performCaptionsChain(metadatas) {
	if (metadatas && metadatas.length > 0) {
		return createCaptions(metadatas)
			.then(produceCaptionsToDestinationJob)
			.catch(function(err) {
				return Promise.reject(err);
			});
	}
	// else:
	console.log('MetadataToCaptions - No metadatas receieved.');
	return Promise.resolve();
}

function createCaptions(metadatas) {
	var startTime, endTime, currentTimestamp, timeDiff, timeLine;

	var captionsPath = path.join(process.env.STORAGE_PATH, CAPTIONS_PATH);
	checkAndCreatePath(captionsPath);

	var videoId = metadatas[0].videoId;
	var fileName = videoId + '.vtt';
	var captionsFullPath = path.join(captionsPath, fileName);
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
			return fs.appendFile(captionsFullPath, timeLine + '\n' + JSON.stringify(item) + '\n\n', function(err) {
				if (err) {
					return Promise.reject(err);
				}
				return Promise.resolve();
			});
		}).then(function() {
			console.log('Captions file created successfully!');
			return Promise.resolve({ videoId: videoId, captionsRelativePath: CAPTIONS_PATH, captionsFileName: fileName });
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

function produceCaptionsToDestinationJob(params) {
	console.log('Producing CaptionsToDestination job...');

	var message = {
		videoId: params.videoId,
		captionsRelativePath: params.captionsRelativePath,
		captionsFileName: params.captionsFileName,
		transactionId: _transactionId
	};

	var queueName = JobsService.getQueueName('CaptionsToDestination');
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(new Error('Could not find queue name of the inserted job type'));
}

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
