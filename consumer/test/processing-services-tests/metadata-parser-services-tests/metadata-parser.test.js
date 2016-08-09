var config = require('../../config');
var MetadataParser = require('../../../processing-services/metadata-parser-service');
var JobStatus = require('replay-schemas/JobStatus');

var _transactionId;
var _jobStatusTag = 'parsed-metadata';

describe('metadata parser service tests', function() {
	before(function() {
		config.resetEnvironment();
		return config.connectServices()
			.then(config.wipeMongoCollections);
	});

	afterEach(function() {
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues);
	});

	describe('sanity tests', function() {
		beforeEach(function(done) {
			return config.generateJobStatus()
				.then(function(jobStatus) {
					_transactionId = jobStatus.id;
					return Promise.resolve();
				})
				.then(function() {
					done();
				})
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		afterEach(function(done) {
			return config.wipeMongoCollections()
				.then(function() {
					done();
				})
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		it('should update job status', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = _transactionId;
			MetadataParser.start(message,
				function _error() {
					done(new Error('metadata parser has errored.'));
				},
				function _done() {
					verifyJobStatusUpdated(done);
				});
		});

		it('should not update job status', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = _transactionId;
			MetadataParser.start(message,
				function _error() {
					done(new Error('metadata parser has errored.'));
				},
				function _done() {
					verifyAnotherUpdateDoesntOccur(message, done);
				});
		});
	});

	describe('bad input tests', function() {
		afterEach(function() {
			config.resetEnvironment();
		});

		it('lacks relative path to data', function(done) {
			var message = config.generateValidMessage();
			message.relativePathToData = undefined;
			MetadataParser.start(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('metadata parser service should have errored.'));
				});
		});

		it('lacks method', function(done) {
			var message = config.generateValidMessage();
			message.receivingMethod = undefined;
			MetadataParser.start(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('metadata parser service should have errored.'));
				});
		});

		it('lacks method standard', function(done) {
			var message = config.generateValidMessage();
			message.receivingMethod.standard = undefined;
			MetadataParser.start(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('metadata parser service should have errored.'));
				});
		});

		it('lacks method version', function(done) {
			var message = config.generateValidMessage();
			message.receivingMethod.version = undefined;
			MetadataParser.start(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('metadata parser service should have errored.'));
				});
		});

		it('lacks transaction id', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = undefined;
			MetadataParser.start(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('metadata parser service should have errored.'));
				});
		});

		it('lacks storage path', function(done) {
			var message = config.generateValidMessage();
			delete process.env.STORAGE_PATH;
			MetadataParser.start(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('metadata parser service should have errored.'));
				});
		});
	});
});

function verifyJobStatusUpdated(done) {
	JobStatus.findById(_transactionId)
		.then(function(jobStatus) {
			expect(jobStatus).to.not.equal(undefined);
			expect(jobStatus.statuses).to.contain(_jobStatusTag);

			done();
		})
		.catch(function(err) {
			if (err) {
				done(err);
			}
		});
}

function verifyAnotherUpdateDoesntOccur(message, done) {
	JobStatus.findById(_transactionId)
		.then(function(jobStatus) {
			var lastUpdateTime = new Date(jobStatus.updatedAt);
			MetadataParser.start(message,
				function _error() {
					done(new Error('metadata parser has errored.'));
				},
				function _done() {
					JobStatus.findById(_transactionId)
						.then(function(jobStatus) {
							expect(jobStatus).to.not.equal(undefined);
							expect(jobStatus).to.have.property('updatedAt');
							var newUpdateTime = new Date(jobStatus.updatedAt);
							expect(lastUpdateTime).to.equalDate(newUpdateTime);
							done();
						})
						.catch(function(err) {
							if (err) {
								done(err);
							}
						});
				});
		})
		.catch(function(err) {
			if (err) {
				done(err);
			}
		});
}
