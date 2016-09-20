var path = require('path'),
	util = require('util');

var chai = require('chai'),
	_ = require('lodash'),
	mongoose = require('mongoose'),
	connectMongo = require('replay-schemas/connectMongo'),
	Video = require('replay-schemas/Video'),
	JobStatus = require('replay-schemas/JobStatus'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Query = require('replay-schemas/Query'),
	rabbit = require('replay-rabbitmq'),
	Promise = require('bluebird'),
	JobsService = require('replay-jobs-service');

var fs = Promise.promisifyAll(require('fs'));

chai.use(require('chai-datetime'));

// config chai
chai.config.includeStack = true;
global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;

var _validMetadataObjectsPath = 'expected_parsed_data.json';

resetEnvironment();

function resetEnvironment() {
	// set env variables
	process.env.MONGO_HOST = 'localhost';
	process.env.MONGO_DATABASE = 'replay_test';
	process.env.STORAGE_PATH = path.join(__dirname, 'data');
	process.env.CAPTURE_STORAGE_PATH = path.join(process.env.STORAGE_PATH, 'capture');
	process.env.RABBITMQ_HOST = 'localhost';
	process.env.KALTURA_PARTNER_ID = 101;
	process.env.PROVIDER = 'kaltura';
	process.env.KALTURA_URL = 'http://vod.linnovate.net';
	process.env.KALTURA_ADMIN_SECRET = '96f2df9a0071cd8024463509439fedb9';
	process.env.RABBITMQ_MAX_RESEND_ATTEMPS = 1;
}
module.exports.resetEnvironment = resetEnvironment;

// connect services
module.exports.connectServices = function () {
	return connectMongo(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE)
		.then(function () {
			return rabbit.connect(process.env.RABBITMQ_HOST);
		});
};

// wipe mongo collections
module.exports.wipeMongoCollections = function () {
	return Video.remove({})
		.then(function () {
			return JobStatus.remove({});
		})
		.then(function () {
			return VideoMetadata.remove({});
		})
		.then(function () {
			return Query.remove({});
		});
};

module.exports.generateValidMessage = function () {
	var startTime = new Date();
	var endTime = addMinutes(startTime, 30);

	return {
		sourceId: '123',
		videoFileName: 'sample.ts',
		dataFileName: 'sample.data',
		contentDirectoryPath: '/',
		baseName: 'sample',
		requestFormat: 'mp4',
		receivingMethod: {
			standard: 'VideoStandard',
			version: '1.0'
		},
		startTime: startTime,
		endTime: endTime,
		transactionId: new mongoose.Types.ObjectId()
	};
};

module.exports.generateJobStatus = function () {
	return JobStatus.create({});
};

module.exports.generateVideo = function (params, _transactionId) {
	return {
		_id: new mongoose.Types.ObjectId(),
		sourceId: params.sourceId,
		contentDirectoryPath: params.contentDirectoryPath,
		videoFileName: params.videoFileName,
		baseName: params.baseName,
		requestFormat: params.requestFormat,
		receivingMethod: params.receivingMethod,
		jobStatusId: _transactionId,
		startTime: params.startTime,
		endTime: params.endTime
	};
};

// returns metadata objects from the VideoMetadata schema
module.exports.getValidMetadataObjects = function () {
	var fullPathToVideoMetadata = path.join(process.env.STORAGE_PATH, _validMetadataObjectsPath);
	return fs.readFileAsync(fullPathToVideoMetadata, 'utf8')
		.then(function (expectedDataAsString) {
			var metadataObjects = JSON.parse(expectedDataAsString);
			var videoMetadatas = _.map(metadataObjects, function (metadata) {
				return new VideoMetadata(metadata);
			});
			return Promise.resolve(videoMetadatas);
		});
};

// returns raw javascript metadata objects
module.exports.getValidMetadataAsJson = function () {
	var fullPathToVideoMetadata = path.join(process.env.STORAGE_PATH, _validMetadataObjectsPath);
	return fs.readFileAsync(fullPathToVideoMetadata, 'utf8')
		.then(function (expectedDataAsString) {
			return Promise.resolve(JSON.parse(expectedDataAsString));
		});
};

module.exports.deleteAllQueues = function () {
	var jobConfigs = JobsService.getAllJobConfigs();
	var queueNames = _.map(jobConfigs, function (jobConfig) {
		return jobConfig.queue;
	});

	queueNames.push('FailedJobsQueue');

	var deleteQueuePromises = [];
	for (var i = 0; i < queueNames.length; i++) {
		var queueName = queueNames[i];
		deleteQueuePromises.push(rabbit.deleteQueue(queueName));
	}

	return Promise.all(deleteQueuePromises);
};

function addMinutes(date, minutes) {
	return new Date(date.getTime() + minutes * 60000);
}
module.exports.addMinutes = addMinutes;

// simulate message from the video recorder.
module.exports.generateMessageForTsProcessing = function () {
	var startTime = new Date();
	var endTime = addMinutes(startTime, 30);
	return {
		sourceId: 100,
		videoName: 'my_video_name',
		fileRelativePath: 'sample.ts',
		storagePath: process.env.CAPTURE_STORAGE_PATH,
		receivingMethod: {
			standard: 'VideoStandard',
			version: '1.0'
		},
		startTime: startTime,
		endTime: endTime,
		duration: 30,
		sourceType: 'In VideoStandard V 1.0 it does not matter',
		transactionId: new mongoose.Types.ObjectId()
	};
};

function getJobExpectedParamKeys(jobType) {
	var params;

	switch (jobType) {
		case 'MetadataParser':
			params = {
				sourceId: undefined,
				videoId: undefined,
				dataFileName: undefined,
				contentDirectoryPath: undefined,
				receivingMethod: {
					standard: undefined,
					version: undefined
				},
				transactionId: undefined
			};
			break;
		case 'AttachVideoToMetadata':
			params = {
				transactionId: undefined,
				sourceId: undefined,
				metadatas: undefined
			};
			break;
		case 'MetadataToMongo':
			params = {
				transactionId: undefined,
				metadatas: undefined
			};
			break;
		default:
			throw new Error('Job type is missing.');
	}

	return Object.keys(params);
}

module.exports.testJobProduce = function (done, service, message, jobType) {
	service.start(message,
		function _error() {
			done(new Error(util.format('%s\'s service has errored.', jobType)));
		},
		function _done() {
			var queueName = JobsService.getQueueName(jobType);
			rabbit.consume(queueName, 1, function (params, _error, _done) {
				expect(Object.keys(params).sort()).to.deep.equal(getJobExpectedParamKeys(jobType).sort());
				_done();
				done();
			});
		}
	);
};
