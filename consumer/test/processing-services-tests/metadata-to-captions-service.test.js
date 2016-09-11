var path = require('path'),
	fs = require('fs');

var Promise = require('bluebird');

var mkdirp = Promise.promisify(require('mkdirp')),
	rimraf = Promise.promisify(require('rimraf'));

var config = require('../config.js');
var MetadataToCaptionsService = require('../../processing-services/metadata-to-captions-service.js');

var _transactionId;

describe('MetadataToCaptionsService tests', function() {
	before(function() {
		process.env.CAPTIONS_PATH = 'temp-captions-path';
		config.resetEnvironment(); // reset the env variables
		return config.connectServices()
			.then(createCaptionsPath)
			.then(function() {
				return config.wipeMongoCollections();
			});
	});

	after(function() {
		return removeCaptionsPath()
			.then(function() {
				return config.wipeMongoCollections();
			});
	});

	describe('Invalid input tests', invalidInputTests);
	describe('Behavioral tests', behavioralTests);
});

function invalidInputTests() {
	beforeEach(beforeEachTestResetEnvironmentAndGenerateJobStatus);
	afterEach(afterEachTestWipeMongoCollections);

	it('should call error function when no process.env.STORAGE_PATH are given', function(done) {
		var message = generateMessage();
		delete process.env.STORAGE_PATH;
		MetadataToCaptionsService.start(message,
			function _error() {
				done();
			},
			function _done() {
				done(new Error('should have call error function'));
			});
	});

	it('should call error function when message.transactionId = undefined', function(done) {
		var message = generateMessage();
		message.transactionId = undefined;
		MetadataToCaptionsService.start(message,
			function _error() {
				done();
			},
			function _done() {
				done(new Error('should have call error function'));
			});
	});

	it('should call error function when message.videoId = undefined', function(done) {
		var message = generateMessage();
		message.videoId = undefined;
		MetadataToCaptionsService.start(message,
			function _error() {
				done();
			},
			function _done() {
				done(new Error('should have call error function'));
			});
	});
}

function behavioralTests() {
	beforeEach(beforeEachTestResetEnvironmentAndGenerateJobStatus);
	afterEach(afterEachTestWipeMongoCollections);

	it('Some behavioral test...', function(done) {
		try {
			isFileExists('../captions.vtt');
			done();
		} catch (e) {
			done(new Error('captions file not found'));
		}
	});
}

function beforeEachTestResetEnvironmentAndGenerateJobStatus(done) {
	process.env.CAPTIONS_PATH = 'temp-captions-path';
	config.resetEnvironment(); // reset the env variables
	config.generateJobStatus()
		.then(function(jobStatus) {
			_transactionId = jobStatus.id;
			return Promise.resolve();
		})
		.then(function() {
			return done();
		})
		.catch(function(err) {
			if (err) {
				done(err);
			}
		});
}

function afterEachTestWipeMongoCollections(done) {
	config.wipeMongoCollections()
		.then(function() {
			done();
		})
		.catch(function(err) {
			if (err) {
				done(err);
			}
		});
}

function generateMessage() {
	return {
		transactionId: _transactionId,
		videoId: 'testVideoId'
	};
}

function createCaptionsPath() {
	return mkdirp(path.join(process.env.STORAGE_PATH, process.env.CAPTIONS_PATH));
}

function removeCaptionsPath() {
	return rimraf(path.join(process.env.STORAGE_PATH, process.env.CAPTIONS_PATH));
}

function isFileExists(fileName) {
	var filePath = path.join(process.env.STORAGE_PATH, process.env.CAPTIONS_PATH, fileName);
	console.log(filePath);
	fs.accessSync(filePath, fs.F_OK);
}
