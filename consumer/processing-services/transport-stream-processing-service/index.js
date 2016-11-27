var Promise = require('bluebird'),
	fse = require('fs-extra'),
	rabbit = require('replay-rabbitmq'),
	JobService = require('replay-jobs-service'),
	SmilGeneretor = require('replay-smil-generator'),
	S3 = require('replay-aws-s3');

var path = require('path');

var _transactionId;
var _jobStatusTag = 'transportStream-processing-done';

const CONSUMER_NAME = '#transportStream-processing#';
const SMIL_POSFIX = '.smil';

module.exports.start = function(params, error, done) {
	if (!paramsIsValid(params)) {
		console.log(CONSUMER_NAME, 'params are not valid');
		return error();
	}

	_transactionId = params.transactionId;

	JobService.findOrCreateJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				return Promise.resolve();
			}
			// else:
			return performProcessingChain(params);
		})
		.then(function() {
			done();
			return Promise.resolve();
		})
		.catch(function(err) {
			console.trace(err);
			return error();
		});
};

function performProcessingChain(params) {
	return proccesTS(params)
		.then(function(paths) {
			if (paths.videoPath) {
				return generateSmil(params, paths)
					.then(function() {
						// add to the paths object the smil path.
						paths.smilPath = changePathExtention(paths.videoPath, SMIL_POSFIX);

						return null;
					})
					.catch(function(err) {
						console.trace(err);
					})
					.finally(function() {
						return finishProcessingChain(params, paths);
					});
			}
			return finishProcessingChain(params, paths);
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

function finishProcessingChain(params, paths) {
	var dirPath = path.parse(params.fileRelativePath).dir;
	return uploadToS3(dirPath)
		.then(function() {
			return rmDir(dirPath);
		}).then(function() {
			// call update job status but don't depend on it's result as we already finished the processing chain
			updateJobStatus();
			return Promise.resolve();
		}).then(function() {
			return produceJobs(params, paths);
		})
		.catch(function(err) {
			console.error(err);
			return Promise.reject(err);
		});
}

// validate the params.
function paramsIsValid(params) {
	// check required process environment.
	if (!process.env.CAPTURE_STORAGE_PATH || !process.env.STORAGE_PATH) {
		return false;
	}

	// check the minimal requires for the message that send to the next job.
	if (!params || !params.sourceId || !params.receivingMethod || !params.transactionId || !params.sourceType) {
		return false;
	}

	// check if there is start time and end time.
	if (!params.startTime || !params.endTime) {
		return false;
	}

	// check the require for the receiving method.
	if (!params.receivingMethod || !params.receivingMethod.standard || !params.receivingMethod.version) {
		return false;
	}

	// check the require file path for processing.
	if (!params.fileRelativePath) {
		return false;
	}

	return true;
}

// understand what ts file we deal (video/data/video and data) and manipulate it.
function proccesTS(params) {
	var processTsMethod;
	// prepare the require params for the processing method.
	var paramsForMethod = {
		filesStoragePath: process.env.CAPTURE_STORAGE_PATH,
		fileRelativePath: params.fileRelativePath,
		fileType: params.sourceType
	};
	// check the receiving method standard
	switch (params.receivingMethod.standard) {
		case 'VideoStandard':
			// check the receiving method version
			switch (params.receivingMethod.version) {
				case '0.9':
					processTsMethod = require('./unmux');
					break;
				case '1.0':
					// original
					// processTsMethod = require('./mux');

					/*************************************************************/
					// hardCoded for demoXML
					paramsForMethod.hardCoded = true;
					processTsMethod = require('./unmux');
					/*************************************************************/
					break;
				default:
					return Promise.reject(new Error(CONSUMER_NAME + ' Unsupported version for video-standard'));
			}
			break;
		case 'stanag':
			// check the receiving method version
			switch (params.receivingMethod.version) {
				case '4609':
					processTsMethod = require('./mux');
					break;
				default:
					return Promise.reject(new Error(CONSUMER_NAME + ' Unsupported version for stanag'));
			}
			break;
		default:
			return Promise.reject(new Error(CONSUMER_NAME + ' Unsupported standard'));
	}
	// activate the processing method
	return processTsMethod(paramsForMethod);
}

function generateSmil(params, paths) {
	var videoPathParse = path.parse(params.videoPath);
	var videosArray = [];

	videosArray.push(videoPathParse.base);
	paths.additionalPaths.forEach(function(flavor) {
		videosArray.push(path.parse(flavor).base);
	});
	var paramsForGenerator = {
		folderPath: videoPathParse.dir,
		smilFileName: path.parse(changePathExtention(paths.videoPath, SMIL_POSFIX)).base,
		title: videoPathParse.name + ' adaptive stream',
		video: videosArray
	};

	var newSmil = new SmilGeneretor();
	return newSmil.generateSmil(paramsForGenerator);
}

function changePathExtention(wantedPath, ext) {
	var wantedPathParse = path.parse(wantedPath);
	return path.join(wantedPathParse.dir, wantedPathParse.name + ext);
}

function uploadToS3(dirPath) {
	// need to add those process environment variables:
	process.env.AWS_ACCESS_KEY_ID = 'AKIAJNDEXOJEP6IIANDQ';
	process.env.AWS_SECRET_ACCESS_KEY = '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';
	process.env.AWS_BUCKET = 'Replay';

	var bucket = process.env.AWS_BUCKET;
	var prefix = dirPath;

	return S3.uploadDir(dirPath, bucket, prefix)
		.then(function() {
			console.log('Directory %s successfully uploaded to S3', dirPath);
			return Promise.resolve();
		})
		.catch(function(err) {
			console.error('Unable to uploaded %s directory to S3: %s', dirPath, err);
			return Promise.reject(err);
		});
}

function rmDir(dirPath) {
	return new Promise(function(resolve, reject) {
		fse.remove(dirPath, function(err) {
			if (err) {
				console.error('Unable to removed %s directory from the file system: %s', dirPath, err);
				reject(err);
			}
			console.log('Directory %s successfully removed from the file system', dirPath);
			resolve();
		});
	});
}

// update job status, swallaw errors so they won't invoke error() on message
function updateJobStatus() {
	return JobService.updateJobStatus(_transactionId, _jobStatusTag)
		.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
}

// produce to the next job.
function produceJobs(params, paths) {
	// build message.
	var message = buildMessageParams(params, paths);
	if (paths.videoPath) { // add video params for message if received video path.
		message = receivedVideo(message, paths);
	}
	if (paths.dataPath) { //  add data params for message if received data path.
		message = receivedData(message, paths);
	}

	// send message to queue.
	var queueName = JobService.getQueueName('SaveVideo');
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(new Error('Could not find queue name of the inserted job type'));
}

function buildMessageParams(params, paths) {
	var fileRelativePathParse = path.parse(params.fileRelativePath);

	return {
		sourceId: params.sourceId,
		contentDirectoryPath: fileRelativePathParse.dir,
		baseName: fileRelativePathParse.name,
		receivingMethod: {
			standard: params.receivingMethod.standard,
			version: params.receivingMethod.version
		},
		startTime: params.startTime,
		endTime: params.endTime,
		duration: params.duration,
		transactionId: params.transactionId,
		flavors: []
	};
}

function receivedVideo(paths, message) {
	message.videoFileName = path.parse(paths.videoPath).base;
	paths.additionalPaths.push(paths.videoPath);
	if (paths.additionalPaths && paths.additionalPaths.length > 1) {
		message.flavors = paths.additionalPaths.map(function(currentPath) {
			return path.parse(currentPath).base;
		});
	}
	if (paths.smilPath) {
		message.requestFormat = 'smil';
	} else {
		message.requestFormat = 'mp4';
	}
	return message;
}

function receivedData(paths, message) {
	message.dataFileName = path.parse(paths.dataPath).base;
	return message;
}
