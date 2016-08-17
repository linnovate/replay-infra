var fs = require('fs'),
	path = require('path');

var JobsService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'uploaded-to-kaltura';

module.exports.upload = function(params, error, done) {
	console.log('Kaltura Upload Service started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		return error();
	}

	_transactionId = params.transactionId;

	JobsService.findJobStatus(_transactionId)
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
	console.log('Relative path to video is: ', params.videoRelativePath);
	console.log('Drop folder path is: ', process.env.DROP_FOLDER_PATH);
	console.log('Transaction id is: ', params.transactionId);

	if (!process.env.STORAGE_PATH || !process.env.DROP_FOLDER_PATH || !params.videoRelativePath || !params.videoName || !params.transactionId) {
		return false;
	}

	return true;
}

function copyToDropFolder(params, error, done) {
	var sourceFilePath = path.join(process.env.STORAGE_PATH, params.videoRelativePath);
	var targetFilePath = path.join(process.env.DROP_FOLDER_PATH, params.videoName);

	console.log(sourceFilePath);
	console.log(targetFilePath);

	// copy video file into drop folder
	copyFile(sourceFilePath, targetFilePath, function(err) {
		if (err) {
			console.log('Error copying video to dropfolder: ', err);
			return error();
		}

		console.log('Video successfuly copied to dropfolder.');
		// update status
		updateJobStatus()
			.then(done);
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

// update job status, swallaw errors so they won't invoke error() on message
function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag)
		.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
}
