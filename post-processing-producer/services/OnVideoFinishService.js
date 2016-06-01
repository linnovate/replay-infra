var BusService = require('BusService');

module.exports.start = function(params) {
    console.log('OnVideoFinihService started.');

    // used later to push jobs to this queue
    var postProcessingQueueName = getPostProcessingQueueName();

    // extract params
    var videoId = params.videoId;
    var relativePathToVideo = params.videoRelativePath;
    var relativePathToData = params.dataRelativePath; // metadata path
    var receivingMethod = params.receivingMethod;

    // log params
    console.log(params);

    // validate crucial params
    if (!method || !method.standard || !method.version) {
        console.log('Some vital parameters are missing.');
        return;
    }

    BusService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);

    produceJobs(postProcessingQueueName, params);
}

function getPostProcessingQueueName() {
    var queues = JSON.parse(fs.readFileSync('../queues-config/queues.json', "utf8"));
    if (queues.PostProcessingQueue)
        return queues.PostProcessingQueue.name;
    else
        throw "Error finding the finished videos queue name.";
}


// produce all jobs here
function produceJobs(queueName, params) {
    produceMetadataParserJob(queueName, params);
}

function produceMetadataParserJob(queueName, params) {
    var message = {
        type: "MetadataParser",
        videoId: params.videoId,
        relativePath: params.dataRelativePath,
        method: params.method
    };
    BusService.produce(queueName, message);
}
