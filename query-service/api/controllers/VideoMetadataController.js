/**
 * VideoMetadataController
 *
 * @description :: Server-side logic for managing videometadatas
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird'),
	VideoMetadata = require('replay-schemas/VideoMetadata');

// trick sails to activate resful API to this controller
sails.models.videometadata = {};

module.exports = {
	find: function(req, res, next) {
		validateRequest(req)
			.then(getVideoMetadatas)
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
		if (!req.query || !req.query.videoId) {
			return reject(new Error('Empty query is not allowed.'));
		}

		resolve(req);
	});
}

function getVideoMetadatas(req) {
	var videoId = req.query.videoId;

	// return video's metadatas sorted by descendent creation time
	return VideoMetadata.find({ videoId: videoId }).sort({createdAt: -1});
}
