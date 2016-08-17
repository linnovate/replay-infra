var rabbit = require('replay-rabbitmq'),
	JobsService = require('replay-jobs-service'),
	Video = require('replay-schemas/Video'),
	Promise = require('bluebird'),
	JobService = require('replay-jobs-service');

var _transactionId;
var _jobStatusTag = 'video-object-saved';

module.exports.start = function(params, error, done) {
	console.log('SaveVideoService started.');

	if (!validateInput(params)) {
		console.log('Some vital parameters are missing.');
		return error();
	}

	_transactionId = params.transactionId;

	// get job, try to save video to mongo if it wasn't done already,
	// then produce the next jobs.
	// after that, wait for all produces to finish successfuly then call done.
	JobService.findOrCreateJobStatus(_transactionId)
		.then(function(jobStatus) {
			return trySaveVideoToMongo(jobStatus, params);
		})
		.then(function(params) {
			return produceJobs(params);
		})
		.all()
		.then(done)
		.catch(function(err) {
			if (err) {
				console.log(err);
				// notify we've failed
				error();
			}
		});
};

function validateInput(params) {
	var relativePathToVideo = params.videoRelativePath;
	var videoName = params.videoName;
	var sourceId = params.sourceId;
	var method = params.receivingMethod;
	var transactionId = params.transactionId;
	var startTime = params.startTime;
	var endTime = params.endTime;

	// validate vital params
	if (!method || !method.standard || !method.version || !transactionId) {
		return false;
	}

	// validate that if there's a video, then all it's params exist
	if ((videoName || relativePathToVideo) && !(videoName && relativePathToVideo && sourceId && startTime && endTime)) {
		return false;
	}

	return true;
}

//  save video to mongo only if we hadn't saved already;
// if we already saved it, just get it from mongo and continue
function trySaveVideoToMongo(jobStatus, params) {
	// case there's a video (sometimes there'd be only metadata)
	if (params.videoName) {
		var videoQuery;

		// check if we've already saved video or not
		if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
			videoQuery = getVideo;
		} else {
			videoQuery = saveVideoToMongo;
		}

		return videoQuery(params)
			.then(function(video) {
				params.video = video;
				return Promise.resolve(params);
			});
	}
	// case no video, just resolve with params
	return Promise.resolve(params);
}

// checking if this object wasn't inserted already (maybe we inserted it and crashed later)
// then inserts to mongo.
function saveVideoToMongo(params) {
	console.log('Saving video object to mongo...');

	return Video
		.create({
			sourceId: params.sourceId,
			relativePath: params.videoRelativePath,
			name: params.videoName,
			receivingMethod: params.receivingMethod,
			jobStatusId: _transactionId,
			startTime: params.startTime,
			endTime: params.endTime
		})
		.then(function(video) {
			console.log('Video successfully saved to mongo:', video);
			// call update job status but don't depend on it's result as we already succeeded in saving video
			updateJobStatus();
			return Promise.resolve(video);
		});
}

function getVideo() {
	return Video
		.findOne({
			jobStatusId: _transactionId
		});
}

// produce all jobs here
function produceJobs(params) {
	return [
		produceMetadataParserJob(params),
		produceUploadToProviderJob(params),
		produceAttachVideoToMetadataJob(params)
	];
	// etc...
}

function produceMetadataParserJob(params) {
	console.log('Producing MetadataParser job...');

	var message = {
		sourceId: params.sourceId,
		videoId: params.video ? params.video.id : undefined, // could be undefined
		dataRelativePath: params.dataRelativePath,
		receivingMethod: params.receivingMethod,
		transactionId: params.transactionId
	};
	var queueName = JobsService.getQueueName('MetadataParser');
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(new Error('Could not find queue name of the inserted job type'));
}

function produceUploadToProviderJob(params) {
	console.log('Producing UploadToProvider job...');

	// upload to provider if video exists
	if (params.videoRelativePath && params.video) {
		var message = {
			videoName: params.videoName,
			videoRelativePath: params.videoRelativePath,
			transactionId: params.transactionId
		};

		var queueName = JobsService.getQueueName('UploadVideoToProvider');
		if (queueName) {
			return rabbit.produce(queueName, message);
		}
		return Promise.reject(new Error('Could not find queue name of the inserted job type'));
	}

	return Promise.resolve();
}

function produceAttachVideoToMetadataJob(params) {
	console.log('Producing AttachVideoToMetadata job...');

	// upload to provider if video exists
	if (params.videoRelativePath && params.video) {
		var message = {
			video: params.video,
			sourceId: params.sourceId,
			transactionId: params.transactionId
		};

		var queueName = JobsService.getQueueName('AttachVideoToMetadata');
		if (queueName) {
			return rabbit.produce(queueName, message);
		}
		return Promise.reject(new Error('Could not find queue name of the inserted job type'));
	}

	return Promise.resolve();
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
