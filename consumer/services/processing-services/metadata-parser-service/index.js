var Promise = require('bluebird'),
	BusService = require('replay-bus-service'),
	JobsService = require('replay-jobs-service');

var path = require('path');

var fs = Promise.promisifyAll(require('fs'));
var busService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);

module.exports.start = function(params) {
	console.log('MetadataParserService started.');

	if (!validateInput(params)) {
		console.log('Some vital parameters are missing.');
		return;
	}

	// extract params and handle metadata
	var relativePathToData = params.relativePath;
	var method = params.method;

	// concat full path
	var pathToData = path.join(process.env.STORAGE_PATH, relativePathToData);

	readDataAsString(pathToData)
		.then(function(data) {
			return dataToObjects(method, data, params);
		})
		.then(function(videoMetadatas) {
			return produceJobs(videoMetadatas);
		})
		.catch(handleErrors);
};

function validateInput(params) {
	var relativePathToData = params.relativePath;
	var method = params.method;

	// validate params
	if (!relativePathToData || !process.env.STORAGE_PATH ||
		!method || !method.standard || !method.version) {
		console.log('Some vital parameters are missing.');
		return false;
	}

	return true;
}

function readDataAsString(path) {
	return fs.readFileAsync(path, 'utf8');
}

// apply specific logic to parse the different standards of metadatas
function dataToObjects(method, data, params) {
	return new Promise(function(resolve, reject) {
		var standardHandler;
		if (method.standard === 'VideoStandard' && method.version === '0.9') {
			standardHandler = require('./standards/video-standard/0.9');
			resolve(standardHandler.parse(data));
		} else if (method.standard === 'VideoStandard' && method.version === '1.0') {
			standardHandler = require('./standards/video-standard/1.0');
			resolve(standardHandler.parse(data, params));
		} else {
			return reject('Unsupported standard and version');
		}
	});
}

function produceJobs(videoMetadatas) {
	return new Promise(function(resolve, reject) {
		console.log('Producing save to databases jobs.');

		produceSaveToMongoJob(videoMetadatas);
		produceSaveToElasticJob(videoMetadatas);
		produceCaptionsJob(videoMetadatas);

		resolve(videoMetadatas);
	});
}

function produceSaveToMongoJob(videoMetadatas) {
	console.log('Producing save to Mongo job...');
	var message = {
		params: videoMetadatas
	};
	var queueName = JobsService.getQueueName('MetadataToMongo');
	if (queueName) {
		busService.produce(queueName, message);
	} else {
		throw new Error('Could not find queue name of the inserted job type');
	}
}

function produceSaveToElasticJob(videoMetadatas) {
	console.log('Producing save to Elastic job...');
	var message = {
		params: videoMetadatas
	};
	var queueName = JobsService.getQueueName('MetadataToElastic');
	if (queueName) {
		busService.produce(queueName, message);
	} else {
		throw new Error('Could not find queue name of the inserted job type');
	}
}

function produceCaptionsJob(videoMetadatas) {
	console.log('Producing Captions job...');
	var message = {
		params: videoMetadatas
	};
	var queueName = JobsService.getQueueName('MetadataToCaptions');
	if (queueName) {
		busService.produce(queueName, message);
	} else {
		throw new Error('Could not find queue name of the inserted job type');
	}
}

function handleErrors(err) {
	if (err) {
		console.log(err);
	}
}
