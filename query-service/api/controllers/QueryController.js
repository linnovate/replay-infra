/**
 * QueryController
 *
 * @description :: Server-side logic for managing queries
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird'),
	Query = require('replay-schemas/Query');

// trick sails to activate resful API to this controller
sails.models.query = {};

module.exports = {
	find: function(req, res, next) {
		validateRequest(req)
			.then(getQueries)
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
		// right now we have nothing to validate
		resolve(req);
	});
}

function getQueries(req) {
	var limitAmount = req.query.limit;

	// fetch all queries and sort by descending order
	var query = Query.find({}).sort({ createdAt: -1 });
	// if limitAmount is set, limit the amount returned.
	if (limitAmount) {
		query = query.limit(limitAmount);
	}
	return query.exec();
}
