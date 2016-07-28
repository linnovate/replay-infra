var chai = require('chai');
var assert = chai.assert;
var event = require('../../services/EventEmitterSingleton');
var rewire = require('rewire');
var fileWatcher = rewire('../../services/FileWatcher');
var sinon = require('sinon');

function start() {
	fileWatcherService();
}

function fileWatcherService() {
	describe('FileWatcher', methods);
}

function methods() {
	describe('#startWatchFile', startWatchFileTests);
	describe('#stopWatchFile', stopWatchFileTests);
}

/**************************************************************************
						startWatchFile Tests
***************************************************************************/

function startWatchFileTests() {
	describe('#inputValidations', startWatchFileInputValidations);
	describe('#behaviorTests', startWatchFileBehaviorTests);
}

function startWatchFileInputValidations() {
	/*	afterEach(function() {
			fileWatcher._stopTimer(fileWatcher._fileTimer);
		});*/
	it('should reject with null parameter object', function(done) {
		fileWatcher.startWatchFile()
			.then(function() {
				assert.isTrue(false);
				done();
			})
			.catch(function() {
				done();
			});
	});
	it('should reject when params is empty object', function(done) {
		fileWatcher.startWatchFile({})
			.then(function() {
				assert.isTrue(false);
				done();
			})
			.catch(function() {
				done();
			});
	});

	it('should reject when there is no path in the param object', function(done) {
		fileWatcher.startWatchFile({ timeToWait: 10000 })
			.then(function() {
				assert.isTrue(false);
				done();
			})
			.catch(function() {
				done();
			});
	});
}

function startWatchFileBehaviorTests() {
	afterEach(function() {
		fileWatcher.stopWatchFile();
	});

	it('should change the waiting time to the time that given', function(done) {
		this.timeout(3000);
		var spy = sinon.spy();
		event.on('FileWatchStop', spy);
		fileWatcher.startWatchFile({ timeToWait: 500, path: './Test/src/Sample_Ts_File_For_Testing.ts' })
			.then(function(timeThatWaited) {
				setTimeout(function() {
					assert.equal(spy.called, true);
					done();
				}, 2000);
			})
			.catch(function(err) {
				done(err);
			});
	});

	it('should stop the watcher and return the time he wait every time', function(done) {
		this.timeout(3000);
		var spy = sinon.spy();
		event.on('FileDontExist_FileWatcher', spy);
		fileWatcher.startWatchFile({ timeToWait: 500, path: './bla.js' })
			.then(function() {
				setTimeout(function() {
					assert.equal(spy.called, true);
					done();
				}, 2000);
			})
			.catch(function(err) {
				done(err);
			});
	});
}

/***************************************************************************/

/**************************************************************************
						stopWatchFile Tests
***************************************************************************/

function stopWatchFileTests() {

}

/***************************************************************************/

start();
