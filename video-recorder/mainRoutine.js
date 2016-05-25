var mongoose = require('mongoose'),
    VideoParams = require('./schemas/VideoParams'),
    FFmpegService = require('./services/FFmpegService');

module.exports = function() {
    console.log("Video recorder service is up.");
    console.log('Mongo host:', process.env.MONGO_HOST);
    console.log('Mongo port:', process.env.MONGO_PORT);
    console.log('Mongo database:', process.env.MONGO_DATABASE);
    console.log('Files storage path: ', process.env.STORAGE_PATH);
    
    // index used to find my videoParams object in the DB collection
    var videoParamsIndex = process.env.INDEX;

    getVideoParams(videoParamsIndex)
        .then(handleVideoSavingProcess)
        .catch(function(err) {
            if (err) console.log(err);
        });
}

// fetches videoParam object from DB
function getVideoParams(index) {

    mongoose.connect('mongodb://' + process.env.MONGO_HOST + ':' + process.env.MONGO_PORT + '/' + process.env.MONGO_DATABASE);

    return VideoParams.find()
        .then(function(videoParams) {
            // make sure videoParams exist and also our object at the specified index
            if (!videoParams)
                return Promise.reject("VideoParams does not exist in DB");
            else if (!videoParams[index])
                return Promise.reject("VideoParams has no object at index ", index);

            return Promise.resolve(videoParams[index]);
        })
}

function handleVideoSavingProcess(videoParam) {
    console.log("Video param is: ", videoParam);
    var service;

    // check in which standard we work and load appropriate service
    if (videoParam.receivingMethod.standard == 'TekenHozi' &&
        videoParam.receivingMethod.version == '1.0') {
    	service = require('./services/VideoStandardServices/TekenHozi/v1.0');
    } else if (videoParam.receivingMethod.standard == 'TekenHozi' &&
        videoParam.receivingMethod.version == '0.9') {
    	service = require('./services/VideoStandardServices/TekenHozi/v0.9');
    }

    service.start(videoParam.karonId, videoParam.receivingParams);
}
