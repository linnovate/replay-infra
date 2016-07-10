/**
 * VideoController
 *
 * @description :: Server-side logic for managing videos
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird'),
	Query = require('replay-schemas/Query');

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
		if (!req.query || (req.query && !hasAnyQueryParam(req.query))) {
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
			coordinates: JSON.parse(req.query.boundingShapeCoordinates)
		}
	});
}

function performQuery(query) {
	console.log('query in perform query: ', query);
	return ElasticSearchService.searchVideoMetadata(query.boundingShape.coordinates)
		.then(function(resp) {
			return Promise.resolve(resp.hits.hits);
		});
}
