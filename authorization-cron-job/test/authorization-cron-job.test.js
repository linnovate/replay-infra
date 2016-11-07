var assert = require('chai').assert;
var config = require('./config');
var Mission = require('replay-schemas/Mission');
var Promise = require('bluebird');
var interval = (process.env.SET_AUTH_INTERVAL || 1) * 60000;

describe('Handle Mission flow', function() {
	before(function(done) {
		config.connectMongo()
			.then(config.liftAuthCronJob)
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

	describe('insert new Mission', function() {
		it('add new Mission', function(done) {
			sleep(3000).then(() => {
				var missionObj = new Mission();
				missionObj.missionName = 'test mission';
				missionObj.sourceId = 123;
				var newStartDate = new Date();
				newStartDate.setDate(newStartDate.getDate() - 5000);
				var newEndDate = new Date();
				newEndDate.setDate(newEndDate.getDate() + 1);
				missionObj.startTime = newStartDate;
				missionObj.endTime = newEndDate;
				missionObj.destination = 'test destination';
				missionObj.videoStatus = 'new';
				console.log('insert');
				missionObj.save(function(err, Mission) {
					console.log('insert here');
					if (err) {
						console.log(err);
						assert.fail(err, 'condition');
					} else {
						assert.isOk(Mission, 'Mission inserted successfully');
					}
					done();
				}).catch(function(err) {
					if (err) {
						console.log(err);
					}
				});
			});
		});
	});

	describe('check that the new Mission has been handled', function() {
		it('is Mission handled', function(done) {
			sleep(interval).then(() => {
				Mission.find({
					$and: [{ missionName: 'test mission' }, {
						videoStatus: 'handled'
					}]
				}, function(err, docs) {
					if (err) {
						assert.fail(err, 'find error');
					} else if (docs.length === 0) {
						assert.fail('no docs found', 'expected to find docs');
					} else {
						assert.isOk(docs, 'Document handled as expected');
					}
					done();
				});
			});
		});
	});

	describe('update Mission', function() {
		it('update the test document', function(done) {
			Mission.update({
				$and: [{ missionName: 'test mission' }, {
					videoStatus: 'handled'
				}]
			}, {
				$set: {
					videoStatus: 'updated'
				}
			}, function(err, doc) {
				if (err) {
					assert.fail(err, 'error while update the test Document');
				} else {
					assert.isOk(doc, 'Document updated successfully');
				}
				done();
			});
		});
	});

	describe('check that the updated Mission has been handled', function() {
		it('is Mission handled', function(done) {
			sleep(interval).then(() => {
				Mission.find({
					$and: [{ missionName: 'test mission' }, {
						videoStatus: 'handled'
					}]
				}, function(err, docs) {
					if (err) {
						assert.fail(err, 'find error');
					} else if (docs.length === 0) {
						assert.fail('no docs found', 'expected to find docs');
					} else {
						assert.isOk(docs, 'Document handled as expected');
					}
					done();
				});
			});
		});
	});

	describe('delete Mission', function() {
		it('update the test document to deleted', function(done) {
			Mission.update({
				$and: [{ missionName: 'test mission' },
					{ videoStatus: 'handled' }
				]
			}, {
				$set: {
					videoStatus: 'deleted'
				}
			}, function(err, doc) {
				if (err) {
					assert.fail(err, 'error while update the test Document');
				} else {
					assert.isOk(doc, 'Document updated successfully');
				}
				done();
			});
		});
	});

	describe('check that the deleted Mission has been handled', function() {
		it('is Mission handled', function(done) {
			sleep(interval + 1000).then(() => {
				Mission.find({
					$and: [{ missionName: 'test mission' }, {
						videoStatus: 'handledDeleted'
					}]
				}, function(err, docs) {
					if (err) {
						assert.fail(err, 'find error');
					} else if (docs.length === 0) {
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

// sleep time expects milliseconds
function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}
