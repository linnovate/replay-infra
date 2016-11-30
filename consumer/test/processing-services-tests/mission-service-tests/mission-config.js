var Mission = require('replay-schemas/Mission'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video');
var connectMongo = require('replay-schemas/connectMongo');
//var Promise = require('bluebird');
var mongoHost = process.env.MONGO_HOST || 'localhost';
var mongoPort = process.env.MONGO_PORT || 27017;
var mongoDb = 'replay_test_auth_cron_job';
process.env.MONGO_DATABASE = mongoDb;
var mongoUser = process.env.MONGO_USERNAME || 'replay';
var mongoPassword = process.env.MONGO_PASSWORD || 'replay';
var testUtils = require('replay-test-utils/test-data');

module.exports = {
	connectMongo: function() {
		return connectMongo(mongoHost, mongoPort, mongoDb, mongoUser, mongoPassword);
			/*.catch(function(err) {
				console.log('An error occured in bootstrap.');
				console.log(err);
			});*/
	},

	wipeCollections: function() {
		console.log('clear database before test');
		return Mission.remove({})
			.then(() => Video.remove({}))
			.then(() => VideoMetadata.remove({}));/*
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});*/
	},

	prepareDataForTest: function() {
		console.log('Im here!!');
		return testUtils.insertVideoMetadata(testUtils.metadataPath)
			.then(() => testUtils.insertVideos(testUtils.videoPath))
			.then(() => testUtils.insertNewMission(testUtils.missionPath));
			/*.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});*/
	},

	updateTestMission: function(status) {
		return Mission.update({ missionName: 'test mission' }, {
			$set: {
				videoStatus: status
			}
		});/*.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});*/
	},

	addNewVideo: function() {
		return testUtils.insertVideoMetadata(testUtils.newMetadataPath)
			.then(() => testUtils.insertVideos(testUtils.newVideoPath));
			/*.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});*/
	},

	getNewVideo: function() {
		return Video.findOne({ copyright: 'newVideo' });
	}
};
