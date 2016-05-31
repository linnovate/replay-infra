var Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('fs')),
	_ = require('lodash'),
	VideoMetadata = require('../../../schemas/VideoMetadata');

module.exports.start = function(params){
	console.log('MetadataParserService started.');

	// extract params and handle metadata
	var relativePathToData = params.relativePath;
	var method = params.method;

	console.log('Relative path is: ', relativePathToData);
	console.log('Method is: ', method);

	// validate params
	if(!relativePathToData || !process.env.STORAGE_PATH ||
		!method || !method.standard || !method.version){
		console.log('Some vital parameters are missing.');
		return;
	}

	// concat full path
	var pathToData = process.env.STORAGE_PATH + '/' + relativePathToData;

	readDataAsString(pathToData)
	.then(function(data){
		return dataToObjects(method, data);
	})
	.then(function(xmls){
		return saveToDatabases(xmls, params);
	})
	.catch(handleErrors);
}

function readDataAsString(path){
	return fs.readFileAsync(path, "utf8");
}

function dataToObjects(method, data){
	return new Promise(function(resolve, reject){
		
		var standardHandler;
		if(method.standard == 'TekenHozi' && method.version == 0.9)
			standardHandler = require('./Standards/TekenHozi/0.9');
		else if(method.standard == 'TekenHozi' && method.version == 1.0)
			standardHandler = require('./Standards/TekenHozi/1.0');
		else
			reject('Unsupported standard and version');

		resolve(standardHandler.parse(data));
	});
}

// async save to databases
// I do not want to stop everything if one save has failed,
// so I resolve anyway, and log errors to console.
function saveToDatabases(xmls, params){
	return new Promise(function(resolve, reject){
		console.log('Saving to databases.');

		saveToMongo(xmls, params);
		saveToElastic(xmls, params);

		resolve();
	});
}

function handleErrors(err){	
	if(err) console.log(err);
}

function saveToMongo(xmls, params){
	// convert xmls to list of VideoMetadata
	var videoMetadatas = _.map(xmls, function(xml){
		return new VideoMetadata({
			sourceId: xml.VideoSource.PlatformID,
			videoId: params.videoId,
			receivingMethod: params.method,
			data: xml
		})
	});

	VideoMetadata.insertMany(videoMetadatas, function(err, objs){
		if(err)
			console.log(err);
		else
			console.log('Bulk insertion to mongo succeed.');
	});
}

function saveToElastic(xmls, params){

}