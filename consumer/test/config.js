var path = require('path');

var chai = require('chai'),
	mongoose = require('mongoose'),
	connectMongo = require('replay-schemas/connectMongo'),
	Video = require('replay-schemas/Video'),
	JobStatus = require('replay-schemas/JobStatus'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Query = require('replay-schemas/Query'),
	rabbit = require('replay-rabbitmq');

// set env variables
process.env.MONGO_HOST = 'localhost';
process.env.MONGO_DATABASE = 'replay_test';
process.env.STORAGE_PATH = path.join(__dirname, 'data');
process.env.RABBITMQ_HOST = 'localhost';
process.env.ELASTIC_HOST = 'localhost';

// config chai
chai.config.includeStack = true;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

// connect services
module.exports.connectServices = function() {
	return connectMongo(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE)
		.then(function() {
			return rabbit.connect(process.env.RABBITMQ_HOST);
		});
};

// wipe mongo collections
module.exports.wipeMongoCollections = function() {
	return Video.remove({})
		.then(function() {
			return JobStatus.remove({});
		})
		.then(function() {
			return VideoMetadata.remove({});
		})
		.then(function() {
			return Query.remove({});
		});
};

module.exports.generateValidMessage = function() {
	return {
		sourceId: '123',
		videoName: 'sample.ts',
		videoRelativePath: 'sample.ts',
		dataRelativePath: 'sample.data',
		receivingMethod: {
			standard: 'VideoStandard',
			version: '1.0'
		},
		transactionId: new mongoose.Types.ObjectId()
	};
};

module.exports.generateJobStatus = function() {
	return JobStatus.create({});
};
