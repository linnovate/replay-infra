var Promise = require('bluebird'),
	rabbit = require('replay-rabbitmq'),
	JobsService = require('replay-jobs-service');

var path = require('path');

var fs = Promise.promisifyAll(require('fs')),
	_transactionId,
	_jobStatusTag = 'parsed-metadata';

module.exports.start = function(params, error, done) {
	console.log('MetadataParserService started.');

	if (!validateInput(params)) {
		console.log('Some vital parameters are missing.');
		return error();
	}

	_transactionId = params.transactionId;

	JobsService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				return Promise.resolve();
			}
			return performParseChain(params);
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
	var relativePathToData = params.dataRelativePath;
	var method = params.receivingMethod;
	var transactionId = params.transactionId;

	// validate params
	if (!relativePathToData || !process.env.STORAGE_PATH ||
		!method || !method.standard || !method.version || !transactionId) {
		return false;
	}

	return true;
}

// Read data from file, convert it to objects, produce insert-to-databases jobs,
// and then update the job status that we've parsed metadata.
function performParseChain(params) {
	// extract params and handle metadata
	var relativePathToData = params.dataRelativePath;
	var method = params.receivingMethod;

	// concat full path
	var pathToData = path.join(process.env.STORAGE_PATH, relativePathToData);

	readDataAsString(pathToData)
		.then(function(data) {
			return dataToObjects(method, data, params);
		})
		.then(function(videoMetadatas) {
			return produceJobs(videoMetadatas);
		})
		.all()
		.then(updateJobStatus);
}

function readDataAsString(path) {
	return fs.readFileAsync(path, 'utf8');
}

// apply specific logic to parse the different standards of metadatas
function dataToObjects(method, data, params) {
	return new Promise(function(resolve, reject) {
		var standardHandler;
		if (method.standard === 'VideoStandard' && method.version === '0.9') {
			standardHandler = require('./standards/video-standard/0.9');
			resolve(standardHandler.parse(data));
		} else if (method.standard === 'VideoStandard' && method.version === '1.0') {
			standardHandler = require('./standards/video-standard/1.0');
			resolve(standardHandler.parse(data, params));
		} else {
			return reject('Unsupported standard and version');
		}
	});
}

function produceJobs(videoMetadatas) {
	return [
		produceVideoMetadatasJobs('MetadataToMongo', videoMetadatas),
		produceVideoMetadatasJobs('MetadataToElastic', videoMetadatas),
		produceVideoMetadatasJobs('MetadataToCaptions', videoMetadatas)
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

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
