var BusService = require('BusService'),
    JobsService = require('JobsService'),
    Video = require('schemas/Video'),
    Promise = require('bluebird');

module.exports.start = function(params) {
    console.log('SaveVideoService started.');

    if (!validateInput(params)) {
        console.log('Some vital parameters are missing.')
        return;
    }

    BusService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);

    // case there's a video (sometimes there'd be only metadata)
    if (params.videoName) {
        SaveVideoToMongo(params)
            .then(function(video) {
                params.videoId = video.id;
                produceJobs(params);
            })
            .catch(function(err) {
                if (err) console.log(err);
            });
    } else {
        produceJobs(params);
    }
}

function validateInput(params) {
    var relativePathToVideo = params.videoRelativePath;
    var videoName = params.videoName;
    var sourceId = params.sourceId;
    var relativePathToData = params.dataRelativePath; // metadata path
    var method = params.receivingMethod;

    // validate vital params
    if (!sourceId || !method || !method.standard || !method.version) {
        return false;
    }

    // validate that if there's a video, then all it's params exist
    if ((videoName || relativePathToVideo) && !(videoName && relativePathToVideo)) {
        return false;
    }

    return true;
}

function SaveVideoToMongo(params) {
    console.log('Saving video object to mongo...');
    // return Video.save({
    //     sourceId: params.sourceId,
    //     relativePath: params.relativePathToVideo,
    //     name: params.videoName
    //     receivingMethod: params.receivingMethod
    // });
    // resolve with videoId
    return Promise.resolve('someVideoId');
}

// produce all jobs here
function produceJobs(params) {
    produceMetadataParserJob(params);
    // produce insert to kaltura job here...
    // etc...
}

function produceMetadataParserJob(params) {
    console.log('Producing MetadataParser job...');

    var message = {
        videoId: params.videoId, // could be undefined
        relativePath: params.dataRelativePath,
        method: params.method
    };
    var queueName = JobsService.getQueueName('MetadataParser');
    if (queueName)
        BusService.produce(queueName, message);
    else
        throw 'Could not find queue name of the inserted job type';
}
