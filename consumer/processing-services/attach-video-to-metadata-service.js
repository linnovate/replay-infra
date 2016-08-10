// This service can be called whenever we recieve an unmuxed data,
// in order to find the metadata's videoId.
// However there's a chance that the metadata will be received before the
// video was saved, so we would also be invoked every time there's a new video,
// in order to check if this video had a metadata before that we didn't take care of.

var VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video'),
	JobsService = require('replay-jobs-service'),
	_ = require('lodash'),
	Promise = require('bluebird');

var _transactionId;
var _jobStatusTag = 'attach-video-to-metadata';

module.exports.start = function(params, error, done) {
	console.log('AttachVideoToMetadata service started.');

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
			return attachVideoToMetadata(params);
		})
		.then(function() {
			console.log('Calling done and updating job status...');
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
	// we always need transactionId and sourceId
	if (!params.transactionId || !params.sourceId) {
		return false;
	}

	// we might receive video metadatas or video
	if (params.metadatas || params.video) {
		return true;
	}

	return false;
}

function attachVideoToMetadata(params) {
	console.log('Starting process of attaching a video to it\'s metadatas...');
	// case we received video metadatas
	if (params.metadatas && params.metadatas.length > 0) {
		console.log('We recieved metadatas...');
		// group by sourceId, then sort each group by ascending timestamp.
		// now match videos to each of the created groups
		return groupBySourceId(params.metadatas)
			.then(sortByAscendingTimestamp)
			.then(matchVideosToGroups)
			.then(produceMetadataToMongoJob);
	}
	// case we receieved video
	else {
		// we only handle VideoStandard 0.9 videos
		if (params.video.receivingMethod.method === 'VideoStandard' &&
			params.video.receivingMethod.version === '0.9') {
			console.log('Video is in VideoStandard 0.9, updating it\'s metadatas...');
			// update all metadatas of the video with the videoId
			return updateMetadatasWithVideoId(params.video);
		}
	}

	// we done nothing, resolve
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

function updateMetadatasWithVideoId(video) {
	return VideoMetadata.update({
		timestamp: {
			$gte: video.startTime,
			$lte: video.endTime,
		},
		videoId: null,
		sourceId: video.sourceId,
	}, { videoId: video.id }, { multi: true });
}

function groupBySourceId(metadatas) {
	return _.groupBy(metadatas, 'sourceId');
}

function sortByAscendingTimestamp(aggregatedMetadatas) {
	return new Promise(function(resolve, reject) {
		for (var sourceId in aggregatedMetadatas) {
			aggregatedMetadatas.sourceId = _.sortBy(aggregatedMetadatas.sourceId, 'timestamp');
		}

		resolve(aggregatedMetadatas);
	});
}

// find the videos of each group (may be more than 1 for each group)
// and update the video metadatas accordingly
function matchVideosToGroups(aggregatedMetadatas) {
	return new Promise(function(resolve, reject) {
		for (var sourceId in aggregatedMetadatas) {
			// extract group metadatas
			var metadatas = aggregatedMetadatas.sourceId;

			// find start & end time of the group
			var groupStartTime = metadatas[0].timestamp;
			var groupEndTime = metadatas[metadatas.length - 1].timestamp;

			// find matching videos, select relevant fields and sort by ascending endTime
			Video.find({
					startTime: {
						$gte: groupStartTime
					},
					endTime: {
						$lte: groupEndTime
					},
					sourceId: sourceId
				})
				.select('endTime sourceId')
				.sort('endTime')
				.then(function(videos) {
					return matchVideosToGroup(videos, metadatas);
				})
				.catch(function(err) {
					if (err) {
						console.log('Failed finding videos in order to match against aggregations.');
						reject(err);
					}
				});
		}
	});
}

function matchVideosToGroup(videos, metadatas) {
	return new Promise(function(resolve, reject) {
		// case we don't have videos, just reject
		if (!videos || videos.length == 0) {
			return reject();
		}

		// loop through metadatas and find each one's corresponding video
		for (var metadata in metadatas) {
			var video = videos.pop();
			if (metadata.timestamp < video.endTime) {
				metadata.videoId = video.id;
			}
		}
	});
}

function produceMetadataToMongoJob(videoMetadatas) {
	var jobName = 'MetadataToMongo';
	console.log('Producing %s job...', jobName);
	var message = {
		transactionId: _transactionId,
		metadatas: videoMetadatas
	};
	var queueName = JobsService.getQueueName(jobName);
	if (queueName) {
		return rabbit.produce(queueName, message);
	}
	return Promise.reject(new Error('Could not find queue name of the inserted job type'));
}
