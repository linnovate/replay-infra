var JobsService = require('replay-jobs-service'),
	elasticsearch = require('replay-elastic');

var _transactionId;
var _jobStatusTag = 'saved-metadata-to-elastic';

elasticsearch.connect(process.env.ELASTIC_HOST, process.env.ELASTIC_PORT);

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
				return Promise.resolve();
			}
			return saveToElastic(params.metadatas);
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

function validateInput(params) {
	if (!params.transactionId) {
		return false;
	}
	return true;
}

function saveToElastic(videoMetadatas) {
	if (videoMetadatas && videoMetadatas.length > 0) {
		console.log('Saving to elastic...');

		return elasticsearch.bulkInsertVideoMetadatas(videoMetadatas)
			.then(function() {
				console.log('Bulk insertion to elastic succeed.');
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
