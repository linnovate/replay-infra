var rabbit = require('replay-rabbitmq'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video'),
	JobsService = require('replay-jobs-service'),
	_ = require('lodash');

var config = require('../config'),
	AttachVideoToMetadataService = require('../../processing-services/attach-video-to-metadata-service');

var _transactionId;

describe('attach-video-to-metadata tests', function() {
	before(function() {
		config.resetEnvironment();
		return config.connectServices()
			.then(config.wipeMongoCollections)
			.then(config.getValidMetadataObjects)
			.then(config.deleteAllQueues);
	});

	after(function() {
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues);
	});

	describe('sanity tests', function() {
		beforeEach(function() {
			return config.wipeMongoCollections()
				.then(config.generateJobStatus)
				.then(function(jobStatus) {
					_transactionId = jobStatus.id;
					return Promise.resolve();
				})
				.then(config.deleteAllQueues);
		});

		afterEach(function() {
			return config.wipeMongoCollections();
		});

		it('should attach videos to metadata in case video arrives after metadata', function(done) {
			var metadatas, params;

			generateValidParams()
				.then(function(_params) {
					params = _params;
					// remove metadatas as we only want to send video
					params.metadatas = undefined;
				})
				.then(generateAndSaveMetadatas)
				.then(function(_metadatas) {
					metadatas = _metadatas;
					// generate video with overlapping time to metadata
					var startTime = metadatas[0].timestamp;
					var endTime = config.addMinutes(startTime, 30);
					return generateAndSaveVideo(startTime, endTime);
				})
				.then(function(video) {
					params.video = video;
					AttachVideoToMetadataService.start(params,
						function _error() {
							errCallback(done);
						},
						function _done() {
							testMetadatasUpdated(video.id, metadatas.length, done);
						}
					);
				})
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		it('should attach videos to metadata in case metadata arrives after video', function(done) {
			var params;

			generateValidParams()
				.then(function(_params) {
					params = _params;
					return Promise.resolve();
				})
				.then(function() {
					// generate video with overlapping time to metadata
					var startTime = params.metadatas[0].timestamp;
					var endTime = config.addMinutes(startTime, 30);
					return generateAndSaveVideo(startTime, endTime);
				})
				.then(function() {
					AttachVideoToMetadataService.start(params,
						function _error() {
							errCallback(done);
						},
						function _done() {
							testMetadatasProduced(done);
						}
					);
				})
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});
	});

	describe('bad input tests', function() {
		it('lacks transactionId', function(done) {
			var params = generateValidParams();
			params.transactionId = undefined;

			errornousInputTest(params, done);
		});

		it('lacks sourceId', function(done) {
			var params = generateValidParams();
			params.sourceId = undefined;

			errornousInputTest(params, done);
		});

		it('lacks metadatas and video', function(done) {
			var params = generateValidParams();
			params.metadatas = undefined;
			params.video = undefined;

			errornousInputTest(params, done);
		});
	});
});

function errornousInputTest(params, done) {
	AttachVideoToMetadataService.start(params,
		function _error() {
			done();
		},
		function _done() {
			done(new Error('attach video to metadata service did not recognize errornous input.'));
		});
}

function testMetadatasProduced(testDone) {
	console.log('Validating that metadatas were produced to MetadataToMongoQueue...');
	config.getValidMetadataObjects()
		.then(function(metadatas) {
			var queueName = JobsService.getQueueName('MetadataToMongo');
			return rabbit.consume(queueName, 1, function(params, _error, _done) {
				expect(params.metadatas).to.have.lengthOf(metadatas.length);
				var metadatasWithoutVideoId = _.filter(params.metadatas, function(metadata) {
					return metadata.videoId === undefined;
				});
				expect(metadatasWithoutVideoId).to.have.lengthOf(0);
				// call done on the message just to wipe it
				_done();
				testDone();
			});
		});
}

function testMetadatasUpdated(videoId, metadatasLength, done) {
	VideoMetadata
		.count({
			videoId: videoId
		})
		.then(function(count) {
			expect(count).to.equal(metadatasLength);
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
	done(new Error('attach video to metadata service errored.'));
}

function generateValidParams() {
	var params = config.generateValidMessage();
	return config.getValidMetadataObjects()
		.then(function(metadatas) {
			return Promise.resolve({
				transactionId: _transactionId,
				metadatas: metadatas,
				sourceId: params.sourceId,
				video: {}
			});
		});
}

function generateAndSaveVideo(startTime, endTime) {
	var params = config.generateValidMessage();
	params.receivingMethod = {
		standard: 'VideoStandard',
		version: '0.9'
	};
	params.startTime = startTime;
	params.endTime = endTime;
	var videoParams = config.generateVideo(params, _transactionId);
	return Video.create(videoParams);
}

// generate and save metadatas without video id
function generateAndSaveMetadatas() {
	return config.getValidMetadataObjects()
		.then(function(metadatas) {
			var metadatasWithoutVideoId = _.map(metadatas, function(metadata) {
				metadata.videoId = undefined;
				return metadata;
			});
			return Promise.resolve(metadatasWithoutVideoId);
		})
		.then(function(metadatas) {
			return VideoMetadata.insertMany(metadatas);
		});
}
