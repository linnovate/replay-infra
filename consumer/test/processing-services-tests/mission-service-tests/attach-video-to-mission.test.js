var expect = require('chai').expect;
var config = require('./mission-config');
var Mission = require('replay-schemas/Mission');
var VideoMetadata = require('replay-schemas/VideoMetadata');
var videoToMission = require('../../../processing-services/mission-service/index');
var ObjectId = require('mongoose').Types.ObjectId;

describe('Handle Mission flow', function() {
	before(function(done) {
		config.connectMongo()
			.then(() => {
				return config.wipeCollections();
			})
			.then(() => {
				return config.prepareDataForTest();
			})
			.then(() => {
				done();
			})
			.catch(function(err) {
				if (err) {
					console.log('error!!');
					done(err);
				}
			});
	});

	after(function(done) {
		console.log('after operation');
		config.wipeCollections()
			.then(() => done())
			.catch(function(err) {
				if (err) {
					done(err);
				}
			});
	});

	describe('Test new mission', function() {
		before(function(done) {
			try {
				var params = {
					type: 'mission',
					id: new ObjectId('58218be91e4fd50981b921e7'),
					status: 'new',
					transactionId: new ObjectId('58218be91e4fd50981b921e1')
				};
				videoToMission.start(params,
					function _error() {
						done('failed');
					},
					function _done() {
						done();
					});
			} catch (err) {
				console.log('error!!', err);
			}
		});

		describe('check that the new mission has related to the video', function() {
			it('check missions video compartments', function(done) {
				checkMissionVideoCompartment(done, 1);
			});
		});

		describe('check that the new mission has bounding polygon', function() {
			it('check missions bounding polygon', function(done) {
				checkVideoBoundingPolygonExist(done);
			});
		});

		describe('check that the metadata has attached to the new mission', function() {
			it('is Mission metadata updated with the correct mission id', function(done) {
				checkMetadataMissionId(done);
			});
		});
	});

	describe('Test deleted mission', function() {
		before(function(done) {
			var params = {
				type: 'mission',
				id: new ObjectId('58218be91e4fd50981b921e7'),
				status: 'delete',
				transactionId: new ObjectId('58218be91e4fd50981b921e1')
			};
			videoToMission.start(params,
				function _error() {
					done('failed');
				},
				function _done() {
					done();
				});
		});

		describe('check that the deleted missions videos removed', function() {
			it('check that the deleted mission do not havevideo compartments', function(done) {
				checkMissionVideoCompartment(done, 0);
			});
		});

		describe('check that the deleted mission bounding polygon has removed', function() {
			it('check deleted mission removed bounding polygon', function(done) {
				checkVideoBoundingPolygonNotExist(done);
			});
		});

		describe('check that the mission videos metadata mission id removed', function() {
			it('is Mission id removed from metadata', function(done) {
				checkMetadataMissionIdDeleted(done);
			});
		});
	});

	describe('Test updated mission', function() {
		before(function(done) {
			var params = {
				type: 'mission',
				id: new ObjectId('58218be91e4fd50981b921e7'),
				status: 'update',
				transactionId: new ObjectId('58218be91e4fd50981b921e1')
			};
			videoToMission.start(params,
				function _error() {
					done('failed');
				},
				function _done() {
					done();
				});
		});

		describe('check that the updated mission has related to the video', function() {
			it('check updated missions video compartments', function(done) {
				checkMissionVideoCompartment(done, 1);
			});
		});

		describe('check that the updated mission has bounding polygon', function() {
			it('check updated mission has bounding polygon', function(done) {
				checkVideoBoundingPolygonExist(done);
			});
		});

		describe('check that the metadata has attached to the updated mission', function() {
			it('is Mission metadata updated with the correct mission id', function(done) {
				checkMetadataMissionId(done);
			});
		});
	});

	describe('Test new video handling', function() {
		before(function(done) {
			console.log('adding new video to check that he relating to the right mission');
			config.addNewVideo()
				.then(() => {
					var params = {
						type: 'video',
						id: new ObjectId('57b576ae3a70e1cf65b0b828'),
						transactionId: new ObjectId('58218be91e4fd50981b921e1')
					};
					videoToMission.start(params,
						function _error() {
							done('failed');
						},
						function _done() {
							done();
						});
				})
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		describe('check that the new video has related to the right mission', function() {
			it('check that the new video added to the mission video compartments list', function(done) {
				checkMissionVideoCompartment(done, 2);
			});
		});

		describe('check that the mission has bounding polygon after adding new video', function() {
			it('check missions bounding polygon', function(done) {
				checkVideoBoundingPolygonExist(done);
			});
		});

		describe('check that the new video metadata has attached to the mission', function() {
			it('is video metadata updated with the correct mission id', function(done) {
				checkVideoMetadataMissionId(done);
			});
		});
	});
});

function checkMissionVideoCompartment(done, expextedCount) {
	return Mission.find({
		$and: [{ missionName: 'test mission' }]
	}).then(function(mission) {
		expect(mission[0].videoCompartments.length).to.equal(expextedCount);
		done();
	});
}

function checkVideoBoundingPolygonExist(done) {
	return Mission.find({
		$and: [{ missionName: 'test mission' }]
	}).then(function(mission) {
		expect(mission[0].boundingPolygon.length).to.not.equal(0);
		done();
	});
}

function checkVideoBoundingPolygonNotExist(done) {
	return Mission.find({
		$and: [{ missionName: 'test mission' }]
	}).then(function(mission) {
		expect(mission[0].boundingPolygon).to.equal(undefined);
		done();
	});
}

function checkMetadataMissionId(done) {
	return VideoMetadata.find({ missionId: new ObjectId('58218be91e4fd50981b921e7') })
		.then(function(metadata) {
			expect(metadata.length).to.not.equal(0);
			done();
		});
}

function checkVideoMetadataMissionId(done) {
	return config.getNewVideo()
		.then(function(video) {
			return VideoMetadata.find({ $and: [{ videoId: video._id }, { missionId: { $exists: true } }] })
				.then(function(metadata) {
					expect(metadata.length).to.not.equal(0);
					done();
				});
		});
}

function checkMetadataMissionIdDeleted(done) {
	return VideoMetadata.find({ missionId: new ObjectId('58218be91e4fd50981b921e7') })
		.then(function(metadata) {
			expect(metadata.length).to.equal(0);
			done();
		});
}
