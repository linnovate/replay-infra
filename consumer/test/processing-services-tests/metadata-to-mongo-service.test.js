var config = require('../config');

var MetadataToMongoService = require('../../processing-services/metadata-to-mongo-service');
var VideoMetadata = require('replay-schemas/VideoMetadata');

var _expectedParsedDataObjects;
var _transactionId;

describe('metadata-to-mongo-service tests', function () {
	before(function () {
		config.resetEnvironment();
		return config.connectServices()
			.then(config.wipeMongoCollections)
			.then(config.getValidMetadataObjects)
			.then(function (expectedDataAsObjects) {
				_expectedParsedDataObjects = expectedDataAsObjects;
				return Promise.resolve();
			});
	});

	after(function () {
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues);
	});

	describe('sanity tests', function () {
		beforeEach(function () {
			return config.wipeMongoCollections()
				.then(config.generateJobStatus)
				.then(function (jobStatus) {
					_transactionId = jobStatus.id;
					return Promise.resolve();
				})
				.then(config.deleteAllQueues);
		});

		afterEach(function () {
			return config.wipeMongoCollections()
				.then(config.deleteAllQueues);
		});

		it('should insert metadata objects to mongo', function (done) {
			var params = generateValidParams();

			MetadataToMongoService.start(params,
				function _error() {
					errCallback(done);
				},
				function _done() {
					testMetadatasInserted(done);
				}
			);
		});

		it('should not insert metadata objects to mongo due to replay of job', function (done) {
			var params = generateValidParams();

			MetadataToMongoService.start(params,
				function _error() {
					errCallback(done);
				},
				function _done() {
					// allow status to be updated
					// dont worry since as long as done is called, insertion succeeded
					setTimeout(function () {
						MetadataToMongoService.start(params,
							function _error() {
								errCallback(done);
							},
							function _done() {
								testMetadatasInserted(done);
							}
						);
					}, 2000);
				}
			);
		});

		it('should not insert metadata objects to mongo due to lack of metadatas', function (done) {
			var params = generateValidParams();
			params.metadatas = [];

			MetadataToMongoService.start(params,
				function _error() {
					errCallback(done);
				},
				function _done() {
					testMetadatasNotInserted(done);
				}
			);
		});

		it('should produce VideoBoundingPolygon job with appropriate message', function (done) {
			var message = generateValidParams();
			config.testJobProduce(done, MetadataToMongoService, message, 'VideoBoundingPolygon');
		});

		it('should produce MetadataToCaptions job with appropriate message', function (done) {
			var message = generateValidParams();
			config.testJobProduce(done, MetadataToMongoService, message, 'MetadataToCaptions');
		});
	});

	describe('bad input tests', function () {
		it('lacks transactionId', function (done) {
			var params = generateValidParams();
			params.transactionId = undefined;

			errornousInputTest(params, done);
		});
	});
});

function errornousInputTest(params, done) {
	MetadataToMongoService.start(params,
		function _error() {
			done();
		},
		function _done() {
			done(new Error('metadata to mongo service did not recognize errornous input.'));
		});
}

function testMetadatasInserted(done) {
	VideoMetadata.count({})
		.then(function (count) {
			expect(count).to.equal(_expectedParsedDataObjects.length);
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

function testMetadatasNotInserted(done) {
	VideoMetadata.count({})
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
	done(new Error('metadata to mongo service errored.'));
}

function generateValidParams() {
	return {
		transactionId: _transactionId,
		metadatas: _expectedParsedDataObjects
	};
}
