/**
 * MediaController
 *
 * @description :: Server-side logic for managing media
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird'),
	Video = require('replay-schemas/Video');

module.exports = {
	findOne: function(req, res, next) {
		var id = req.params.id;
		getVideo(id)
			.then(function(video) {
				return WowzaService.getMpd(video.providerId);
			})
			.then(function(mpd) {
				// res.setHeader('Content-Type', 'application/dash+xml');
				res.json({ url: mpd });
			})
			.catch(function(err) {
				if (err) {
					console.log(err);
					return res.badRequest(err);
				}

				res.serverError('There was an unexpected error retrieving mpd file.');
			});
	}
};

function getVideo(id) {
	return Video
		.findOne({ _id: id })
		.then(function(video) {
			if (!video) {
				return Promise.reject('Video does not exist');
			}
			return Promise.resolve(video);
		})
		.catch(function(err) {
			Promise.reject(err);
		});
}
