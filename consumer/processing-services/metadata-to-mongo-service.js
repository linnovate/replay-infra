var VideoMetadata = require('replay-schemas/VideoMetadata'),
	rabbit = require('replay-rabbitmq'),
	_ = require('lodash'),
	JobsService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'saved-metadata-to-mongo';

module.exports.start = function(params, error, done) {
	console.log('MetadataToMongo service started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		return error();
	}

	_transactionId = params.transactionId;

	// Make sure we haven't performed this job already
	JobsService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				return Promise.resolve();
			}
			return saveToMongo(params.metadatas)
				.then(updateJobStatus);
		})
		.then(function() {
			return produceJobs(params.metadatas);
		})
		.all()
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
	if (!params.transactionId) {
		return false;
	}
	return true;
}

function saveToMongo(videoMetadatas) {
	// insert only if we have metadatas
	if (videoMetadatas && videoMetadatas.length > 0) {
		console.log('Saving to mongo...');
		return VideoMetadata.insertMany(videoMetadatas)
			.then(function() {
				console.log('Bulk insertion to mongo succeed.');
				return Promise.resolve();
			});
	}

	console.log('No metadatas receieved.');
	return Promise.resolve();
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

function produceJobs(metadatas) {
	var videoIds = _(metadatas).map('videoId').value();
	console.log('Video ids length:', videoIds.length);
	var videoId = videoIds[0]; // might change if 'metadata-to-mongo' would handle several videos at one job
	return [
		produceVideoIdJobs('VideoBoundingPolygon', videoId),
		produceVideoIdJobs('MetadataToCaptions', videoId)
	];
}

function produceVideoIdJobs(jobName, videoId) {
	console.log('Producing %s job...', jobName);
	var message = {
		transactionId: _transactionId,
		videoId: videoId
	};
	var queueName = JobsService.getQueueName(jobName);
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(Error('Could not find queue name of the inserted job type'));
}
