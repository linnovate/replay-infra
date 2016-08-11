var fs = require('fs'),
	path = require('path');

var Promise = require('bluebird'),
	JobsService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'captions-copied-to-destination';

module.exports.start = function(params, error, done) {
	console.log('CaptionsToDestination started.');

	if (!validateInput(params)) {
		console.log('CaptionsToDestination - Some vital parameters are missing.');
		return error();
	}
	_transactionId = params.transactionId;
	// Make sure we haven't done this job already
	JobsService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				done();
			} else {
				copyToDestination(params, error, done);
			}
			// always resolve as copyToDestination is async
			return Promise.resolve();
		})
		.catch(function(err) {
			if (err) {
				console.log(err);
				// NOTE: If we've failed here we probably haven't copied to destination; hence, call error().
				error();
			}
		});
};

function validateInput(params) {
	console.log('Transaction id: ', params.transactionId);
	console.log('Captions file name: ', params.captionsFileName);
	console.log('Captions relative path: ', params.captionsRelativePath);
	console.log('Captions destination path: ', process.env.CAPTIONS_DESTINATION_PATH);

	// validate params
	if (!params.transactionId || !params.captionsFileName || !params.captionsRelativePath ||
		!process.env.STORAGE_PATH || !process.env.CAPTIONS_DESTINATION_PATH) {
		return false;
	}

	return true;
}

function copyToDestination(params, error, done) {
	var sourceFilePath = path.join(process.env.STORAGE_PATH, params.captionsRelativePath, params.captionsFileName);
	var destinationFilePath = path.join(process.env.DROP_FOLDER_PATH, params.captionsFileName);

	console.log(sourceFilePath);
	console.log(destinationFilePath);

	// copy captions file into destination
	copyFile(sourceFilePath, destinationFilePath, function(err) {
		if (err) {
			console.log('Error copying captions to destination: ', err);
			error();
		}
		console.log('Captions successfuly copied to destination.');
		// update status
		return updateJobStatus()
			.then(done)
			.catch(function(err) {
				if (err) {
					console.log(err);
					// NOTE: We do not error() on this, else duplicate entries would
					// be uploaded to Kaltura!
					done();
				}
			});
	});
}

function copyFile(source, target, cb) {
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	rd.on('error', function(err) {
		doneCopy(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on('error', function(err) {
		doneCopy(err);
	});
	wr.on('close', function(ex) {
		doneCopy();
	});
	rd.pipe(wr);

	function doneCopy(err) {
		if (!cbCalled) {
			cbCalled = true;
			cb(err);
		}
	}
}

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
