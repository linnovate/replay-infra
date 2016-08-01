var config = require('../config');

var SaveVideoService = require('../../processing-services/save-video-service');
var Video = require('replay-schemas/Video');

describe('save-video-service tests', function() {
	before(function() {
		config.resetEnvironment();
		return config.connectServices()
			.then(function() {
				return config.wipeMongoCollections();
			});
	});

	describe('sanity tests', function() {
		beforeEach(function() {
			return config.wipeMongoCollections();
		});

		afterEach(function() {
			return config.wipeMongoCollections();
		});

		it('should insert video object to mongo', function(done) {
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

		it('should not insert video object to mongo due to replay of job', function(done) {
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

		it('should not insert video object to mongo due to lack of video', function(done) {
			var message = config.generateValidMessage();
			message.videoName = undefined;
			message.videoRelativePath = undefined;

			SaveVideoService.start(message,
				function _error() {
					errCallback(done);
				},
				function _done() {
					testForNoVideos(done);
				});
		});
	});

	describe('bad input tests', function() {
		it('lacks transactionId', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = undefined;

			errornousInputTest(message, done);
		});

		it('has videoName but lacks videoRelativePath', function(done) {
			var message = config.generateValidMessage();
			message.videoRelativePath = undefined;

			errornousInputTest(message, done);
		});

		it('has videoRelativePath but lacks videoName', function(done) {
			var message = config.generateValidMessage();
			message.videoName = undefined;

			errornousInputTest(message, done);
		});

		it('has videoRelativePath but lacks startTime', function(done) {
			var message = config.generateValidMessage();
			message.startTime = undefined;

			errornousInputTest(message, done);
		});

		it('has videoRelativePath but lacks endTime', function(done) {
			var message = config.generateValidMessage();
			message.endTime = undefined;

			errornousInputTest(message, done);
		});

		it('lacks method', function(done) {
			var message = config.generateValidMessage();
			message.receivingMethod = undefined;

			errornousInputTest(message, done);
		});

		it('lacks method version field', function(done) {
			var message = config.generateValidMessage();
			message.receivingMethod.version = undefined;

			errornousInputTest(message, done);
		});

		it('lacks method standard field', function(done) {
			var message = config.generateValidMessage();
			message.receivingMethod.standard = undefined;

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
		.then(function(count) {
			expect(count).to.equal(1);
		})
		.then(function() {
			done();
		})
		.catch(function(err) {
			if (err) {
				done(err);
			}
		});
}

function testForNoVideos(done) {
	Video.count({})
		.then(function(count) {
			expect(count).to.equal(0);
		})
		.then(function() {
			done();
		})
		.catch(function(err) {
			if (err) {
				done(err);
			}
		});
}

function errCallback(done) {
	done(new Error('save video service errored.'));
}
