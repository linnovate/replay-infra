var VideoMetadata = require('replay-schemas/VideoMetadata'),
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
				done();
			} else {
				return saveToMongo(params.metadatas);
			}
		})
		.then(done)
		.then(updateJobStatus)
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

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
