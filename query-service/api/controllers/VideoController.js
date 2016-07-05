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
				if (err) {
					console.log(err);
					next(err);
				}
			});
	}
};

function validateRequest(req) {
	return new Promise(function(reject, resolve) {
		// make sure we have at least one attribute
		if (!req.params || !req.params.fromVideoTime || !req.params.toVideoTime ||
			!req.params.minVideoDuration || !req.params.minVideoDuration || !req.params.copyright ||
			!req.params.minTraceHeight || !req.params.minTraceWidth || !req.params.source ||
			!req.params.boundingPolygon) {
			reject('Empty query is not allowed.');
		}
		resolve(req);
	});
}

function saveQuery(req) {
	return Query.create({
		fromVideoTime: req.params.fromVideoTime,
		toVideoTime: req.params.toVideoTime,
		minVideoDuration: req.params.minVideoDuration,
		maxVideoDuration: req.params.maxVideoDuration,
		copyright: req.params.copyright,
		minTraceHeight: req.params.minTraceHeight,
		minTraceWidth: req.params.minTraceWidth,
		source: req.params.source,
		boundingPolygon: req.params.boundingPolygon
	});
}

function performQuery(query) {
	return ElasticSearchService.searchVideoMetadata(query.polygon)
		.then(function(resp) {
			return Promise.resolve(resp.hits.hits);
		});
}
