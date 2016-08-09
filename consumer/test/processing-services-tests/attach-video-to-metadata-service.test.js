var elasticsearch = require('replay-elastic'),
	rabbit = require('replay-rabbitmq');

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
				});
		});

		afterEach(function() {
			return config.wipeMongoCollections();
		});

		// it('should attach videos to metadata which arrives after the video was saved', function(done) {
		// 	var params = generateValidParams();
		// 	generateAndSaveMetadatas()
		// 		.then(function () {
		// 			return generateAndSaveVideo(params);
		// 		})
		// 		.then(function(video) {
		// 			video.receivingMethod = {
		// 				standard: 'VideoStandard',
		// 				version: '0.9'
		// 			};
		// 			params.video = video;
		// 			AttachVideoToMetadataService.start(params,
		// 				function _error() {
		// 					errCallback(done);
		// 				},
		// 				function _done() {
		// 					testMetadatasProduced(done);
		// 				}
		// 			);
		// 		})
		// 		.catch(function(err) {
		// 			if (err) {
		// 				done(err);
		// 			}
		// 		});
		// });
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

function testMetadatasProduced(done) {
	var metadatas = config.getValidMetadataObjects();
	var queueName = JobsService.getQueueName('MetadataToMongo');
	rabbit.comsume(queueName, 1, function(params, _error, _done) {
		expect(params.metadatas).to.have.lengthOf(metadatas.length);
		var metadatasWithoutVideoId = _.filter(params.metadatas, function(metadata) {
			return metadata.videoId == undefined;
		});
		expect(metadatasWithoutVideoId).to.have.lengthOf(0);
	});
}

function testMetadatasInserted(done) {
	VideoMetadata.count({})
		.then(function(count) {
			expect(count).to.equal(_expectedParsedDataObjects.length);
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

function testMetadatasNotInserted(done) {
	VideoMetadata.count({})
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
	done(new Error('attach video to metadata service errored.'));
}

function generateValidParams() {
	var params = config.generateValidMessage();
	var metadatas = config.getValidMetadataObjects();

	return {
		transactionId: _transactionId,
		metadatas: metadatas,
		sourceId: params.sourceId,
		video: {}
	};
}

function generateAndSaveVideo(params) {
	return Video.create(config.generateVideo(params));
}

// generate and save metadatas without video id
function generateAndSaveMetadatas() {
	return getValidMetadataObjects()
		.then(function(metadatas) {
			var metadatasWithoutVideoId = _.map(metadatas, function(metadata){
				metadata.videoId = undefined;
				return metadata;
			});
			return Promise.resolve(metadatasWithoutVideoId);
		})
		.then(function(metadatas) {
			return VideoMetadata.insertMany(metadatas);
		});
}
