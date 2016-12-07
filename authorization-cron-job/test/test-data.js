var childProcess = require('child_process');
var util = require('util');
var path = require('path');

var dataPath = path.join(__dirname, './MongoData');
var metadataPath = path.join(dataPath, '/videometadata.json');
var videoPath = path.join(dataPath, '/videos.json');
var missionPath = path.join(dataPath, '/mission.json');
var newMetadataPath = path.join(dataPath, '/newMetadata.json');
var newVideoPath = path.join(dataPath, '/newVideo.json');
var importCommand = 'mongoimport --host %s --port %s --collection %s --db %s --file %s --username %s --password %s --authenticationDatabase %s';
var mongoHost = process.env.MONGO_HOST || 'localhost';
var mongoPort = process.env.MONGO_PORT || 27017;
var mongoDb = process.env.MONGO_DATABASE || 'replay_test';
var mongoUser = process.env.MONGO_USERNAME || 'replay';
var mongoPassword = process.env.MONGO_PASSWORD || 'replay';

module.exports = {
	insertVideoMetadata: function(importFilePath) {
		console.log('prepare video metadata for test');
		return executeImport('videometadatas', importFilePath);
	},

	insertVideos: function(importFilePath) {
		console.log('prepare video for test');
		return executeImport('videos', importFilePath);
	},

	insertNewMission: function(importFilePath) {
		console.log('prepare new mission for test');
		return executeImport('missions', importFilePath);
	},

	metadataPath: metadataPath,
	videoPath: videoPath,
	missionPath: missionPath,
	newMetadataPath: newMetadataPath,
	newVideoPath: newVideoPath
};

function executeImport(collection, filePath) {
	return new Promise(function(resolve, reject) {
		var exec = childProcess.exec;

		var child = exec(util.format(importCommand, mongoHost,
			mongoPort, collection,
			mongoDb, filePath, mongoUser, mongoPassword, 'admin'));
		child.stderr.on('data', function(data) {
			console.log('stdout: ' + data);
		});
		child.on('close', function(code) {
			console.log('closing code: ' + code);
			resolve();
		});
	});
}
