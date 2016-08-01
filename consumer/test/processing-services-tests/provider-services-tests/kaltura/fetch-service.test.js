var Promise = require('bluebird'),
	Video = require('replay-schemas/Video'),
	KalturaService = require('replay-kaltura-service');

var config = require('../../../config');
var FetchService = require('../../../../processing-services/provider-services/providers/kaltura/fetch-service');

var _transactionId;
var _entryId;

describe('kaltura fetch-service tests', function() {
	before(function() {
		config.resetEnvironment();
		return config.connectServices()
			.then(function() {
				return config.wipeMongoCollections();
			})
			.then(function() {
				return KalturaService.initialize();
			})
			.then(function() {
				return KalturaService.generateMediaEntry();
			})
			.then(function(mediaEntry) {
				_entryId = mediaEntry.id;
			});
	});

	describe('sanity tests', function() {
		beforeEach(function(done) {
			return config.generateJobStatus()
				.then(function(jobStatus) {
					var message = config.generateValidMessage();
					message.transactionId = _transactionId = jobStatus.id;
					return createVideo(message);
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

		it('should update video in mongo', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = _transactionId;
			message.providerId = _entryId;

			FetchService.fetch(message,
				function _error() {
					done(new Error('kaltura fetch service errored.'));
				},
				function _done() {
					hasVideoUpdated(_transactionId, done);
				});
		});

		it('should not update video in mongo due to replay of job', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = _transactionId;
			message.providerId = _entryId;

			FetchService.fetch(message,
				function _error() {
					done(new Error('kaltura fetch service errored.'));
				},
				function _done() {
					// verify another update is not happening by looking whether providerId is set again
					verifyUpdateHasntOccured(message, done);
				});
		});
	});

	describe('bad input tests', function() {
		beforeEach(function() {
			// reset the env variables
			require('../../../config');
		});

		it('lacks provider id', function(done) {
			var message = {
				videoName: ''
			};
			FetchService.fetch(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('fetch service should have errored.'));
				});
		});

		it('lacks video name', function(done) {
			var message = {
				providerId: ''
			};
			FetchService.fetch(message,
				function _error() {
					done();
				},
				function _done() {
					done(new Error('fetch service should have errored.'));
				});
		});
	});
});

function createVideo(params) {
	return Video
		.create({
			sourceId: params.sourceId,
			relativePath: params.videoRelativePath,
			name: params.videoName,
			receivingMethod: params.receivingMethod,
			startTime: new Date(),
			endTime: new Date(),
			jobStatusId: params.transactionId
		});
}

function hasVideoUpdated(transactionId, done) {
	return Video
		.findOne({
			jobStatusId: transactionId
		})
		.then(function(video) {
			expect(video).to.not.equal(undefined);
			expect(video.provider).to.equal(process.env.PROVIDER);
			expect(video.providerId).to.not.equal(undefined);
			expect(video.providerData).to.not.equal(undefined);
			expect(video.status).to.equal('ready');

			return Promise.resolve();
		})
		.then(function() {
			done();
		})
		.catch(function(err) {
			if (err) {
				done(new Error('error verifying whether video has updated'));
			}
		});
}

function verifyUpdateHasntOccured(message, done) {
	return Video
		.update({ transactionId: _transactionId }, { providerId: undefined })
		.then(function() {
			FetchService.fetch(message,
				function _error() {
					done(new Error('kaltura fetch service errored.'));
				},
				function _done() {
					hasVideoUpdated(_transactionId, done);
				});
		})
		.catch(function(err) {
			if (err) {
				console.log(err);
			}
		});
}
