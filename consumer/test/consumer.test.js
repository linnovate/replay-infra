var config = require('./config');
var path = require('path');
var fork = require('child_process').fork;
var consumerPath = path.join(__dirname, '../index');

describe('consumer tests', function() {
	before(function() {
		config.resetEnvironment();
	});

	describe('bad input tests', function() {
		it('lacks job type', function(done) {
			var consumer = fork(consumerPath, undefined);
			consumer.on('close', function(exitCode) {
				expect(exitCode).to.equal(1);
				done();
			});
		});

		it('bad job type', function(done) {
			var consumer = fork(consumerPath, ['badJobType']);
			consumer.on('close', function(exitCode) {
				expect(exitCode).to.equal(1);
				done();
			});
		});

		it('lacks mongo database', function(done) {
			var consumer = fork(consumerPath, ['SaveVideo'], {
				env: {
					MONGO_DATABASE: undefined
				}
			});
			consumer.on('close', function(exitCode) {
				expect(exitCode).to.equal(1);
				done();
			});
		});

		it('lacks storage path', function(done) {
			var consumer = fork(consumerPath, ['SaveVideo'], {
				env: {
					STORAGE_PATH: undefined
				}
			});
			consumer.on('close', function(exitCode) {
				expect(exitCode).to.equal(1);
				done();
			});
		});
	});
});
