var path = require('path');

var chai = require('chai'),
	mongoose = require('mongoose'),
	connectMongo = require('replay-schemas/connectMongo'),
	Video = require('replay-schemas/Video'),
	JobStatus = require('replay-schemas/JobStatus'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Query = require('replay-schemas/Query'),
	rabbit = require('replay-rabbitmq');

chai.use(require('chai-datetime'));

// config chai
chai.config.includeStack = true;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

module.exports.resetEnvironment = function() {
	// set env variables
	process.env.MONGO_HOST = 'localhost';
	process.env.MONGO_DATABASE = 'replay_test';
	process.env.STORAGE_PATH = path.join(__dirname, 'data');
	process.env.RABBITMQ_HOST = 'localhost';
	process.env.ELASTIC_HOST = 'localhost';
	process.env.KALTURA_PARTNER_ID = 101;
	process.env.PROVIDER = 'kaltura';
	process.env.KALTURA_URL = 'http://vod.linnovate.net';
	process.env.KALTURA_ADMIN_SECRET = '96f2df9a0071cd8024463509439fedb9';
};

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
