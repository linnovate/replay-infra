var rabbit = require('replay-rabbitmq'),
	VideoMetadata = require('replay-schemas/VideoMetadata'),
	Video = require('replay-schemas/Video'),
	JobsService = require('replay-jobs-service'),
	moment = require('moment'),
	_ = require('lodash');

var config = require('../config'),
	AttachVideoToMetadataService = require('../../processing-services/attach-video-to-metadata-service');

var _transactionId;
// haven't used new Date() for easier tests
var _now = moment.utc('1/1/2000').toDate();

// this is a mapping used to diverse the homogenous created metadatas,
// so they will have different sourceIds and different time intervals,
// so the test will be complex enough.
var sampleSourceIdToTimeMapping = {
	'100': [
		[_now, config.addMinutes(_now, 15)],
		[config.addMinutes(_now, 16), config.addMinutes(_now, 30)]
	],
	'101': [
		[_now, config.addMinutes(_now, 30)]
	],
	'102': [
		[_now, config.addMinutes(_now, 10)],
		[config.addMinutes(_now, 11), config.addMinutes(_now, 20)],
		[config.addMinutes(_now, 21), config.addMinutes(_now, 30)]
	]
};

// In order to check that the metadatas were given correct videoIds, I have to know
// what is the expected result from the AttachVideoToMetadata.
// I could have used the same logic of the service to check the results, but if I had a bug
// in the logic then I would also have bug in checking the results are correct.
// Therefore, I have to test against hardcoded values.
var expectedVideosAmounts = [4, 3, 7, 2, 2, 2];

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

			generateValidDiversedParams()
				.then(function(_params) {
					params = _params;
					return Promise.resolve();
				})
				.then(generateAndSaveVideos)
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
				// check we have recieved all the metadatas (means nothing was lost)
				expect(params.metadatas).to.have.lengthOf(metadatas.length);

				var metadatasWithoutVideoId = _.filter(params.metadatas, function(metadata) {
					return metadata.videoId === undefined;
				});
				// now make sure everything has videoId, means we haven't missed anything
				expect(metadatasWithoutVideoId).to.have.lengthOf(0);

				// an index to run on expectedVideosAmounts
				var i = 0;
				// now validate that the videoIds assigned is the good one
				Object.keys(sampleSourceIdToTimeMapping).forEach(function(sourceId) {
					var timeIntervals = sampleSourceIdToTimeMapping[sourceId];

					timeIntervals.forEach(function(timeInterval) {
						// get the start & end time of this timeIntervals array
						var startTime = timeInterval[0];
						var endTime = timeInterval[1];

						// find all metadatas with the same sourceId and within the required times
						var metadatas = _.filter(params.metadatas, function(metadata) {
							return metadata.sourceId === sourceId && metadata.timestamp >= startTime && metadata.timestamp <= endTime;
						});

						expect(metadatas).to.have.lengthOf(expectedVideosAmounts[i++]);
					});
				});

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

function generateValidDiversedParams() {
	var _params;
	return generateValidParams()
		.then(function(params) {
			_params = params;
			return removeVideoIdFromMetadatas(_params.metadatas);
		})
		.then(diverseMetadatas)
		.then(function(metadatas) {
			_params.metadatas = metadatas;
			return Promise.resolve(_params);
		});
}

// create a complex and diversed metadatas according to sampleSourceIdToTimeMapping.
// 1. diverse by sourceId so there would be several different sourceIds
// 2. diverse by time intervals so there would be several time intervals
//    (mapped to different videos) in every sourceId chunk.
function diverseMetadatas(metadatas) {
	//
	// diverse sourceId
	//

	// first chunk the metadatas into N sub arrays, such that N is the amount of
	// sourceIds we have.
	var chunksLength = Math.ceil(metadatas.length / Object.keys(sampleSourceIdToTimeMapping).length);
	var metadatasChunks = _.chunk(metadatas, chunksLength);
	// now that metadatas are chunked into N sub arrays, modify each sub array
	// with its own different sourceId
	metadatasChunks.forEach(function(metadatasArr, i) {
		var sourceId = Object.keys(sampleSourceIdToTimeMapping)[i];
		metadatasArr.forEach(function(metadata) {
			metadata.sourceId = sourceId;
		});
	});
	// flatten metadatas to single array
	metadatas = [].concat.apply([], metadatasChunks);
	// group metadatas by sourceId
	var groupedMetadatasBySourceId = _.groupBy(metadatas, 'sourceId');

	//
	// diverse times
	//

	// for every group of the same sourceId metadatas, apply the matching time intervals
	Object.keys(groupedMetadatasBySourceId).forEach(function(sourceId) {
		// extract the metadatas of the group and it's time intervals
		var metadatasChunk = groupedMetadatasBySourceId[sourceId];
		var timeIntervals = sampleSourceIdToTimeMapping[sourceId];

		// group the metadatas into N sub arrays, such that N is the amount of
		// timeIntervals we have for this sourceId.
		var chunksLength = Math.ceil(metadatasChunk.length / timeIntervals.length);
		var metadatasChunksByTimeIntervals = _.chunk(metadatasChunk, chunksLength);
		// now metadatas are chunked into N sub arrays, modify each with its timeIntervals
		metadatasChunksByTimeIntervals.forEach(function(metadatasArr, j) {
			var interval = timeIntervals[j];
			var startTime = interval[0];
			var endTime = interval[1];

			metadatasArr.forEach(function(metadata, k) {
				// advance timestamps by minutes
				var timestamp = config.addMinutes(startTime, k);
				// make sure we haven't passed the endTime
				if (timestamp > endTime) {
					timestamp = endTime;
				}

				metadata.timestamp = timestamp;
			});
		});
	});
	console.log('Diveresed:', JSON.stringify(metadatas));
	return Promise.resolve(metadatas);
}

// generate videos according to sampleSourceIdToTimeMapping
function generateAndSaveVideos() {
	var generateVideosPromises = [];

	Object.keys(sampleSourceIdToTimeMapping).forEach(function(sourceId) {
		var timeIntervals = sampleSourceIdToTimeMapping[sourceId];
		timeIntervals.forEach(function(timeInterval) {
			var startTime = timeInterval[0];
			var endTime = timeInterval[1];
			generateVideosPromises.push(generateAndSaveVideo(startTime, endTime, sourceId));
		});
	});

	return Promise.all(generateVideosPromises);
}

function generateAndSaveVideo(startTime, endTime, sourceId) {
	var params = config.generateValidMessage();
	params.receivingMethod = {
		standard: 'VideoStandard',
		version: '0.9'
	};
	if (sourceId) {
		params.sourceId = sourceId;
	}
	params.startTime = startTime;
	params.endTime = endTime;
	var videoParams = config.generateVideo(params, _transactionId);
	return Video.create(videoParams);
}

// generate and save metadatas without video id
function generateAndSaveMetadatas() {
	return config.getValidMetadataObjects()
		.then(function(metadatas) {
			var metadatasWithoutVideoId = removeVideoIdFromMetadatas(metadatas);
			return Promise.resolve(metadatasWithoutVideoId);
		})
		.then(function(metadatas) {
			return VideoMetadata.insertMany(metadatas);
		});
}

function removeVideoIdFromMetadatas(metadatas) {
	return _.map(metadatas, function(metadata) {
		metadata.videoId = undefined;
		return metadata;
	});
}
