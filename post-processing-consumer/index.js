var BusService = require('./services/BusService'),
	mongoose = require('mongoose'),
	elasticsearch = require('elasticsearch'),
	fs = require('fs'),
    _ = require('lodash');


// notify we're up, and check input
console.log('Consumer is up!');
if(!isInputValid()){
	return "Bad input was received.";
}
// connect to our databases once so the service won't have to re-create connection each time
connectDatabases();

// create bus
// BusService = new BusService();
// BusService.consume(process.env.QUEUE_NAME, handleMessage);
handleMessage({
	type: 'MetadataParser',
	params: {
		videoId: 'someVideoId',
		relativePath: 'someVideoId.data',
		method: {
			standard: 'TekenHozi',
			version: 1.0
		}
	}
});


// enforces basic validations on the environment input passed to process,
// such as mandatory parameters.
// later on, specific functions should enforce specific validations on their inputs
function isInputValid(){
	console.log('Job type is: ', process.env.JOB_TYPE);
	console.log('Mongo host: ', process.env.MONGO_HOST);
	console.log('Mongo port: ', process.env.MONGO_PORT);
	console.log('Mongo database: ', process.env.MONGO_DATABASE);
	console.log('Elastic host: ', process.env.ELASTIC_HOST);
	console.log('Elastic port: ', process.env.ELASTIC_PORT);
	console.log('Files storage path: ', process.env.STORAGE_PATH);
	console.log('Queue is: ', process.env.QUEUE_NAME);

	// check mandatory parameter we can't continue without
	if(!process.env.QUEUE_NAME || !process.env.MONGO_DATABASE || !process.env.STORAGE_PATH)
		return false;

	return true;
}

function handleMessage(message) {
	// read job types file
	var jobTypes = getJobTypesJson();

    // detect service job type
    var jobType = process.env.JOB_TYPE;
    // JOB_TYPE can be empty (handle all jobs), or a specific known JOB TYPE.
    // message.type must be a known specific job.
    if ((jobType && !isKnownJobType(jobTypes, jobType)) ||
    	!isKnownJobType(jobTypes, message.type)) {
        console.log('Bad job type was inserted');
        return;
    }

    // in case we are handling all job types, or,
    // the job type is of our type
    if (!jobType || message.type === jobType.type) {
        serviceName = getServiceName(jobTypes, message.type);
        service = require('./services/ProcessingServices/' + serviceName);
        if(service)
        	service.start(message.params);
        else
        	console.log('Bad service name');
        return;
    }
}

// check if we are familiar with this job type
function isKnownJobType(jobTypes, jobType) {
    return _.some(jobTypes, function(job) {
        return job.type === jobType;
    });
}

// get service name from the jobTypes array
function getServiceName(jobTypes, jobType){
	var job = _.find(jobTypes, function(job){
		return job.type === jobType;
	});
	
	return job.service;
}

function getJobTypesJson(){
	return JSON.parse(fs.readFileSync('./job-types/types.json', "utf8"));
}

function connectDatabases(){
	connectMongo();
	connectElasticSearch();
}

function connectMongo(){
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

function connectElasticSearch(){
	var host = process.env.ELASTIC_HOST || 'localhost';
	var port = process.env.ELASTIC_PORT || 9200;

	var uri = host + ':' + port;
	// connect to elastic
	// keep-alive is true by default, which means forever
	global.elasticsearch = new elasticsearch.Client({
	  host: uri,
	  log: 'trace'
	});
}