/**
 * SourceController
 *
 * @description :: Server-side logic for managing sources
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var Promise = require('bluebird'),
	StreamingSource = require('replay-schemas/StreamingSource');

// trick sails to activate restful API to this controller
sails.models.source = {};

module.exports = {
	find: function(req, res, next) {
		validateFindRequest(req)
			.then(getStreamingSources)
			.then(function(results) {
				return res.json(results);
			})
			.catch(function(err) {
				return res.serverError(err);
			});
	}
};

function validateFindRequest(req) {
	return new Promise(function(resolve, reject) {
		// right now we have nothing to validate
		resolve(req);
	});
}

function getStreamingSources(req) {
	return StreamingSource.find({}).select('sourceID sourceName _id').sort({ sourceName: 1 });
}
