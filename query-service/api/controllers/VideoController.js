/**
 * VideoController
 *
 * @description :: Server-side logic for managing videos
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird'),
	elasticsearch = require('replay-elastic'),
	ObjectId = require('mongoose').Types.ObjectId,
	Query = require('replay-schemas/Query'),
	Video = require('replay-schemas/Video');

// trick sails to activate restful API to this controller
sails.models.video = {};

module.exports = {

	find: function(req, res, next) {
		validateRequest(req)
			.then(saveQuery)
			.then(performQuery)
			.then(function(results) {
				return res.json(results);
			})
			.catch(function(err) {
				return res.serverError(err);
			});
	}
};

function validateRequest(req) {
	return new Promise(function(resolve, reject) {
		// make sure we have at least one attribute
		if (!req.query) {
			return reject(new Error('Empty query is not allowed.'));
		}
		// validate boundingShapeCoordinates is JSON parsable (since the array would be passed as string)
		else if (req.query && req.query.boundingShapeCoordinates) {
			try {
				JSON.parse(req.query.boundingShapeCoordinates);
			} catch (e) {
				return reject(new Error('boundingShapeCoordinates is not parsable.'));
			}
		}

		resolve(req);
	});
}

// make sure we have at least one query param
function hasAnyQueryParam(query) {
	if (query.fromVideoTime || query.toVideoTime ||
		query.minVideoDuration || query.minVideoDuration || query.copyright ||
		query.minTraceHeight || query.minTraceWidth || query.source ||
		(query.boundingShapeType && query.boundingShapeCoordinates)) {
		return true;
	}
}

function saveQuery(req) {
	var coordinates;
	if (req.query.boundingShapeCoordinates) {
		coordinates = JSON.parse(req.query.boundingShapeCoordinates);
	}

	return Query.create({
		fromVideoTime: req.query.fromVideoTime,
		toVideoTime: req.query.toVideoTime,
		minVideoDuration: req.query.minVideoDuration,
		maxVideoDuration: req.query.maxVideoDuration,
		copyright: req.query.copyright,
		minTraceHeight: req.query.minTraceHeight,
		minTraceWidth: req.query.minTraceWidth,
		source: req.query.source,
		boundingShape: {
			type: req.query.boundingShapeType,
			coordinates: coordinates
		}
	});
}

function performQuery(query) {
	if (query.boundingShape.coordinates) {
		return elasticsearch.searchVideoMetadata(query.boundingShape.coordinates)
			.then(function(resp) {
				return getVideosOfMetadatas(resp.hits.hits);
			})
			.then(function(videos) {
				return Promise.resolve(videos);
			});
	} else {
		return getAllVideos();
	}
}

function elasticHitsToIdList(elasticHits) {
	return _.map(elasticHits, function(hit) {
		return new ObjectId(hit._source.videoId);
	});
}

function removeDuplicateHits(elasticHits) {
	return _.uniq(elasticHits, function(hit) {
		return hit.videoId;
	});
}

function getVideosOfMetadatas(elasticHits) {
	// remove duplicate entries
	var ids = removeDuplicateHits(elasticHits);
	// convert to list of ObjectId
	ids = elasticHitsToIdList(ids);
	return Video.find({
		_id: {
			$in: ids
		},
		status: 'ready'
	});
}

function getAllVideos() {
	return Video.find({ status: 'ready' });
}
