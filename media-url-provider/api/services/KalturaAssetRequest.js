var request = require('request'),
	parser = require('xml2json'),
	Promise = require('bluebird');
const MANIFEST_SUFFIX = '/manifest.mpd';

function kalturaAssetRequest() {
	var retriveMediaUrlFromKaltura = function (entryId) {
		return new Promise(function(resolve, reject) {
			var server = sails.config.settings.services.kaltura.server,
				port = sails.config.settings.services.kaltura.port,
				partnerId = '/p/' + sails.config.settings.services.kaltura.partnerId + '/sp/0',
				Manifest = '/playManifest/entryId/',
				format = '/format/mpegdash/protocol/http/flavorParamId/1';
			var url = server + ':' + port + partnerId + Manifest + entryId + format;
			console.log('request url to kaltura: ' + url);
			request.get({
				url: url
			}, function(error, response, body) {
				if (error) {
					reject('kaltura service error ' + error);
				}
				resolve(parser.toJson(body));
			});
		});
	};

	var getMpd = function (entryId) {
		if (!entryId) {
			return Promise.reject('must supply entryId');
		}
		return retriveMediaUrlFromKaltura(entryId)
			.then(function(body) {
				var mediaUrls = JSON.parse(body).manifest.media;
				return (mediaUrls[0].url + MANIFEST_SUFFIX);
			})
			.catch(function(err) {
				console.log(err);
			});
	};

	return {
		getMpd: getMpd
	};
}

module.exports = kalturaAssetRequest();
