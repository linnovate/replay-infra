var Mission = require('replay-schemas/Mission'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video');
var childProcess = require('child_process');
var util = require('util');
var connectMongo = require('replay-schemas/connectMongo');

var _authorizationCronJobPath = '../authorization-cron-job.js';
var metadataPath = './MongoData/videometadata.json';
var videoPath = './MongoData/videos.json';
var missionPath = './MongoData/mission.json';
var importCommand = 'mongoimport --host %s --port %s --collection %s --db %s --file %s --username %s --password %s --authenticationDatabase %s';
var mongoHost = process.env.MONGO_HOST || 'localhost';
var mongoPort = process.env.MONGO_PORT || 27017;
var mongoDb = 'replay_test_auth_cron_job';
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
		insertVideoMetadata()
			.then(insertVideos)
			.then(insertNewMission)
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
	}
};

function insertVideoMetadata() {
	console.log('prepare video metadata for test');
	return executeImport('videometadatas', metadataPath);
}

function insertVideos() {
	console.log('prepare video for test');
	return executeImport('videos', videoPath);
}

function insertNewMission() {
	console.log('prepare new mission for test');
	return executeImport('missions', missionPath);
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
