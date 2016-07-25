var chai = require('chai');
var execComand = require('child_process');
//var sinon = require('sinon');
var assert = chai.assert;
var event = require('../../../video-recorder/services/EventEmitterSingleton');
var streamListener = require('../../../video-recorder/services/StreamListener');

function start() {
	streamListenerService();
}

function streamListenerService() {
	describe('StreamListener', startListen);
}

function startListen() {
	describe('#startListen() -', tests);
}

function tests() {
	inputTests();
	behaviorTests();
}

function inputTests() {
	describe('inputs test -', function() {
		it('should reject when there is no params', function(done) {
			streamListener.startListen()
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the params is empty', function(done) {
			streamListener.startListen({})
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the params object is like {Port,Ip}', function(done) {
			streamListener.startListen({ Ip: '123.1.2.3', Port: 12345 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when there is no port', function(done) {
			streamListener.startListen({ ip: '1.1.1.1' })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when there is no ip', function(done) {
			streamListener.startListen({ port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not string', function(done) {
			streamListener.startListen({ ip: 1234, port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			streamListener.startListen({ ip: 'abcd', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			streamListener.startListen({ ip: 'a.d.v.b', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			streamListener.startListen({ ip: '256.0.0.1', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			streamListener.startListen({ ip: '44.a.0.3', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			streamListener.startListen({ ip: '1.1.0', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the port is not valid in many ways, like: abcd, 1a1b, -300', function(done) {
			streamListener.startListen({ ip: '1.1.0', port: 'abcd' })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the port is not valid in many ways, like: abcd, 1a1b, -300', function(done) {
			streamListener.startListen({ ip: '1.1.0', port: '1a1b' })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the port is not valid in many ways, like: abcd, 1a1b, -300', function(done) {
			streamListener.startListen({ ip: '1.1.0', port: '-300' })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should work with Port as string', function(done) {
			this.timeout(10000);
			streamListener.startListen({ ip: '238.1.0.8', port: '5555' })
				.then(function(res) {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		});

		it('should work with Port as number', function(done) {
			this.timeout(10000);
			streamListener.startListen({ ip: '238.1.0.8', port: 5555 })
				.then(function(res) {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		});

		it('should work when insert "localhost" in the IP parameter', function(done) {
			this.timeout(10000);
			streamListener.startListen({ ip: 'LocalHost', port: 5555 })
				.then(function(res) {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		});

		it('should work normally with right IP and Port', function(done) {
			this.timeout(2000);
			streamListener.startListen({ ip: '238.44.2.1', port: 5555 })
				.then(function(res) {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		});
	});
}

function behaviorTests() {
	describe('behavior test -', function() {
		this.timeout(10000);
		it('should failed when the address is unavailable', function(done) {
			streamListener.startListen({ ip: '0.0.0.0', port: 80 })
				.then(function(res) {
					done('worked but it shouldn\'t');
				})
				.catch(function(err) {
					console.log(err);
					done();
				});
		});
	});
	describe('integration test -', function() {
		var tmpPorc = null;
		before(function() {
			tmpPorc = execComand.spwan('tsplay ./Test/src/Sample_Ts_File_For_Testing.ts 0.0.0.0:5555');
		});

		after(function() {
			tmpPorc.stdin.pause();
			tmpPorc.kill('SIGKILL');
		});
		it('should Emit event "StreamingData" when data is streaming', function(done) {
			streamListener.startListen({ ip: '0.0.0.0', port: 5555 })
				.then(function(res) {
					event.on('StreamingData', function tempFunc() {
						event.removeListener('StreamingData', tempFunc);
						done();
					});
				})
				.catch(function(err) {
					assert.fail(null, null, 'the method should work but somthing happend : ' + err);
					done();
				});
		});
	});
}

start();
