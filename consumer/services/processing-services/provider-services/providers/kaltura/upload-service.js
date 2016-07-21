var fs = require('fs'),
	path = require('path');

var	JobService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'uploaded-to-kaltura';

module.exports.upload = function(params, error, done) {
	console.log('Kaltura Upload Service started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		return error();
	}

	_transactionId = params.transactionId;

	JobService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				done();
			} else {
				copyToDropFolder(params, error, done);
			}
			// always resolve as copyToDropFolder is async
			return Promise.resolve();
		})
		.catch(function(err) {
			if (err) {
				console.log(err);
				// NOTE: If we've failed here we probably haven't copied to dropfolder;
				// hence, call error().
				error();
			}
		});
};

function validateInput(params) {
	console.log('Video name is: ', params.videoName);
	console.log('Relative path to video is: ', params.relativePath);
	console.log('Drop folder path is: ', process.env.DROP_FOLDER_PATH);
	console.log('Transaction id is: ', params.transactionId);

	if (!process.env.STORAGE_PATH || !process.env.DROP_FOLDER_PATH || !params.relativePath || !params.videoName || !params.transactionId) {
		return false;
	}

	return true;
}

function copyToDropFolder(params, error, done) {
	var sourceFilePath = path.join(process.env.STORAGE_PATH, params.relativePath);
	var targetFilePath = path.join(process.env.DROP_FOLDER_PATH, params.videoName);

	// copy video file into drop folder
	copyFile(sourceFilePath, targetFilePath, function(err) {
		if (err) {
			console.log('Error copying video to dropfolder: ', err);
			error();
		}

		console.log('Video successfuly copied to dropfolder.');
		// update status
		return JobService.updateJobStatus(_transactionId, _jobStatusTag)
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
