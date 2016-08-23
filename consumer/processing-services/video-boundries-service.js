var Video = require('replay-schemas/Video'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	JobsService = require('replay-jobs-service'),
	turf = require('turf-merge');

const _jobStatusTag = 'added-video-bounding-polygon-to-mongo';

module.exports.start = function(params, error, done) {
	console.log('Video Boundries service started.');
	var _transactionId, _videoId;
	// throw error for no video or job
	if (validateParams(params)) {
		_transactionId = params.transactionId; // Queue job identifier
		_videoId = params.videoId; // Video to bound
	} else {
		console.log('Some parameters are missing.');
		return error();
	}
	// Retrive Job object by id
	JobsService.findJobStatus(_transactionId)
		// Make sure we haven't performed this job already
		.then(validateJob)
		.then(function() {
			// Return a bounding polygon
			return createBoundingPolygon(_videoId);
		})
		.then(function(mergedPolygon) {
			console.log('got merged polygon');
			// Save bounding polygon to video object in db
			return saveToMongo(mergedPolygon, _videoId);
		})
		.catch(function(err) {
			console.log(err);
			error();
		})
		.then(function() {
			done();
			console.log('finished Job sucessfuly');
			// Notify for job complete
			return updateJobStatus(_transactionId);
		});
};

function validateParams(params) {
	if (params.transactionId && params.videoId) {
		return true;
	}
	return false;
}

// function for validating job operation
function validateJob(jobStatus) {
	console.log('Validating job');
	if (!jobStatus || jobStatus.statuses.indexOf(_jobStatusTag) > -1) {
		// case we've already performed the action, ack the message
		return Promise.reject('Action executed before');
	}
	return Promise.resolve();
}

// function that return a bounding polygon of video
function createBoundingPolygon(videoId) {
	console.log('find video in mongo by: ' + videoId);
	// retrive all metada of video from db
	return VideoMetadata.find({ videoId: videoId })
		// pass to merging function of geometries
		.then(mergeMetadataPolygons)
		.catch(function(err) {
			console.log('failed retrive video metadata: ');
			return Promise.reject(err);
		});
}

// function that merges sensor trace of metadata
function mergeMetadataPolygons(metadatas) {
	console.log('merging polygons');
	if (!metadatas) {
		return Promise.reject('No metadatas found');
	}
	// initiate a GeoJson feature collection
	var polygons = {
		'type': 'FeatureCollection',
		'features': []
	};
	metadatas.forEach(function(metadata) {
		// push the metadata to the feature collection
		polygons.features.push({
			'type': 'Feature',
			'geometry': metadata.sensorTrace
		});
	});
	// merge function of feature collection to polygon or multiPolygon
	var mergedPolygon = turf(polygons);
	return Promise.resolve(mergedPolygon);
}

// save to mongo bounding polygon by video ID
function saveToMongo(polygon, videoId) {
	// insert only if we have metadatas
	if (polygon !== undefined && videoId !== undefined) {
		// update video object in mongo by id
		return Video.update({ _id: videoId }, { boundingPolygon: polygon })
			.then(function(affected) {
				console.log(affected + 'documents affected');
				return Promise.resolve();
			})
			.catch(function(err) {
				return Promise.reject('video object doesnt exists' + err);
			});
	}
}

// update the job with the appropriate status
function updateJobStatus(_transactionId) {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag);
}
