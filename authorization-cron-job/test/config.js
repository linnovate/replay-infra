var Mission = require('replay-schemas/Mission'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video');
var childProcess = require('child_process');
var util = require('util'),
	path = require('path');
var connectMongo = require('replay-schemas/connectMongo');

var _authorizationCronJobPath = path.join(__dirname, '../authorization-cron-job.js');
var dataPath = path.join(__dirname, './MongoData');
var metadataPath = path.join(dataPath, '/videometadata.json');
var videoPath = path.join(dataPath, '/videos.json');
var missionPath = path.join(dataPath, '/mission.json');
var newMetadataPath = path.join(dataPath, '/newMetadata.json');
var newVideoPath = path.join(dataPath, '/newVideo.json');
var importCommand = 'mongoimport --host %s --port %s --collection %s --db %s --file %s --username %s --password %s --authenticationDatabase %s';
var mongoHost = process.env.MONGO_HOST || 'localhost';
var mongoPort = process.env.MONGO_PORT || 27017;
var mongoDb = 'replay_test_auth_cron_job';
process.env.MONGO_DATABASE = mongoDb;
var mongoUser = process.env.MONGO_USERNAME || 'replay';
var mongoPassword = process.env.MONGO_PASSWORD || 'replay';

var _process;

module.exports = {
	connectMongo: function() {
		return connectMongo(mongoHost, mongoPort, mongoDb, mongoUser, mongoPassword)
			.catch(function(err) {
				console.log('An error occured in bootstrap.');
				console.log(err);
			});
	},

	wipeCollections: function() {
		console.log('clear database before test');
		return Mission.remove({})
			.then(() => Video.remove({}))
			.then(() => VideoMetadata.remove({}))
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});
	},

	liftAuthCronJob: function() {
		_process = childProcess.fork(_authorizationCronJobPath);
		return Promise.resolve();
	},

	killAuthCronJob: function() {
		_process.kill('SIGKILL');
		return Promise.resolve();
	},

	prepareDataForTest: function() {
		return insertVideoMetadata(metadataPath)
			.then(insertVideos(videoPath))
			.then(insertNewMission(missionPath))
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});
	},

	updateTestMission: function(status) {
		return Mission.update({ missionName: 'test mission' }, {
			$set: {
				videoStatus: status
			}
		}).catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
	},

	addNewVideo: function() {
		return insertVideoMetadata(newMetadataPath)
			.then(insertVideos(newVideoPath))
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});
	},

	getNewVideo: function() {
		return Video.findOne({ copyright: 'newVideo' });
	}
};

function insertVideoMetadata(importFilePath) {
	console.log('prepare video metadata for test');
	return executeImport('videometadatas', importFilePath);
}

function insertVideos(importFilePath) {
	console.log('prepare video for test');
	return executeImport('videos', importFilePath);
}

function insertNewMission(importFilePath) {
	console.log('prepare new mission for test');
	return executeImport('missions', importFilePath);
}

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
