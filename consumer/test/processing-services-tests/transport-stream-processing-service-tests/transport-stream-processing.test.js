var tsProcess = require('../../../processing-services/transport-stream-processing-service/index.js');
var config = require('../../config.js');
var path = require('path');
var rmdir = require('rmdir');
var message;

function startTests() {
	describe('\ntransport-stream-processing-service tests:', function () {
		this.timeout(50000);
		initialForTests();
		describe('\ninput Tests:', function () {
			inputTests();
		});
		describe('\nerror Tests:', function () {
			errorTests();
		});
		describe('\nsuccess Tests:', function () {
			successTests();
		});
	});
}

function initialForTests() {
	before(function () {
		return config.connectServices();
	});

	beforeEach(function (done) {
		config.resetEnvironment();
		message = config.generateMessageForTsProcessing();
		process.env.STORAGE_PATH = path.join(process.env.STORAGE_PATH, 'ts-consumer');
		config.deleteAllQueues()
			.then(() => done());
	});

	after(function (done) {
		config.deleteAllQueues().then(function () {
			config.resetEnvironment();
			rmdir(path.join(process.env.STORAGE_PATH, 'ts-consumer'), done);
		});
	});
}

function inputTests() {
	it('should fail when the message is undefined', function (done) {
		message = undefined;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when sourceId missing in the message', function (done) {
		delete message.sourceId;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when fileRelativePath missing in the message', function (done) {
		delete message.fileRelativePath;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when receivingMethod missing in the message', function (done) {
		delete message.receivingMethod;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when receivingMethod.standard missing in the message', function (done) {
		delete message.receivingMethod.standard;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when receivingMethod.version missing in the message', function (done) {
		delete message.receivingMethod.version;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when startTime missing in the message', function (done) {
		delete message.startTime;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when endTime missing in the message', function (done) {
		delete message.endTime;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when sourceType missing in the message', function (done) {
		delete message.sourceType;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when transactionId missing in the message', function (done) {
		delete message.transactionId;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when process.env.STORAGE_PATH missing', function (done) {
		delete process.env.STORAGE_PATH;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should fail when process.env.CAPTURE_STORAGE_PATH missing', function (done) {
		delete process.env.CAPTURE_STORAGE_PATH;
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});
}

function errorTests() {
	it('should not recognize the standard', function (done) {
		message.receivingMethod.standard = 'standard that dont exist';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not recognize the version when the standard is VideoStandard', function (done) {
		message.receivingMethod.standard = 'VideoStandard';
		message.receivingMethod.version = 'version that dont exist';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not recognize the version when the standard is stanag', function (done) {
		message.receivingMethod.standard = 'stanag';
		message.receivingMethod.version = 'version that dont exist';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work when not recognize the fileType', function (done) {
		message.receivingMethod.standard = 'VideoStandard';
		message.receivingMethod.version = '0.9';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work when the file relative path does not exist in VideoStandard 1.0', function (done) {
		message.fileRelativePath = 'bla.ts';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work when the file relative path does not exist in VideoStandard 0.9 video', function (done) {
		message.fileRelativePath = 'bla.ts';
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Video';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work when the file relative path does not exist in VideoStandard 0.9 Telemetry', function (done) {
		message.fileRelativePath = 'bla.ts';
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Telemetry';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work when the file relative path does not exist in stanag 4609', function (done) {
		message.fileRelativePath = 'bla.ts';
		message.receivingMethod.standard = 'stanag';
		message.receivingMethod.version = '4609';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work in stanag 4609 when there is no data in the video', function (done) {
		message.receivingMethod.standard = 'stanag';
		message.receivingMethod.version = '4609';
		message.fileRelativePath = 'sample-without-data.ts';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work in videoStandard 0.9 when there is no data', function (done) {
		message.receivingMethod.standard = 'VideoStandard';
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Telemetry';
		message.fileRelativePath = 'sample-without-data.ts';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});

	it('should not work in videoStandard 0.9 when there is no data', function (done) {
		message.receivingMethod.standard = 'VideoStandard';
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Video';
		message.fileRelativePath = 'data.data';
		tsProcess.start(message,
			function _error() {
				done();
			},
			function _done() {
				done('failed');
			});
	});
}

function successTests() {
	it('should work in VideoStandard 1.0', function (done) {
		tsProcess.start(message,
			function _error() {
				done(new Error('fail'));
			},
			function _done() {
				done();
			});
	});

	it('should produce SaveVideo job in VideoStandard 1.0 mode', function (done) {
		config.testJobProduce(done, tsProcess, message, 'SaveVideo', 'VideoStandard-1.0');
	});

	it('should work in VideoStandard 0.9 video', function (done) {
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Video';
		message.fileRelativePath = 'sample-without-data.ts';
		tsProcess.start(message,
			function _error() {
				done(new Error('fail'));
			},
			function _done() {
				done();
			});
	});

	it('should produce SaveVideo job in VideoStandard 0.9 mode with video', function (done) {
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Video';
		message.fileRelativePath = 'sample-without-data.ts';
		config.testJobProduce(done, tsProcess, message, 'SaveVideo', 'VideoStandard-0.9-video');
	});

	it('should work in VideoStandard 0.9 Telemetry', function (done) {
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Telemetry';
		message.fileRelativePath = 'sample.ts';
		tsProcess.start(message,
			function _error() {
				done(new Error('fail'));
			},
			function _done() {
				done();
			});
	});

	it('should produce SaveVideo job in VideoStandard 0.9 mode with metadata', function (done) {
		message.receivingMethod.version = '0.9';
		message.sourceType = 'Telemetry';
		message.fileRelativePath = 'sample.ts';
		config.testJobProduce(done, tsProcess, message, 'SaveVideo', 'VideoStandard-0.9-metadata');
	});

	it('should work in stanag 4609', function (done) {
		message.receivingMethod.standard = 'stanag';
		message.receivingMethod.version = '4609';
		message.fileRelativePath = 'sample.ts';
		tsProcess.start(message,
			function _error() {
				done(new Error('fail'));
			},
			function _done() {
				done();
			});
	});

	it('should produce SaveVideo job in Stanag 4609 mode', function (done) {
		message.receivingMethod.standard = 'stanag';
		message.receivingMethod.version = '4609';
		message.fileRelativePath = 'sample.ts';
		config.testJobProduce(done, tsProcess, message, 'SaveVideo', 'Stanag-4609');
	});
}

startTests();
