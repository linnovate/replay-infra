var BusService = require('BusService'),
    mongoose = require('mongoose'),
    elasticsearch = require('elasticsearch'),
    JobsService = require('JobsService'),
    _ = require('lodash');


// notify we're up, and check input
console.log('Post processing consumer is up!');

// extract command line params
jobType = process.argv[2];

if (!isInputValid()) {
    return "Bad input was received.";
}
// connect to our databases once so the service won't have to re-create connection each time
// connectDatabases();

// get the matching queue name of the job type
queueName = JobsService.getQueueName(jobType);

// create bus
BusService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);
BusService.consume(queueName, handleMessage);
// handleMessage({
//     params: {
//         videoId: 'someVideoId',
//         relativePath: 'someVideoId.data',
//         method: {
//             standard: 'VideoStandard',
//             version: 1.0
//         }
//     }
// });


// enforces basic validations on the environment input passed to process,
// such as mandatory parameters.
// later on, specific functions should enforce specific validations on their inputs
function isInputValid() {
    console.log('Job type is: ', jobType);
    console.log('Redis host: ', process.env.REDIS_HOST);
    console.log('Redis port: ', process.env.REDIS_PORT);
    console.log('Redis password: ', process.env.REDIS_PASSWORD);
    console.log('Mongo host: ', process.env.MONGO_HOST);
    console.log('Mongo port: ', process.env.MONGO_PORT);
    console.log('Mongo database: ', process.env.MONGO_DATABASE);
    console.log('Elastic host: ', process.env.ELASTIC_HOST);
    console.log('Elastic port: ', process.env.ELASTIC_PORT);
    console.log('Files storage path: ', process.env.STORAGE_PATH);

    // check mandatory parameter we can't continue without
    if (!JobsService.isKnownJobType(jobType) || !process.env.MONGO_DATABASE || !process.env.STORAGE_PATH)
        return false;

    return true;
}

function handleMessage(message) {
    console.log('Received message: ', message);
    console.log('Lifting appropriate service...');

    // get the appropriate service name and start it
    var serviceName = JobsService.getServiceName(jobType);
    service = require('./services/ProcessingServices/' + serviceName);
    if (service)
        service.start(JSON.parse(message).params);
    else
        console.log('Bad service name');
    return;
}

function connectDatabases() {
    connectMongo();
    connectElasticSearch();
}

function connectMongo() {
    var host = process.env.MONGO_HOST || 'localhost';
    var port = process.env.MONGO_PORT || 27017;

    var keepAliveInSeconds = 60 * 60 * 24 * 30; // 30 days
    // initialize options
    var options = {
        server: {
            socketOptions: {
                keepAlive: keepAliveInSeconds
            }
        },
        replset: {
            socketOptions: {
                keepAlive: keepAliveInSeconds
            }
        }
    };

    var uri = 'mongodb://' + host + ':' + port + '/' + process.env.MONGO_DATABASE;
    // connect to mongo
    mongoose.connect(uri, options);
    global.mongoose = mongoose;
}

function connectElasticSearch() {
    var host = process.env.ELASTIC_HOST || 'localhost';
    var port = process.env.ELASTIC_PORT || 9200;

    var uri = host + ':' + port;
    // connect to elastic
    // keep-alive is true by default, which means forever
    global.elasticsearch = new elasticsearch.Client({
        host: uri,
        log: ['error', 'warning']
    });
}
