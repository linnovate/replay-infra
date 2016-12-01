var Promise = require('bluebird'),
	_ = require('lodash'),
	rabbit = require('replay-rabbitmq'),
	S3 = require('replay-aws-s3'),
	JobsService = require('replay-jobs-service');

var path = require('path');

var _transactionId,
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
			return performParseChain(params)
				.then(updateJobStatus);
		})
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
	if (_.isUndefined(dataFileName) || _.isUndefined(contentDirectoryPath) || _.isUndefined(process.env.AWS_BUCKET) ||
		_.isUndefined(method) || _.isUndefined(method.standard) || _.isUndefined(method.version) || _.isUndefined(transactionId)) {
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
	var dataPath = path.join(contentDirectoryPath, dataFileName);

	return downloadDataFromS3(dataPath)
		.then(function (data) {
			return dataToObjects(method, data, params);
		})
		.then(function (videoMetadatas) {
			return produceNextJobs(params, videoMetadatas);
		});
}

function downloadDataFromS3(dataPath) {
	var bucket = process.env.AWS_BUCKET;
	var key = dataPath;

	return S3.downloadBuffer(bucket, key)
		.then(function(buffer) {
			console.log('Data successfully download from S3');
			var data = buffer.toString();
			return Promise.resolve(data);
		})
		.catch(function(err) {
			console.error('Unable to download data from S3:', err);
			return Promise.reject(err);
		});
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

// produce AttachVideoToMetadata if it's 0.9 video, else produce MetadataToMongo job
function produceNextJobs(params, videoMetadatas) {
	// produce AttachVideoToMetadata job only if the receiving method is VideoStandard 0.9
	if (params.receivingMethod.standard === 'VideoStandard' && params.receivingMethod.version === '0.9') {
		return produceAttachVideoToMetadataJob(videoMetadatas, params);
	}

	return produceMetadataToMongoJob(videoMetadatas);
}

function produceMetadataToMongoJob(videoMetadatas) {
	var jobName = 'MetadataToMongo';
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

// update job status, swallaw errors so they won't invoke error() on message
function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag)
		.catch(function (err) {
			if (err) {
				console.log(err);
			}
		});
}
