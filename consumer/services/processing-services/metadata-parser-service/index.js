var Promise = require('bluebird'),
	VideoMetadata = require('replay-schemas/VideoMetadata');

var fs = Promise.promisifyAll(require('fs'));

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
	var pathToData = process.env.STORAGE_PATH + '/' + relativePathToData;

	readDataAsString(pathToData)
		.then(function(data) {
			return dataToObjects(method, data, params);
		})
		.then(function(videoMetadatas) {
			return saveToDatabases(videoMetadatas, params);
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
		if (method.standard === 'VideoStandard' && method.version === 0.9) {
			standardHandler = require('./standards/video-standard/0.9');
			resolve(standardHandler.parse(data));
		} else if (method.standard === 'VideoStandard' && method.version === 1.0) {
			standardHandler = require('./standards/video-standard/1.0');
			resolve(standardHandler.parse(data, params));
		} else {
			return reject('Unsupported standard and version');
		}
	});
}

// async save to databases
// I do not want to stop everything if one save has failed,
// so I resolve anyway, and log errors to console.
function saveToDatabases(videoMetadatas, params) {
	return new Promise(function(resolve, reject) {
		console.log('Saving to databases.');

		saveToMongo(videoMetadatas, params);
		saveToElastic(videoMetadatas, params);

		resolve();
	});
}

function handleErrors(err) {
	if (err) {
		console.log(err);
	}
}

function saveToMongo(videoMetadatas, params) {
	VideoMetadata.insertMany(videoMetadatas, function(err, objs) {
		if (err) {
			console.log(err);
		} else {
			console.log('Bulk insertion to mongo succeed.');
		}
	});
}

function saveToElastic(videoMetadatas, params) {
	// convert xmls to bulk request object for elastic
	var bulkRequest = videoMetadatasToElasticBulkRequest(videoMetadatas, params);

	global.elasticsearch.bulk({
		body: bulkRequest
	}, function(err, resp) {
		if (err) {
			console.log(err);
		} else {
			console.log('Bulk insertion to elastic succeed.');
		}
	});
}

function videoMetadatasToElasticBulkRequest(videoMetadatas, params) {
	var bulkRequest = [];

	videoMetadatas.forEach(function(videoMetadata) {
		// efficient way to remove auto generated _id
		videoMetadata._id = undefined;

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
