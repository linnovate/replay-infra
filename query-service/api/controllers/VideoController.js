/**
 * VideoController
 *
 * @description :: Server-side logic for managing videos
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird');

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
			reject(new Error('Empty query is not allowed.'));
		}
		resolve(req);
	});
}

// make sure we have at least one query param
function hasAnyQueryParam(query) {
	if (query.fromVideoTime || query.toVideoTime ||
		query.minVideoDuration || query.minVideoDuration || query.copyright ||
		query.minTraceHeight || query.minTraceWidth || query.source ||
		query.boundingPolygon) {
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
		boundingPolygon: req.query.boundingPolygon
	});
}

function performQuery(query) {
	return ElasticSearchService.searchVideoMetadata(query.polygon)
		.then(function(resp) {
			return Promise.resolve(resp.hits.hits);
		});
}
