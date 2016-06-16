var fs = require('fs'),
    path = require('path'),
	_ = require('lodash');

// try to save jobTypes here insteas of reloading them on each request
var jobTypes;
var jobTypesPath = path.join(__dirname, 'queues_config', 'job-types.json');

// load jobTypes file only if not loaded yet
function loadJobTypesJson() {
    console.log(jobTypesPath);
    if (!jobTypes)
        return jobTypes = JSON.parse(fs.readFileSync(jobTypesPath, "utf8"));
    else
        return jobTypes;
}

function getJobConfig(jobType){
    loadJobTypesJson();

    var job = _.find(jobTypes, function(job) {
        return job.type === jobType;
    });

    return job;
}

// check if we are familiar with this job type
module.exports.isKnownJobType = function(jobType) {
    loadJobTypesJson();

    return _.some(jobTypes, function(job) {
        return job.type === jobType;
    });
}

// get service name from the jobTypes array
module.exports.getServiceName = function(jobType) {
    return getJobConfig(jobType).service;
}

// get queue name from the jobTypes array
module.exports.getQueueName = function(jobType) {
    return getJobConfig(jobType).queue;
}