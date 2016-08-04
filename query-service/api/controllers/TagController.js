/**
 * TagController
 *
 * @description :: Server-side logic for managing tags
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var Promise = require('bluebird'),
	Tag = require('replay-schemas/Tag');

// trick sails to activate restful API to this controller
sails.models.tag = {};

module.exports = {
	find: function(req, res, next) {
		validateFindRequest(req)
			.then(getTags)
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

function getTags(req) {
	return Tag.find({}).sort({ title: 1 });
}
