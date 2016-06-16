var BusService = require('BusService'),
    JobsService = require('JobsService'),
    Video = require('schemas/Video'),
    mongoose = require('mongoose'),
    Promise = require('bluebird');

module.exports.start = function(params) {
    console.log('SaveVideoService started.');

    if (!validateInput(params)) {
        console.log('Some vital parameters are missing.')
        return;
    }

    busService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);

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

    return Video.create({
        sourceId: params.sourceId,
        relativePath: params.videoRelativePath,
        name: params.videoName,
        receivingMethod: params.receivingMethod
    });
}

// produce all jobs here
function produceJobs(params) {
    produceMetadataParserJob(params);
    produceUploadToProviderJob(params);
    // etc...
}

function produceMetadataParserJob(params) {
    console.log('Producing MetadataParser job...');

    var message = {
        params: {
            sourceId: params.sourceId,
            videoId: params.videoId, // could be undefined
            relativePath: params.dataRelativePath,
            method: params.receivingMethod
        }
    };
    var queueName = JobsService.getQueueName('MetadataParser');
    if (queueName)
        busService.produce(queueName, message);
    else
        throw 'Could not find queue name of the inserted job type';
}

function produceUploadToProviderJob(params){
    console.log('Producing UploadToProvider job...');

    // upload to provider if video exists
    if(params.videoRelativePath){

        var message = {
            params: {
                videoName: params.videoName,
                relativePath: params.videoRelativePath
            }
        }

        var queueName = JobsService.getQueueName('UploadVideoToProvider');
        if (queueName)
            busService.produce(queueName, message);
        else
            throw 'Could not find queue name of the inserted job type';
    }
}