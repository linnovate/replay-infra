var Promise = require('bluebird'),
	JobService = require('replay-jobs-service'),
	rabbit = require('replay-rabbitmq'),
	SmilGeneretor = require('replay-smil-generator');
var path = require('path');

var _transactionId;
var _jobStatusTag = 'transportStream-processing-done';

const CONSUMER_NAME = '#transportStream-proccesing#';
const CAPTURE_STORAGE_PATH = process.env.CAPTURE_STORAGE_PATH;
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
				done();
			} else {
				proccesTS(params)
					.then(function(paths) {
						if (paths.videoPath) {
							return generateSmil(params, paths)
								.then(function() {
									// add to the paths object the smil path.
									paths.smilPath = changePathExtention(paths.videoPath, SMIL_POSFIX);
								})
								.catch(function(err) {
									console.log(err);
								})
								.finally(function() {
									return produceJobs(params, paths);
								});
						}
						return produceJobs(params, paths);
					})
					.then(done)
					.catch(function(err) {
						console.log('error on:', CONSUMER_NAME, err);
						error();
					});
			}
		})
		.catch(function(err) {
			console.log('error on:', CONSUMER_NAME, err);
			error();
		});
};

// validate the params.
function paramsIsValid(params) {
	// check the minimal requires for the message that send to the next job.
	if (!params || !params.sourceId || !params.receivingMethod || !params.transactionId || !params.sourceType) {
		return false;
	}

	// check the require for the reciving method.
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
		filesStoragePath: CAPTURE_STORAGE_PATH,
		fileRelativePath: params.fileRelativePath,
		fileType: params.sourceType,
		hardCoded: true
	};
	console.log(JSON.stringify(paramsForMethod));
	// check the reciving method standard
	switch (params.receivingMethod.standard) {
		case 'VideoStandard':
			// check the reciving method version
			switch (params.receivingMethod.version) {
				case '0.9':
					processTsMethod = require('./unmux');
					break;
				case '1.0':
					// original
					// processTsMethod = require('./mux');

					/*************************************************************/
					// hardCoded for demoXML
					processTsMethod = require('./unmux');
					/*************************************************************/
					break;
				default:
					return Promise.reject(new Error(CONSUMER_NAME + 'Unsupported version for video-standard'));
			}
			break;
		case 'stanag':
			// check the reciving method version
			switch (params.receivingMethod.version) {
				case '4609':
					processTsMethod = require('./mux');
					break;
				default:
					return Promise.reject(new Error(CONSUMER_NAME + 'Unsupported version for stanag'));
			}
			break;
		default:
			return Promise.reject(new Error(CONSUMER_NAME + 'Unsupported standard'));
	}
	// activate the processing method
	return processTsMethod(paramsForMethod);
}

// produce to the next job.
function produceJobs(params, paths) {
	var message = {
		sourceId: params.sourceId,
		contentDirectoryPath: path.parse(params.fileRelativePath).dir,
		baseName: path.parse(params.fileRelativePath).name,
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
	// check if we recieved video path.
	if (paths.videoPath) {
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
	}
	// check if we recieved data path.
	if (paths.dataPath) {
		message.dataFileName = path.parse(paths.dataPath).base;
	}
	var queueName = JobService.getQueueName('SaveVideo');
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(new Error('Could not find queue name of the inserted job type'));
}

function generateSmil(params, paths) {
	var newSmil = new SmilGeneretor();
	var videosArray = [];
	videosArray.push(path.parse(paths.videoPath).base);
	paths.additionalPaths.forEach(function(flavor) {
		videosArray.push(path.parse(flavor).base);
	});
	var paramsForGenerator = {
		folderPath: path.parse(paths.videoPath).dir,
		smilFileName: path.parse(changePathExtention(paths.videoPath, SMIL_POSFIX)).base,
		title: path.parse(paths.videoPath).name + ' adaptive stream',
		video: videosArray
	};
	return newSmil.generateSmil(paramsForGenerator);
}

function changePathExtention(wantedpath, ext) {
	var dirPath = path.parse(wantedpath).dir;
	var namePath = path.parse(wantedpath).name;
	return path.join(dirPath, namePath + ext);
}
