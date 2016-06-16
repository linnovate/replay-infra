var Video = require('schemas/Video'),
	Promise = require('bluebird'),
	KalturaService = require('KalturaService');

module.exports.fetch = function(params) {
    console.log('Kaltura Fetch Service started.');

    if (!validateInput(params)) {
        console.log('Some parameters are missing.');
        return;
    }

    KalturaService.initialize()
    .then(function(){
    	return KalturaService.getVideo(params.providerId);
    })
    .then(updateVideoInMongo)
    .catch(function(err){
    	if(err) console.log(err);
    });
}

function validateInput(params) {
    console.log('Provider id is: ', params.providerId);
    console.log('Video name is: ', params.name);

    if (!params.providerId || !params.name) {
        return false;
    }

    return true;
}


function updateVideoInMongo(kalturaVideo) {
	// update video with the same prefix name
	var query = { name: { $regex: kalturaVideo.name + '.*' }};

	return Video.update(query, {
		provider: 'kaltura',
		providerId: kalturaVideo.id,
		providerData: kalturaVideo,
		status: 'ready'
	});
}
