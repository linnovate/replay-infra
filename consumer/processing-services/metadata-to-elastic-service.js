var JobsService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'saved-metadata-to-elastic';

module.exports.start = function(params, error, done) {
	console.log('MetadataToElastic service started.');

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
				return saveToElastic(params.metadatas);
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

function saveToElastic(videoMetadatas) {
	if (videoMetadatas && videoMetadatas.length > 0) {
		console.log('Saving to elastic...');

		// convert xmls to bulk request object for elastic
		var bulkRequest = videoMetadatasToElasticBulkRequest(videoMetadatas);

		return global
			.elasticsearch.bulk({
				body: bulkRequest
			})
			.then(function() {
				console.log('Bulk insertion to elastic succeed.');
				return Promise.resolve();
			});
	}

	console.log('No metadatas receieved.');
	return Promise.resolve();
}

function videoMetadatasToElasticBulkRequest(videoMetadatas) {
	var bulkRequest = [];

	videoMetadatas.forEach(function(videoMetadata) {
		// efficient way to remove auto generated _id
		videoMetadata._id = undefined;

		// push action
		bulkRequest.push({
			index: {
				_index: 'videometadatas',
				_type: 'videometadata'
			}
		});

		// push document
		bulkRequest.push(videoMetadata);
	});

	return bulkRequest;
}

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
