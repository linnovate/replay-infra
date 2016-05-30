var BusService = require('./services/BusService')
	fs = require('fs'),
    _ = require('lodash');


// notify we're up, and check input
console.log('Consumer is up!');
if(!isInputValid()){
	return "Bad input was received.";
}

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
}, function(){
	console.log("Service is started.");
})


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
	console.log('Elastic index: ', process.env.ELASTIC_INDEX);
	console.log('Files storage path: ', process.env.STORAGE_PATH);
	console.log('Queue is: ', process.env.QUEUE_NAME);

	// queue name is a mandatory parameter
	if(!process.env.QUEUE_NAME)
		return false;

	return true;
}

function handleMessage(message, done) {
	// read job types file
	var jobTypes = getJobTypesJson();

    // detect service job type
    var jobType = process.env.JOB_TYPE;
    // JOB_TYPE can be empty (handle all jobs), or a specific known JOB TYPE.
    // message.type must be a known specific job.
    if ((jobType && !isKnownJobType(jobTypes, jobType)) ||
    	!isKnownJobType(jobTypes, message.type)) {
        console.log('Bad job type was inserted');
        return done();
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
        return done();
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