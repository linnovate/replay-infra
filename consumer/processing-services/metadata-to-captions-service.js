var fs = require('fs'),
	path = require('path');

var Promise = require('bluebird'),
	JobsService = require('replay-jobs-service'),
	Video = require('replay-schemas/Video'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	S3 = require('replay-aws-s3');

const LAST_CAPTIONS_TIME = 1; // in seconds

var _transactionId;
var _jobStatusTag = 'created-captions-from-metadata';

// wrap the fs.writeFile nodeFunction to return a promise instead of taking a callback
// var fsWriteFile = Promise.promisify(fs.outputFile);
var fse = Promise.promisifyAll(require('fs-extra'));

module.exports.start = function(params, error, done) {
	console.log('MetadataToCaptions service started.');

	if (!validateInput(params)) {
		console.log('MetadataToCaptions - Some vital parameters are missing.');
		return error();
	}
	_transactionId = params.transactionId;

	// Make sure we haven't done this job already
	JobsService.findJobStatus(_transactionId)
		.then(function(jobStatus) {
			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
				// case we've already performed the action, ack the message
				return Promise.resolve();
			}
			return performCaptionsChain(params)
				.then(updateJobStatus);
		})
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
	console.log('Storage path:', process.env.STORAGE_PATH);
	console.log('Transaction id:', params.transactionId);
	console.log('Video id:', params.videoId);

	// validate params
	if (!process.env.STORAGE_PATH || !params.transactionId || !params.videoId) {
		return false;
	}
	return true;
}

function performCaptionsChain(params) {
	return getVideoMetadatas(params.videoId)
		.then(function(metadatas) {
			if (metadatas && metadatas.length > 0) {
				return getCaptionsPath(params.videoId)
					.then(createCaptionsDirectory)
					.then(function(captionsPath) {
						return createCaptions(metadatas, captionsPath);
					})
					.then(uploadToS3)
					.then(rmDir)
					.catch(function(err) {
						return Promise.reject(err);
					});
			}
			// else:
			console.log('MetadataToCaptions - No metadatas found.');
			return Promise.resolve();
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

function getVideoMetadatas(videoId) {
	// retrieve all video's metadatas from db
	console.log('find metadatas in mongo by videoId: ', videoId);
	// return the metadatas sorted by descendant timestamp
	return VideoMetadata.find({ videoId: videoId }).sort('timestamp');
}

function getCaptionsPath(videoId) {
	console.log('find video in mongo by videoId: ', videoId);
	return Video.findById(videoId)
		.then(function(video) {
			if (video) {
				var captionsFileName = video.baseName + '.vtt';
				var captionsPath = path.join(video.contentDirectoryPath, captionsFileName);
				return Promise.resolve(captionsPath);
			}
			// else:
			return Promise.reject(new Error('No video found!'));
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

function createCaptionsDirectory(captionsPath) {
	var captionsDirectory = path.join(process.env.STORAGE_PATH, path.dirname(captionsPath));
	return fse.mkdirpAsync(captionsDirectory)
		.then(function() {
			console.log('Captions directory %s successfully created', captionsDirectory);
			return Promise.resolve(captionsPath);
		})
		.catch(function(err) {
			console.error('Unable to create %s directory: %s', captionsDirectory, err);
			return Promise.reject(err);
		});
}

function createCaptions(metadatas, captionsPath) {
	try {
		var startTime, endTime, timeDiff, baseTimestamp, currentTimestamp, timeLine;

		endTime = getFormatedTime(new Date(0));
		baseTimestamp = new Date(metadatas[0].timestamp);

		var captionsFullPath = path.join(process.env.STORAGE_PATH, captionsPath);
		var captionsWriteStream = fs.createWriteStream(captionsFullPath, { flags: 'a' });

		metadatas.forEach(function(item, index) {
			startTime = endTime;
			if (index < (metadatas.length - 1)) {
				currentTimestamp = new Date(metadatas[index + 1].timestamp);
				timeDiff = getTimeDiff(currentTimestamp, baseTimestamp);
			} else {
				timeDiff.setSeconds(timeDiff.getSeconds() + LAST_CAPTIONS_TIME);
			}
			endTime = getFormatedTime(timeDiff);
			timeLine = startTime + '-->' + endTime;

			captionsWriteStream.write(timeLine + '\n' + JSON.stringify(item) + '\n\n');
		});
		captionsWriteStream.end();
		console.log('Captions file %s created successfully!', captionsFullPath);
		return Promise.resolve(captionsPath);
	} catch (err) {
		return Promise.reject(err);
	}
}

function getFormatedTime(time) {
	return (time.getUTCMinutes() + ':' + time.getUTCSeconds() + '.' + time.getUTCMilliseconds());
}

function getTimeDiff(currentTimestamp, baseTimestamp) {
	if (!currentTimestamp || !baseTimestamp) {
		throw new Error('Error! missing params (in function getTimeDiff)');
	}
	var timeDiff = Math.abs(currentTimestamp.getTime() - baseTimestamp.getTime());
	return new Date(timeDiff);
}

function uploadToS3(captionsPath) {
	var filePath = path.join(process.env.STORAGE_PATH, captionsPath);
	var bucket = process.env.AWS_BUCKET;
	var key = captionsPath;

	return S3.uploadFile(filePath, bucket, key)
		.then(function() {
			console.log('Captions successfully uploaded to S3');
			return Promise.resolve(captionsPath);
		})
		.catch(function(err) {
			console.error('Unable to uploaded Captions to S3:', err);
			return Promise.reject(err);
		});
}

function rmDir(captionsPath) {
	var dirPath = path.join(process.env.STORAGE_PATH, path.dirname(captionsPath));
	return fse.removeAsync(dirPath)
		.then(function() {
			console.log('Directory %s successfully removed from the file system', dirPath);
			return Promise.resolve();
		})
		.catch(function(err) {
			console.error('Unable to removed %s directory from the file system: %s', dirPath, err);
			return Promise.reject(err);
		});
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
