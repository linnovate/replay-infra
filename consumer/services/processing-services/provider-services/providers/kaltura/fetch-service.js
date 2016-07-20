var Video = require('replay-schemas/Video'),
	KalturaService = require('replay-kaltura-service');

module.exports.fetch = function(params, err, done) {
	console.log('Kaltura Fetch Service started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		done();
	}

	KalturaService.initialize()
		.then(function() {
			console.log('KalturaService initialized.');
			console.log('Getting video object from kaltura...');

			return KalturaService.getVideo(params.providerId);
		})
		.then(updateVideoInMongo)
		.then(confirmUpdate)
		.then(done)
		.catch(function(err) {
			if (err) {
				console.log(err);
				err();
			}
		});
};

function validateInput(params) {
	console.log('Provider id is: ', params.providerId);
	console.log('Video name is: ', params.name);

	if (!params.providerId || !params.name) {
		return false;
	}

	return true;
}

function updateVideoInMongo(kalturaVideo) {
	console.log('Updating video in mongo with the data from Kaltura...');

	// update video with the same prefix name
	var query = { name: { $regex: kalturaVideo.name + '.*' } };

	return Video.update(query, {
		provider: 'kaltura',
		providerId: kalturaVideo.id,
		providerData: kalturaVideo,
		status: 'ready'
	});
}

function confirmUpdate(video) {
	if (video) {
		console.log('Update in mongo succeeded.');
		return Promise.resolve();
	}

	console.log('Update in mongo failed for some reason.');
	return Promise.reject();
}
