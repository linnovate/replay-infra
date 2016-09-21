var Promise = require('bluebird'),
	rabbit = require('replay-rabbitmq'),
	JobsService = require('replay-jobs-service');

var path = require('path');

var fs = Promise.promisifyAll(require('fs')),
	_transactionId,
	_jobStatusTag = 'parsed-metadata';

module.exports.start = function (params, error, done) {
	console.log('MetadataParserService started.');

	if (!validateInput(params)) {
		console.log('Some vital parameters are missing.');
		return error();
	}

	_transactionId = params.transactionId;

	JobsService.findJobStatus(_transactionId)
		.then(function (jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				return Promise.resolve();
			}
			return performParseChain(params);
		})
		.then(updateJobStatus)
		.then(function () {
			done();
			return Promise.resolve();
		})
		.catch(function (err) {
			if (err) {
				console.log(err);
				error();
			}
		});
};

function validateInput(params) {
	var dataFileName = params.dataFileName;
	var contentDirectoryPath = params.contentDirectoryPath;
	var method = params.receivingMethod;
	var transactionId = params.transactionId;

	// validate params
	if (!dataFileName || !contentDirectoryPath || !process.env.STORAGE_PATH ||
		!method || !method.standard || !method.version || !transactionId) {
		return false;
	}

	return true;
}

// Read data from file, convert it to objects then produce insert-to-databases jobs.
function performParseChain(params) {
	// extract params and handle metadata
	var dataFileName = params.dataFileName;
	var contentDirectoryPath = params.contentDirectoryPath;
	var method = params.receivingMethod;

	// concat full path
	var pathToData = path.join(process.env.STORAGE_PATH, contentDirectoryPath, dataFileName);

	return readDataAsString(pathToData)
		.then(function (data) {
			return dataToObjects(method, data, params);
		})
		.then(function (videoMetadatas) {
			return produceJobs(params, videoMetadatas);
		})
		.all();
}

function readDataAsString(path) {
	return fs.readFileAsync(path);
}

// apply specific logic to parse the different standards of metadatas
function dataToObjects(method, data, params) {
	return new Promise(function (resolve, reject) {
		var standardHandler;
		switch (method.standard) {
			case 'VideoStandard':
				switch (method.version) {
					case '0.9':
						standardHandler = require('./standards/video-standard/0.9');
						resolve(standardHandler.parse(data.toString('utf8')));
						break;
					case '1.0':
						standardHandler = require('./standards/video-standard/1.0');
						resolve(standardHandler.parse(data.toString('utf8'), params));
						break;
					default:
						reject('Unsupported version for video-standard');
						break;
				}
				break;
			case 'stanag':
				switch (method.version) {
					case '4609':
						standardHandler = require('./standards/stanag/4609');
						resolve(standardHandler.parse(data, params));
						break;
					default:
						reject('Unsupported version for stanag');
						break;
				}
				break;
			default:
				reject('Unsupported standard');
				break;
		}
	});
}

function produceJobs(params, videoMetadatas) {
	return [
		produceVideoMetadatasJobs('MetadataToMongo', videoMetadatas),
		produceAttachVideoToMetadataJob(videoMetadatas, params)
	];
}

function produceVideoMetadatasJobs(jobName, videoMetadatas) {
	console.log('Producing %s job...', jobName);
	var message = {
		transactionId: _transactionId,
		metadatas: videoMetadatas
	};
	var queueName = JobsService.getQueueName(jobName);
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(Error('Could not find queue name of the inserted job type'));
}

function produceAttachVideoToMetadataJob(videoMetadatas, params) {
	var jobName = 'AttachVideoToMetadata';
	// produce this job only if the receiving method is VideoStandard 0.9
	if (params.receivingMethod.standard === 'VideoStandard' && params.receivingMethod.version === '0.9') {
		console.log('Producing %s job...', jobName);
		var message = {
			transactionId: _transactionId,
			sourceId: params.sourceId,
			metadatas: videoMetadatas
		};
		var queueName = JobsService.getQueueName(jobName);
		if (queueName) {
			return rabbit.produce(queueName, message);
		}
		return Promise.reject(Error('Could not find queue name of the inserted job type'));
	}
	return Promise.resolve();
}

// update job status, swallaw errors so they won't invoke error() on message
function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag)
		.catch(function (err) {
			if (err) {
				console.log(err);
			}
		});
}
