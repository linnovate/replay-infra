var VideoMetadata = require('replay-schemas/VideoMetadata'),
	Mission = require('replay-schemas/Mission');
var Promise = require('bluebird');
var turf = require('turf-merge');
var logger = require('./service-helper').logger;

module.exports = {

	// function that return a bounding polygon of video
	createBoundingPolygon: function(videoId, startTime, endTime) {
		logger.info('find video in mongo by: %s', videoId);
		// retrive all metada of video from db
		return VideoMetadata.find({ $and: [{ videoId: videoId }, { timestamp: { $gte: startTime, $lte: endTime } }] })
			// pass to merging function of geometries
			.then(mergeMetadataPolygons)
			.catch(function(err) {
				logger.error(err, 'failed retrive video metadata');
				return Promise.reject(err);
			});
	},

	compartmentsBoundingPolygon: function(missionId) {
		logger.info('create mission bounding polygon from videos compartments for id %s', missionId);

		return Mission.findOne({ _id: missionId })
			.then(mergeCompartmentsPolygons)
			.catch(function(err) {
				logger.error(err, 'failed retrive video compartment');
				return Promise.reject(err);
			});
	}
};

// function that merges sensor trace of metadata
function mergeCompartmentsPolygons(mission) {
	logger.info('merging polygons');
	if (!mission) {
		return Promise.reject('No mission found');
	}
	// initiate a GeoJson feature collection
	var polygons = {
		'type': 'FeatureCollection',
		'features': []
	};

	mission.videoCompartments.forEach(function(videoCompartment) {
		// push the videoCompartment to the feature collection
		polygons.features.push({
			'type': 'Feature',
			'geometry': videoCompartment.boundingPolygon
		});
	});
	// merge function of feature collection to polygon or multiPolygon
	var mergedPolygonFeature = turf(polygons);
	if (validateMergedPolygons(mergedPolygonFeature)) {
		return Promise.resolve(mergedPolygonFeature.geometry);
	}
	return Promise.reject('Merged feature object is defected');
}

// function that merges sensor trace of metadata
function mergeMetadataPolygons(metadatas) {
	logger.info('merging polygons');
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

// function for validation of GeoJson feature for boundingPolygon
function validateMergedPolygons(mergedPolygonFeature) {
	return (mergedPolygonFeature.geometry &&
		(mergedPolygonFeature.geometry.type === 'Polygon' || mergedPolygonFeature.geometry.type === 'MultiPolygon'));
}
