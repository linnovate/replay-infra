var fs = require('fs'),
	path = require('path');

var Promise = require('bluebird'),
	JobsService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'captions-copied-to-destination';

module.exports.start = function(params, error, done) {
	console.log('CaptionsToDestination started.');

	validateInput(params)
		.then(function(transactionId) {
			_transactionId = params.transactionId;
			// Make sure we haven't done this job already
			return JobsService.findJobStatus(_transactionId);
		})
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				return Promise.resolve();
			}
			return copyToDestination(params, error, done);
		})
		.catch(function(err) {
			console.log(err);
			error();
		});
};

function validateInput(params) {
	console.log('Transaction id:', params.transactionId);
	console.log('Captions videoId:', params.videoId);
	console.log('Captions file name:', params.captionsFileName);
	console.log('Captions relative path:', params.captionsRelativePath);
	console.log('Captions storage path:', process.env.STORAGE_PATH);

	// validate params
	if (!params.transactionId || !params.videoId || !params.captionsFileName || !params.captionsRelativePath || !process.env.STORAGE_PATH) {
		return Promise.reject('CaptionsToDestination - Some vital parameters are missing.');
	}

	return Promise.resolve(params.transactionId);
}

function copyToDestination(params, error, done) {
	var sourceFilePath = path.join(process.env.STORAGE_PATH, params.captionsRelativePath, params.captionsFileName);
	var destinationFilePath = findCaptionsDestinationPath(params);

	console.log('sourceFilePath:', sourceFilePath);
	console.log('destinationFilePath', destinationFilePath);

	// copy captions file into destination
	return copyFile(sourceFilePath, destinationFilePath)
		.catch(function(err) {
			if (err) {
				console.log('Error copying captions to destination:', err);
				error(); // NOTE: If we've failed here we probably haven't copied nothing to destination and that is why we call error().
			}
		})
		.then(function() {
			console.log('Captions successfuly copied to destination.');
			return updateJobStatus()
				.catch(function(err) {
					if (err) {
						console.log('CaptionsToDestination - Error on updateJobStatus:', err);
						// NOTE: We do not call error() on this, else duplicate captions would be copied to destination
						done();
						return Promise.resolve();
					}
				});
		});
}

function findCaptionsDestinationPath(params) {
	// TODO: Find destination path by the given params
	// var destinationPath = '/mnt/kaltura_content/captions/acona_matta.vtt';
	var destinationPath = '/mnt/kaltura_content/20160728/0/0_ervwr6f7_0_83qjoyd1_2.vtt';

	console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	console.log('Currently destination path HARDCODED!');
	console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	return destinationPath;
}

function copyFile(source, target) {
	return new Promise(function(resolve, reject) {
		var rd = fs.createReadStream(source);
		rd.on('error', function(err) {
			reject('ReadStream error on copy captions: \n' + err);
		});
		var wr = fs.createWriteStream(target);
		wr.on('error', function(err) {
			reject('WriteStream error on copy captions: \n' + err);
		});
		wr.on('finish', resolve);
		rd.pipe(wr);
	});
}

function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
