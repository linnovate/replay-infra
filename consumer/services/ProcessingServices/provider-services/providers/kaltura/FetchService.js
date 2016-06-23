var Video = require('replay-schemas/Video'),
	Promise = require('bluebird'),
	KalturaService = require('replay-kaltura-service');

module.exports.fetch = function(params) {
    console.log('Kaltura Fetch Service started.');

    if (!validateInput(params)) {
        console.log('Some parameters are missing.');
        return;
    }

    KalturaService.initialize()
    .then(function(){
        console.log("KalturaService initialized.");
        console.log("Getting video object from kaltura...");

    	return KalturaService.getVideo(params.providerId);
    })
    .then(updateVideoInMongo)
    .then(confirmUpdate)
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
    console.log("Updating video in mongo with the data from Kaltura...");

	// update video with the same prefix name
	var query = { name: { $regex: kalturaVideo.name + '.*' }};

	return Video.update(query, {
		provider: 'kaltura',
		providerId: kalturaVideo.id,
		providerData: kalturaVideo,
		status: 'ready'
	});
}

function confirmUpdate(video){
    if(video)
        console.log("Update in mongo succeeded.");
    else
        console.log("Update in mongo failed for some reason.");
}
