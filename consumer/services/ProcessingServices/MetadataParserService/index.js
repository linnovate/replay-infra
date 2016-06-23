var Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('fs')),
	_ = require('lodash'),
	VideoMetadata = require('replay-schemas/VideoMetadata');

module.exports.start = function(params){
	console.log('MetadataParserService started.');

	if(!validateInput(params)){
		console.log('Some vital parameters are missing.')
        return;
	}

	// extract params and handle metadata
	var relativePathToData = params.relativePath;
	var method = params.method;

	// concat full path
	var pathToData = process.env.STORAGE_PATH + '/' + relativePathToData;

	readDataAsString(pathToData)
	.then(function(data){
		return dataToObjects(method, data);
	})
	.then(function(metadatas){
		return saveToDatabases(metadatas, params);
	})
	.catch(handleErrors);
}

function validateInput(params){
	var relativePathToData = params.relativePath;
	var method = params.method;
	
	// validate params
	if(!relativePathToData || !process.env.STORAGE_PATH ||
		!method || !method.standard || !method.version){
		console.log('Some vital parameters are missing.');
		return false;
	}

	return true;
}

function readDataAsString(path){
	return fs.readFileAsync(path, "utf8");
}

function dataToObjects(method, data){
	return new Promise(function(resolve, reject){
		
		var standardHandler;
		if(method.standard == 'VideoStandard' && method.version == 0.9)
			standardHandler = require('./Standards/VideoStandard/0.9');
		else if(method.standard == 'VideoStandard' && method.version == 1.0)
			standardHandler = require('./Standards/VideoStandard/1.0');
		else
			reject('Unsupported standard and version');

		resolve(standardHandler.parse(data));
	});
}

// async save to databases
// I do not want to stop everything if one save has failed,
// so I resolve anyway, and log errors to console.
function saveToDatabases(metadatas, params){
	return new Promise(function(resolve, reject){
		console.log('Saving to databases.');

		saveToMongo(metadatas, params);
		saveToElastic(metadatas, params);

		resolve();
	});
}

function handleErrors(err){	
	if(err) console.log(err);
}

function saveToMongo(metadatas, params){
	// convert xmls to list of VideoMetadata
	var videoMetadatas = metadataObjectsToVideoMetadata(metadatas, params);
	
	VideoMetadata.insertMany(videoMetadatas, function(err, objs){
		if(err)
			console.log(err);
		else
			console.log('Bulk insertion to mongo succeed.');
	});
}

function metadataObjectsToVideoMetadata(metadatas, params){
	return _.map(metadatas, function(metadata){
		return new VideoMetadata({
			sourceId: params.sourceId,
			videoId: params.videoId,
			receivingMethod: params.method,
			data: metadata
		});
	});
}

function saveToElastic(metadatas, params){
	// convert xmls to bulk request object for elastic
	var bulkRequest = metadataObjectsToElasticBulkRequest(metadatas, params);

	global.elasticsearch.bulk({
	    body : bulkRequest
	}, function (err, resp) {
	  if(err)
	  	console.log(err);
	  else
	  	console.log('Bulk insertion to elastic succeed.');
	});
}

function metadataObjectsToElasticBulkRequest(metadatas, params){
	var bulkRequest = [];

	videoMetadatas = metadataObjectsToVideoMetadata(metadatas, params);

	videoMetadatas.forEach(function(videoMetadata){
		// efficient way to remove auto generated _id
		videoMetadata['_id'] = undefined;

		// push action
		bulkRequest.push({
			index: {
				_index: 'videometadatas',
				_type: 'videometadata'
			}
		});

		// push document
		bulkRequest.push(videoMetadata);
	});

	return bulkRequest;
}