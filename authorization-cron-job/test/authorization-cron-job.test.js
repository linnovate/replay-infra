var assert = require('chai').assert;
var expect = require('chai').expect;
var config = require('./config');
var Mission = require('replay-schemas/Mission');
var missionService = require('../services/MissionService');
var Promise = require('bluebird');
var interval = (process.env.SET_AUTH_INTERVAL || 1) * 60000;
var buffer = 3000;

describe('Handle Mission flow', function() {
	before(function(done) {
		config.connectMongo()
			.then(config.wipeCollections)
			.then(config.liftAuthCronJob)
			.then(config.prepareDataForTest)
			.then(() => done())
			.catch(function(err) {
				if (err) {
					done(err);
				}
			});
	});

	after(function(done) {
		console.log('after operation');
		config.killAuthCronJob()
			.then(config.wipeCollections)
			.then(() => done())
			.catch(function(err) {
				if (err) {
					done(err);
				}
			});
	});

	describe('Test new mission', function() {

		describe('check that the mission has related to the video', function() {
			it('check missions video compartments', function(done) {
				this.timeout(interval + buffer);
				sleep(interval).then(() => {
					Mission.find({
						$and: [{ missionName: 'test mission' }, {
							videoStatus: 'handled'
						}]
					}).then(function(mission) {
						assert.notEqual(mission[0].videoCompartments.length, 0);
						done();
					});
				});
			});
		});

		describe('check that the mission has bounding polygon', function() {
			it('check missions bounding polygon', function(done) {
				this.timeout(interval + buffer);
				Mission.find({
					$and: [{ missionName: 'test mission' }, {
						videoStatus: 'handled'
					}]
				}).then(function(mission) {
					assert.notEqual(mission[0].boundingPolygon.length, 0);
					done();
				});
			});
		});

		describe('check that the new Mission has been handled', function() {
			it('is Mission handled', function(done) {
				Mission.find({
					$and: [{ missionName: 'test mission' }, {
						videoStatus: 'handled'
					}]
				}).then(function(docs) {
					if (docs.length === 0) {
						assert.fail('no docs found', 'expected to find docs');
					} else {
						assert.isOk(docs, 'Document handled as expected');
					}
					done();
				});
			});
		});
	});

	describe('Test updated mission', function() {

		before(function(done) {
			console.log('update status to updated');
			config.updateTestMission('updated')
				.then(() => done())
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		describe('check that the mission has related to the video', function() {
			it('check missions video compartments', function(done) {
				this.timeout(interval + buffer);
				sleep(interval).then(() => {
					Mission.find({
						$and: [{ missionName: 'test mission' }, {
							videoStatus: 'handled'
						}]
					}).then(function(mission) {
						assert.notEqual(mission[0].videoCompartments.length, 0);
						done();
					});
				});
			});
		});

		describe('check that the mission has bounding polygon', function() {
			it('check missions bounding polygon', function(done) {
				this.timeout(interval + buffer);
				Mission.find({
					$and: [{ missionName: 'test mission' }, {
						videoStatus: 'handled'
					}]
				}).then(function(mission) {
					assert.notEqual(mission[0].boundingPolygon.length, 0);
					done();
				});
			});
		});

		describe('check that the new Mission has been handled', function() {
			it('is Mission handled', function(done) {
				this.timeout(interval + buffer);
				Mission.find({
					$and: [{ missionName: 'test mission' }, {
						videoStatus: 'handled'
					}]
				}).then(function(docs) {
					if (docs.length === 0) {
						assert.fail('no docs found', 'expected to find docs');
					} else {
						assert.isOk(docs, 'Document handled as expected');
					}
					done();
				});
			});
		});
	});

	describe('Test deleted mission', function() {

		before(function(done) {
			console.log('update status to deleted');
			config.updateTestMission('deleted')
				.then(() => done())
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		describe('check that the new Mission has been handled', function() {
			it('is Mission handled', function(done) {
				this.timeout(interval + buffer);
				sleep(interval).then(() => {
					Mission.find({
						$and: [{ missionName: 'test mission' }, {
							videoStatus: 'handledDeleted'
						}]
					}).then(function(docs) {
						if (docs.length === 0) {
							assert.fail('no docs found', 'expected to find docs');
						} else {
							assert.isOk(docs, 'Document handled as expected');
						}
						done();
					});
				});
			});
		});
	});

	describe('Test new video handling', function() {

		before(function(done) {
			console.log('adding new video to check that he relating to the right mission');
			config.addNewVideo()
				.then(() => done())
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		describe('check that the new video has been attached to mission', function() {
			it('is video handled', function(done) {
				this.timeout(interval + buffer);
				config.getNewVideo()
					.then(function(video) {
						return missionService.handleNewVideo(video)
							.then(function() {
								return Mission.find({
									$and: [{ missionName: 'test mission' }, {
										'videoCompartments.videoId': video._id
									}]
								}).then(function(docs) {
									console.log('docs found: ', docs);
									expect(docs.length).to.not.equal(0);
									done();
								});
							});
					})
					.catch(function(err) {
						if (err) {
							done(err);
						}
					});
			});
		});
	});
});

// sleep time expects milliseconds
function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}
