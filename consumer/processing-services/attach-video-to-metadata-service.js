// This service can be called whenever we recieve an unmuxed data,
// in order to find the metadata's videoId.
// However there's a chance that the metadata will be received before the
// video was saved, so we would also be invoked every time there's a new video,
// in order to check if this video had a metadata before that we didn't take care of.

var VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video'),
	JobsService = require('replay-jobs-service'),
	_ = require('lodash'),
	rabbit = require('replay-rabbitmq'),
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
		console.log('Recieved metadatas...');
		// group by sourceId, then sort each group by ascending timestamp.
		// now match videos to each of the created groups
		return groupBySourceId(params.metadatas)
			.then(sortByAscendingTimestamp)
			.then(matchVideosToGroups)
			.then(flattenAggregatedMetadatas)
			.then(produceMetadataToMongoJob);
	}
	// case we receieved video
	console.log('Recieved video...');
	// we only handle VideoStandard 0.9 videos
	if (params.video.receivingMethod.standard === 'VideoStandard' &&
		params.video.receivingMethod.version === '0.9') {
		console.log('Video is in VideoStandard 0.9, updating it\'s metadatas...');
		// update all metadatas of the video with the videoId
		return updateMetadatasWithVideoId(params.video);
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

// update metadatas of the video with the video id.
// update is done by making sure the metadatas are:
// 1. in the time of the video
// 2. have the same sourceId
// 3. have no videoId
function updateMetadatasWithVideoId(video) {
	return VideoMetadata
		.update({
			timestamp: {
				$gte: video.startTime,
				$lte: video.endTime
			},
			videoId: null,
			sourceId: video.sourceId
		}, { videoId: video.id }, { multi: true })
		.then(function(res) {
			console.log('Updated %s metadatas.', res.n);
		});
}

function groupBySourceId(metadatas) {
	console.log('Grouping metadatas by source id...');
	return Promise.resolve(_.groupBy(metadatas, 'sourceId'));
}

function sortByAscendingTimestamp(aggregatedMetadatas) {
	console.log('Sorting aggregated metadatas by ascending timestamp...');
	return new Promise(function(resolve, reject) {
		// loop on aggregatedMetadatas sourceId: metadatas aggregations
		for (var i = 0, keys = Object.keys(aggregatedMetadatas); i < keys.length; i++) {
			var sourceId = keys[i];
			aggregatedMetadatas[sourceId] = _.sortBy(aggregatedMetadatas[sourceId], 'timestamp');
		}

		resolve(aggregatedMetadatas);
	});
}

// find the videos of each group (may be more than 1 for each group)
// and update the video metadatas accordingly
function matchVideosToGroups(aggregatedMetadatas) {
	console.log('Matching videos to groups...');

	var videoPromises = [];
	var sourceIds = Object.keys(aggregatedMetadatas);
	// loop on aggregatedMetadatas sourceId: metadatas aggregations
	_.forEach(sourceIds, function(sourceId) {
		// extract group metadatas
		var metadatas = aggregatedMetadatas[sourceId];

		// find start & end time of the group
		var groupStartTime = metadatas[0].timestamp;
		var groupEndTime = metadatas[metadatas.length - 1].timestamp;

		// find matching videos, select relevant fields and sort by ascending endTime
		// NOTE: videos belongs to this metadata chunk if their start time is between the start & end time of this chunk
		// later on, we will match every metadata to a video by checking if the metadata timestamp is smaller than the video end time
		videoPromises.push(
			Video
			.find({
				startTime: {
					$gte: groupStartTime,
					$lte: groupEndTime
				},
				sourceId: sourceId
			})
			.select('endTime sourceId')
			.sort('endTime')
			.then(function(videos) {
				return matchVideosToGroup(videos, metadatas);
			})
		);
	});

	return Promise.all(videoPromises)
		.then(function() {
			return aggregatedMetadatas;
		});
}

// match videos to a group of metadatas.
// the videos are all the videos that their start time is between the metadatas chunk start & end times.
// then, we will iterate on each metadata (they're sorted by timestamp), and match the metadata to a video
// whose endTime is bigger than the timestamp of the metadata, means, the metadata belongs to him.
// when the next metadata timestamp is after the current video end time, we will move to the next video.
function matchVideosToGroup(videos, metadatas) {
	return new Promise(function(resolve, reject) {
		// case we don't have videos, just resolve and continue
		if (!videos || videos.length === 0) {
			return resolve();
		}

		// loop through metadatas and find each one's corresponding video
		var video = videos.pop();
		for (var i = 0; i < metadatas.length; i++) {
			var metadata = metadatas[i];
			if (metadata.timestamp <= video.endTime) {
				metadata.videoId = video.id;
			} else {
				video = videos.pop();
				i--;
				// case we've finished videos, break the loop
				if (!video) {
					break;
				}
			}
		}

		resolve();
	});
}

// reduce aggregated metadatas in form sourceId: [metadatas] to list of metadatas
function flattenAggregatedMetadatas(aggregatedMetadatas) {
	return _.reduce(aggregatedMetadatas, function(result, value, key) {
		// concat value which is list of metadatas
		result = result.concat(value);
		return result;
	}, []);
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
