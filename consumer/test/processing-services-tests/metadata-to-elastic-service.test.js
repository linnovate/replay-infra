var elasticsearch = require('replay-elastic');

var config = require('../config'),
	MetadataToElasticService = require('../../processing-services/metadata-to-elastic-service');

var _expectedParsedDataObjects;
var _transactionId;

describe('metadata-to-elastic-service tests', function() {
	before(function() {
		config.resetEnvironment();
		elasticsearch.connect(process.env.ELASTIC_HOST, process.env.ELASTIC_PORT);
		return config.connectServices()
			.then(config.wipeElasticIndices)
			.then(config.createElasticIndices)
			.then(config.getValidMetadataObjects)
			.then(function(expectedDataAsObjects) {
				_expectedParsedDataObjects = expectedDataAsObjects;
				return Promise.resolve();
			});
	});

	after(function() {
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues);
	});

	describe('sanity tests', function() {
		beforeEach(function() {
			return config.wipeElasticIndices()
				.then(config.createElasticIndices)
				.then(config.generateJobStatus)
				.then(function(jobStatus) {
					_transactionId = jobStatus.id;
					return Promise.resolve();
				});
		});

		afterEach(function() {
			return config.wipeElasticIndices()
				.then(config.createElasticIndices);
		});

		it('should insert metadata objects to elastic', function(done) {
			var params = generateValidParams();

			MetadataToElasticService.start(params,
				function _error() {
					errCallback(done);
				},
				function _done() {
					testMetadatasInserted(done);
				}
			);
		});

		it('should not insert metadata objects to elastic due to replay of job', function(done) {
			var params = generateValidParams();

			MetadataToElasticService.start(params,
				function _error() {
					errCallback(done);
				},
				function _done() {
					// allow status to be updated
					// dont worry since as long as done is called, insertion succeeded
					setTimeout(function() {
						MetadataToElasticService.start(params,
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

		it('should not insert metadata objects to elastic due to lack of metadatas', function(done) {
			var params = generateValidParams();
			params.metadatas = [];

			MetadataToElasticService.start(params,
				function _error() {
					errCallback(done);
				},
				function _done() {
					testMetadatasNotInserted(done);
				}
			);
		});
	});

	describe('bad input tests', function() {
		it('lacks transactionId', function(done) {
			var params = generateValidParams();
			params.transactionId = undefined;

			errornousInputTest(params, done);
		});
	});
});

function errornousInputTest(params, done) {
	MetadataToElasticService.start(params,
		function _error() {
			done();
		},
		function _done() {
			done(new Error('metadata to elastic service did not recognize errornous input.'));
		});
}

function testMetadatasInserted(done) {
	// wait some time before checking if data was inserted because it takes time to elastic to insert
	setTimeout(function() {
		elasticsearch.searchVideoMetadata()
			.then(function(resp) {
				expect(resp.hits.total).to.equal(_expectedParsedDataObjects.length);
			})
			.then(function() {
				done();
			})
			.catch(function(err) {
				if (err) {
					done(err);
				}
			});
	}, 2000);
}

function testMetadatasNotInserted(done) {
	elasticsearch.searchVideoMetadata()
		.then(function(resp) {
			expect(resp.hits.total).to.equal(0);
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
	done(new Error('metadata to elastic service errored.'));
}

function generateValidParams() {
	return {
		transactionId: _transactionId,
		metadatas: _expectedParsedDataObjects
	};
}
