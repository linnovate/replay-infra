var path = require('path'),
	fs = require('fs');

var Promise = require('bluebird');

var mkdirp = Promise.promisify(require('mkdirp')),
	rimraf = Promise.promisify(require('rimraf'));

var config = require('../../config');
var CaptionsToDestinationService = require('../../../processing-services/captions-services/captions-to-destination-service');

var _transactionId;

describe('CaptionsToDestinationService tests', function() {
	before(function() {
		process.env.DESTINATION_PATH = 'temp-destination-path';
		config.resetEnvironment(); // reset the env variables
		return config.connectServices()
			.then(createDestinationPath)
			.then(function() {
				return config.wipeMongoCollections();
			});
	});

	after(function() {
		return removeDestinationPath()
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
		CaptionsToDestinationService.start(message,
			function _error() {
				done();
			},
			function _done() {
				done(new Error('should have call error function'));
			});
	});

	it('should call error function when no process.env.DESTINATION_PATH are given', function(done) {
		var message = generateMessage();
		delete process.env.DESTINATION_PATH;
		CaptionsToDestinationService.start(message,
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
		CaptionsToDestinationService.start(message,
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
		CaptionsToDestinationService.start(message,
			function _error() {
				done();
			},
			function _done() {
				done(new Error('should have call error function'));
			});
	});

	it('should call error function when message.captionsRelativePath = undefined', function(done) {
		var message = generateMessage();
		message.captionsRelativePath = undefined;
		CaptionsToDestinationService.start(message,
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

	it('should copy captions file to destination', function(done) {
		var message = generateMessage();
		message.transactionId = _transactionId;

		CaptionsToDestinationService.start(message,
			function _error() {
				done(new Error('was not supposed to call error function'));
			},
			function _done() {
				try {
					isFileExists(message.captionsRelativePath);
					done();
				} catch (e) {
					done(new Error('captions file did not properly copied to destination'));
				}
			});
	});

	it('should not copy captions file to destination due to replay of job', function(done) {
		var message = generateMessage();
		message.transactionId = _transactionId;

		CaptionsToDestinationService.start(message,
			function _error() {
				done(new Error('was not supposed to call error function'));
			},
			function _done() {
				removeDestinationPath()
					.then(function() {
						CaptionsToDestinationService.start(message,
							function _error() {
								done(new Error('was not supposed to call error function'));
							},
							function _done() {
								// to make sure the second call didn't copy to destination, make sure it doesn't exist
								try {
									isFileExists(message.captionsRelativePath);
									done(new Error('file was copied to destination twice'));
								} catch (e) {
									done();
								}
							});
					});
			});
	});
}

function beforeEachTestResetEnvironmentAndGenerateJobStatus(done) {
	process.env.DESTINATION_PATH = 'temp-destination-path';
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
		videoId: 'testVideoId',
		captionsRelativePath: 'captions.vtt',
		transactionId: _transactionId
	};
}

function createDestinationPath() {
	return mkdirp(path.join(process.env.STORAGE_PATH, process.env.DESTINATION_PATH));
}

function removeDestinationPath() {
	return rimraf(path.join(process.env.STORAGE_PATH, process.env.DESTINATION_PATH));
}

function isFileExists(fileName) {
	var filePath = path.join(process.env.STORAGE_PATH, process.env.DESTINATION_PATH, fileName);
	fs.accessSync(filePath, fs.F_OK);
}
