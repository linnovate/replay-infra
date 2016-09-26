var config = require('../config');

var SaveVideoService = require('../../processing-services/save-video-service');
var Video = require('replay-schemas/Video');

describe('save-video-service tests', function () {
	before(function () {
		config.resetEnvironment();
		return config.connectServices()
			.then(config.wipeMongoCollections);
	});

	after(function () {
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues);
	});

	describe('sanity tests', function () {
		beforeEach(function () {
			return config.wipeMongoCollections();
		});

		afterEach(function () {
			return config.wipeMongoCollections()
				.then(config.deleteAllQueues);
		});

		it('should insert video object to mongo', function (done) {
			var message = config.generateValidMessage();

			SaveVideoService.start(message,
				function _error() {
					errCallback(done);
				},
				function _done() {
					testForOneVideo(done);
				}
			);
		});

		it('should not insert video object to mongo due to replay of job', function (done) {
			var message = config.generateValidMessage();

			SaveVideoService.start(message,
				function _error() {
					errCallback(done);
				},
				function _done() {
					SaveVideoService.start(message,
						function _error() {
							errCallback(done);
						},
						function _done() {
							testForOneVideo(done);
						}
					);
				}
			);
		});

		it('should not insert video object to mongo due to lack of video', function (done) {
			var message = config.generateValidMessage();
			message.videoFileName = undefined;

			SaveVideoService.start(message,
				function _error() {
					errCallback(done);
				},
				function _done() {
					testForNoVideos(done);
				});
		});

		it('should produce MetadataParser job with appropriate message', function (done) {
			var message = config.generateValidMessage();
			config.testJobProduce(done, SaveVideoService, message, 'MetadataParser');
		});

		it('should produce AttachVideoToMetadata job with appropriate message', function (done) {
			var message = config.generateValidMessage();
			config.testJobProduce(done, SaveVideoService, message, 'AttachVideoToMetadata', 'Video');
		});
	});

	describe('bad input tests', function () {
		it('lacks transactionId', function (done) {
			var message = config.generateValidMessage();
			message.transactionId = undefined;

			errornousInputTest(message, done);
		});

		it('lacks sourceId', function (done) {
			var message = config.generateValidMessage();
			message.sourceId = undefined;

			errornousInputTest(message, done);
		});

		it('has videoFileName but lacks startTime', function (done) {
			var message = config.generateValidMessage();
			message.startTime = undefined;

			errornousInputTest(message, done);
		});

		it('has videoFileName but lacks endTime', function (done) {
			var message = config.generateValidMessage();
			message.endTime = undefined;

			errornousInputTest(message, done);
		});

		it('lacks method', function (done) {
			var message = config.generateValidMessage();
			message.receivingMethod = undefined;

			errornousInputTest(message, done);
		});

		it('lacks method version field', function (done) {
			var message = config.generateValidMessage();
			message.receivingMethod.version = undefined;

			errornousInputTest(message, done);
		});

		it('lacks method standard field', function (done) {
			var message = config.generateValidMessage();
			message.receivingMethod.standard = undefined;

			errornousInputTest(message, done);
		});

		it('lacks baseName', function (done) {
			var message = config.generateValidMessage();
			message.baseName = undefined;

			errornousInputTest(message, done);
		});

		it('lacks contentDirectoryPath', function (done) {
			var message = config.generateValidMessage();
			message.contentDirectoryPath = undefined;

			errornousInputTest(message, done);
		});

		it('lacks requestFormat', function (done) {
			var message = config.generateValidMessage();
			message.requestFormat = undefined;

			errornousInputTest(message, done);
		});
	});
});

function errornousInputTest(message, done) {
	SaveVideoService.start(message,
		function _error() {
			done();
		},
		function _done() {
			done(new Error('save video service did not recognize errornous input.'));
		});
}

function testForOneVideo(done) {
	Video.count({})
		.then(function (count) {
			expect(count).to.equal(1);
			done();
		})
		.catch(function (err) {
			if (err) {
				done(err);
			}
		});
}

function testForNoVideos(done) {
	Video.count({})
		.then(function (count) {
			expect(count).to.equal(0);
		})
		.then(function () {
			done();
		})
		.catch(function (err) {
			if (err) {
				done(err);
			}
		});
}

function errCallback(done) {
	done(new Error('save video service errored.'));
}

