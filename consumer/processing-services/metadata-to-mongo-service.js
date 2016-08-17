var VideoMetadata = require('replay-schemas/VideoMetadata'),
	rabbit = require('replay-rabbitmq'),
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
			return saveToMongo(params.metadatas);
		})
		.then(function() {
			produceBoundingPolygonJob(params);
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

function produceBoundingPolygonJob(params) {
	var videoIds = [];
	params.metadatas.forEach(function(metadata) {
		if (metadata.videoId !== undefined && videoIds.indexOf(metadata.videoId) === -1) {
			videoIds.push(metadata.videoId);
		}
	});
	console.log('video ids' + videoIds.length);
	console.log('Producing MetadataParser job...');
	var message = {
		videoId: videoIds[0], // might change if metadata would handle several videos at one job
		transactionId: params.transactionId
	};
	var queueName = JobsService.getQueueName('VideoBoundingPolygon');
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(new Error('Could not find queue name of the inserted job type'));
}

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
			if(err) {
				console.log(err);
			}
		});
}
