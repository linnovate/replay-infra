var VideoMetadata = require('replay-schemas/VideoMetadata'),
	JobsService = require('replay-jobs-service');

var _transactionId;
var jobStatusTag = 'saved-metadata-to-mongo';

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
			if (jobStatus.statuses.indexOf(jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				done();
			} else {
				return saveToMongo(params.metadatas);
			}
		})
		.then(done)
		.catch(function(err) {
			if (err) {
				console.log(err);
				error();
			}
		})
		.finally(function() {
			// update job status at last, so if it will fail it won't trigger re-insertion
			return updateJobStatus();
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

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, jobStatusTag);
}
