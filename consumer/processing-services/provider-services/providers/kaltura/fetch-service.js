// DEPRECATED FEATURE

// var Video = require('replay-schemas/Video'),
// 	KalturaService = require('replay-kaltura-service'),
// 	JobService = require('replay-jobs-service');

// var _transactionId;
// var _jobStatusTag = 'fetched-from-kaltura';

// module.exports.fetch = function(params, error, done) {
// 	console.log('Kaltura Fetch Service started.');

// 	if (!validateInput(params)) {
// 		console.log('Some parameters are missing.');
// 		return error();
// 	}

// 	getVideo(params.videoName)
// 		.then(function(video) {
// 			_transactionId = video.jobStatusId;
// 			return JobService.findJobStatus(_transactionId);
// 		})
// 		.then(function(jobStatus) {
// 			if (jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
// 				// case we've already performed the action, ack the message
// 				return Promise.resolve();
// 			}
// 			return performFetchChain(params);
// 		})
// 		.then(function() {
// 			done();
// 		})
// 		.catch(function(err) {
// 			if (err) {
// 				console.log(err);
// 				error();
// 			}
// 		});
// };

// function validateInput(params) {
// 	console.log('Provider id is: ', params.providerId);
// 	console.log('Video name is: ', params.videoName);

// 	if (!params.providerId || !params.videoName) {
// 		return false;
// 	}

// 	return true;
// }

// // Initialize kaltura, get the video data from it, then update the
// // video object in mongo.
// function performFetchChain(params) {
// 	return KalturaService.initialize()
// 		.then(function() {
// 			console.log('KalturaService initialized.');
// 			console.log('Getting video object from kaltura...');

// 			return KalturaService.getVideo(params.providerId);
// 		})
// 		.then(function(kalturaVideo) {
// 			return updateVideoInMongo(kalturaVideo, params.videoName);
// 		})
// 		.then(confirmUpdate);
// }

// function getVideo(videoName) {
// 	var query = { name: { $regex: videoName + '.*' } };
// 	return Video.findOne(query);
// }

// function updateVideoInMongo(kalturaVideo, videoName) {
// 	console.log('Updating video in mongo with the data from Kaltura...');

// 	// update video with the same name
// 	var query = { name: { $regex: videoName + '.*' } };

// 	return Video.update(query, {
// 		provider: 'kaltura',
// 		providerId: kalturaVideo.id,
// 		providerData: kalturaVideo,
// 		status: 'ready'
// 	});
// }

// function confirmUpdate(video) {
// 	if (video) {
// 		console.log('Update in mongo succeeded.');
// 		return Promise.resolve();
// 	}

// 	console.log('Update in mongo failed for some reason.');
// 	return Promise.reject();
// }
