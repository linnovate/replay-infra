var Classification = require('replay-schemas/Classification'),
	VideoCompartment = require('replay-schemas/VideoCompartment'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video');
// var mongoose = require('mongoose');
var Promise = require('bluebird');
var turf = require('turf-merge');

// *** FOR TESTING ***
// mongoose.Promise = Promise;
// mongoose.connect('mongodb://localhost:27017/replay_dev');
// ***
var cron = require('node-cron');
/*
 # ┌────────────── second (optional)
 # │ ┌──────────── minute
 # │ │ ┌────────── hour
 # │ │ │ ┌──────── day of month
 # │ │ │ │ ┌────── month
 # │ │ │ │ │ ┌──── day of week
 # │ │ │ │ │ │
 # │ │ │ │ │ │
 # * * * * * *
*/
cron.schedule('*/1 * * * *', function() {
	console.log('start ' + Date());

	handleDeletedClassifications();
	handleUpdatedClassifications();
	handleNewClassifications();
});

function handleNewClassifications() {
	getClassificationsByStatus('new')
		.then(function(classifications) {
			classifications.forEach(function(curClassification) {
				getClassificationVideos(curClassification)
					.then(function(videos) {
						setVideoCompartment(curClassification, videos);
					});
			});
		})
		.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
}

function handleDeletedClassifications() {
	getClassificationsByStatus('deleted')
		.then(function(classifications) {
			classifications.forEach(function(curClassification) {
				removeVideoCompartment(curClassification)
					.then(setHandledDeletedStatus(curClassification));
			});
		})
		.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
}

function handleUpdatedClassifications() {
	getClassificationsByStatus('updated')
		.then(function(classifications) {
			classifications.forEach(function(curClassification) {
				removeVideoCompartment(curClassification)
					.then(function() {
						getClassificationVideos(curClassification)
							.then(function(videos) {
								setVideoCompartment(curClassification, videos);
							});
					});
			});
		})
		.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
}

function getClassificationsByStatus(status) {
	console.log('query ' + status + ' classifications');
	return Classification.find({ videoStatus: status });
}

function getClassificationVideos(classificationObj) {
	console.log('get classification video');

	// TODO : understanding the logic of the classification's videos query
	return Video.find({
		$and: [{ endTime: { $gte: classificationObj.startTime } },
			{ endTime: { $lte: classificationObj.endTime } }
		]
	});
}

function attachVideosToClassification(classificationObj, videosArray) {
	console.log('attach videos to Classification ' + classificationObj.missionName);
	return Classification.update({ _id: classificationObj._id }, {
		$set: {
			videoStatus: 'handled'
		}
	}, function(err) {
		console.log(err);
	});
}

function setVideoCompartment(classificationObj, videos) {
	var itemInserted = 0;
	videos.forEach(function(curVideo) {
		console.log('Adding new video compartment');
		addNewVideoCompartment(classificationObj, curVideo)
			.then(function() {
				itemInserted++;
				console.log('item inserted: ' + itemInserted + ' length ' + videos.length);
				if (itemInserted === videos.length) {
					attachVideosToClassification(classificationObj, videos);
				}
			}, function(err) {
				console.log('error while insert video compartment ' + err);
			});
	});
}

function addNewVideoCompartment(classificationObj, videoObj) {
	return prepareCompartmentObject(classificationObj, videoObj)
		.then(function(compartmentObj) {
			console.log('Insert video compartment to the database');
			return compartmentObj.save();
		});
}

function removeVideoCompartment(classificationObj) {
	console.log('Remove video comartment for classification ' + classificationObj.missionName);
	return VideoCompartment.remove({ classificationId: classificationObj._id });
}

function setHandledDeletedStatus(classificationObj) {
	console.log('set handled deleted status to ' + classificationObj.missionName);
	return Classification.update({ _id: classificationObj._id }, { $set: { videoStatus: 'handledDeleted' } }, function(err) {
		console.log(err);
	});
}

function prepareCompartmentObject(classificationObj, videoObj) {
	return createBoundingPolygon(videoObj._id)
		.then(function(boundingPolygon) {
			var compartmentObj = new VideoCompartment();
			compartmentObj.boundingPolygon = boundingPolygon;
			var startAsset = calculateStartAsset(classificationObj.startTime, videoObj.startTime);
			var duration = calculateDuration(classificationObj.endTime, videoObj, startAsset);
			compartmentObj.videoId = videoObj._id;
			compartmentObj.classificationId = classificationObj._id;
			compartmentObj.startTime = getMaximumDate(new Date(classificationObj.startTime),
				new Date(videoObj.startTime));
			compartmentObj.endTime = getMinimumDate(new Date(classificationObj.endTime),
				new Date(videoObj.endTime));
			compartmentObj.startAsset = startAsset;
			compartmentObj.duration = duration;
			return Promise.resolve(compartmentObj);
		});
}

function calculateDuration(classificationEnd, videoObj, startAsset) {
	console.log(classificationEnd);
	console.log(videoObj.endTime);

	var duration = new Date(classificationEnd) - new Date(videoObj.endTime);
	if (duration > 0) {
		return videoObj.durationInSeconds - startAsset;
	}
	return videoObj.durationInSeconds - startAsset + duration;
}

function calculateStartAsset(classificationStart, videoStart) {
	var asset = new Date(classificationStart) - new Date(videoStart);
	if (asset > 0) {
		// Convert millisecond to second
		return asset / 1000;
	}

	return 0;
}

function getMaximumDate(firstDate, secondDate) {
	if (firstDate > secondDate) {
		return firstDate;
	}
	return secondDate;
}

function getMinimumDate(firstDate, secondDate) {
	if (firstDate < secondDate) {
		return firstDate;
	}
	return secondDate;
}

// function for validation of GeoJson feature for boundingPolygon
function validateMergedPolygons(mergedPolygonFeature) {
	return (mergedPolygonFeature.geometry &&
		(mergedPolygonFeature.geometry.type === 'Polygon' || mergedPolygonFeature.geometry.type === 'MultiPolygon'));
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
	var mergedPolygonFeature = turf(polygons);
	if (validateMergedPolygons(mergedPolygonFeature)) {
		return Promise.resolve(mergedPolygonFeature.geometry);
	}
	return Promise.reject('Merged feature object is defected');
}
