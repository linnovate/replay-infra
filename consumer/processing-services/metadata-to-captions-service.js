var fs = require('fs'),
	path = require('path');

var Promise = require('bluebird'),
	streamBuffers = require('stream-buffers'),
	JobsService = require('replay-jobs-service'),
	Video = require('replay-schemas/Video'),
	VideoMetadata = require('replay-schemas/VideoMetadata');

const LAST_CAPTIONS_TIME = 1; // in seconds

var _transactionId;
var _jobStatusTag = 'created-captions-from-metadata';

// wrap the fs.writeFile nodeFunction to return a promise instead of taking a callback
var fsWriteFile = Promise.promisify(fs.writeFile);

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
			return performCaptionsChain(params)
				.then(updateJobStatus);
		})
		.then(function() {
			done();
			return Promise.resolve();
		})
		.catch(function(err) {
			if (err) {
				console.log(err);
				error();
			}
		});
};

function validateInput(params) {
	console.log('Storage path:', process.env.STORAGE_PATH);
	console.log('Transaction id:', params.transactionId);
	console.log('Video id:', params.videoId);

	// validate params
	if (!process.env.STORAGE_PATH || !params.transactionId || !params.videoId) {
		return false;
	}
	return true;
}

function performCaptionsChain(params) {
	return getVideoMetadatas(params.videoId)
		.then(function(metadatas) {
			var captionsPath;
			if (metadatas && metadatas.length > 0) {
				return getCaptionsFullPath(params.videoId)
					.then(function(captionsFullPath) {
						captionsPath = captionsFullPath;
						return createCaptions(metadatas);
					})
					.then(function(captionsStreamBuffer) {
						return writeCaptionsToDestination(captionsStreamBuffer, captionsPath);
					})
					.catch(function(err) {
						return Promise.reject(err);
					});
			}
			// else:
			console.log('MetadataToCaptions - No metadatas found.');
			return Promise.resolve();
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

function getVideoMetadatas(videoId) {
	// retrieve all video's metadatas from db
	console.log('find metadatas in mongo by videoId: ', videoId);
	// return the metadatas sorted by descendant timestamp
	return VideoMetadata.find({ videoId: videoId }).sort('timestamp');
}

function getCaptionsFullPath(videoId) {
	console.log('find video in mongo by videoId: ', videoId);
	return Video.findById(videoId)
		.then(function(video) {
			if (video) {
				var captionsFileName = video.baseName + '.vtt';
				var captionsPath = path.join(process.env.STORAGE_PATH, video.contentDirectoryPath, captionsFileName);
				return Promise.resolve(captionsPath);
			}
			// else:
			return Promise.reject(new Error('No video found!'));
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

function createCaptions(metadatas) {
	try {
		var startTime, endTime, timeDiff, baseTimestamp, currentTimestamp, timeLine;

		endTime = getFormatedTime(new Date(0));
		baseTimestamp = new Date(metadatas[0].timestamp);

		var captionsStreamBuffer = new streamBuffers.WritableStreamBuffer({
			initialSize: streamBuffers.DEFAULT_INITIAL_SIZE, // start at 8 kilobytes
			incrementAmount: streamBuffers.DEFAULT_INCREMENT_AMOUNT // grow by 8 kilobytes each time buffer overflows
		});

		metadatas.forEach(function(item, index) {
			startTime = endTime;
			if (index < (metadatas.length - 1)) {
				currentTimestamp = new Date(metadatas[index + 1].timestamp);
				timeDiff = getTimeDiff(currentTimestamp, baseTimestamp);
			} else {
				timeDiff.setSeconds(timeDiff.getSeconds() + LAST_CAPTIONS_TIME);
			}
			endTime = getFormatedTime(timeDiff);
			timeLine = startTime + '-->' + endTime;
			captionsStreamBuffer.write(timeLine + '\n' + JSON.stringify(item) + '\n\n');
		});
		console.log('Captions buffer created successfully!');
		captionsStreamBuffer.end();
		return Promise.resolve(captionsStreamBuffer);
	} catch (err) {
		return Promise.reject(err);
	}
}

function writeCaptionsToDestination(captionsStreamBuffer, captionsPath) {
	return fsWriteFile(captionsPath, captionsStreamBuffer.getContents())
		.then(function() {
			console.log('Captions file successfuly created in destination.');
			return Promise.resolve();
		})
		.catch(function(err) {
			err.message = 'Failed to write captions to destination! ' + err.message;
			return Promise.reject(err);
		});
}

function getFormatedTime(time) {
	return (time.getUTCMinutes() + ':' + time.getUTCSeconds() + '.' + time.getUTCMilliseconds());
}

function getTimeDiff(currentTimestamp, baseTimestamp) {
	if (!currentTimestamp || !baseTimestamp) {
		throw new Error('Error! missing params (in function getTimeDiff)');
	}
	var timeDiff = Math.abs(currentTimestamp.getTime() - baseTimestamp.getTime());
	return new Date(timeDiff);
}

// update job status, swallaw errors so they won't invoke error() on message
function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag)
		.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
}
