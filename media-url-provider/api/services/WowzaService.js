var request = require('request'),
	parser = require('xml2json'),
	Promise = require('bluebird');
const MANIFEST_SUFFIX = '/manifest.mpd';

module.exports = {
	getMpd: function(entryId) {
		return retriveMediaUrlFromKaltura(entryId)
			.then(function(body) {
				var mediaUrls = JSON.parse(body).manifest.media;
				return (mediaUrls[0].url + MANIFEST_SUFFIX);
			})
			.catch(function(err) {
				console.log(err);
			});
	}
};

function retriveMediaUrlFromKaltura(entryId) {
	return new Promise(function(resolve, reject) {
		var server = 'http://vod.linnovate.net',
			partnerId = '/p/101/sp/0',
			Manifest = '/playManifest/entryId/',
			format = '/format/mpegdash/protocol/http/flavorParamId/1';
		var url = server + partnerId + Manifest + entryId + format;
		console.log('request url to kaltura: ' + url);
		request.get({
			url: url
		}, function(error, response, body) {
			if (error) {
				reject(error);
			}
			resolve(parser.toJson(body));
		});
	});
}
