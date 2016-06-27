var chai = require('chai');
var execComand = require('child_process');
var assert = chai.assert;
var event = require('../../../video-recorder/services/EventEmitterSingleton');
var StreamListener = require('../../../video-recorder/services/StreamListener')();

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
			StreamListener.startListen()
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the params is empty', function(done) {
			StreamListener.startListen({})
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the params object is like {Port,Ip}', function(done) {
			StreamListener.startListen({ Ip: '123.1.2.3', Port: 12345 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when there is no port', function(done) {
			StreamListener.startListen({ ip: '1.1.1.1' })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when there is no ip', function(done) {
			StreamListener.startListen({ port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not string', function(done) {
			StreamListener.startListen({ ip: 1234, port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			StreamListener.startListen({ ip: 'abcd', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			StreamListener.startListen({ ip: 'a.d.v.b', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			StreamListener.startListen({ ip: '256.0.0.1', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			StreamListener.startListen({ ip: '44.a.0.3', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should reject when the ip is not valid in many ways, like: abcd, a.d.v.b, 256.0.0.1, 44.a.0.3, 1.1.0', function(done) {
			StreamListener.startListen({ ip: '1.1.0', port: 1234 })
				.then(function() {
					assert.fail(null, null, 'didnt rejected');
				})
				.catch(done());
		});

		it('should work with Port as string', function(done) {
			this.timeout(10000);
			StreamListener.startListen({ ip: '238.1.0.8', port: '5555' })
				.then(function(res) {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		});

		it('should work with Port as number', function(done) {
			this.timeout(10000);
			StreamListener.startListen({ ip: '238.1.0.8', port: 5555 })
				.then(function(res) {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		});

		it('should work when insert "localhost" in the IP parameter', function(done) {
			this.timeout(10000);
			StreamListener.startListen({ ip: 'LocalHost', port: 5555 })
				.then(function(res) {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		});

		it('should work normally with right IP and Port', function(done) {
			this.timeout(2000);
			StreamListener.startListen({ ip: '238.44.2.1', port: 5555 })
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
		var tmpPorc = null;
		before(function() {
			tmpPorc = execComand.exec('tsplay ./Test/src/Sample_Ts_File_For_Testing.ts 0.0.0.0:5555');
		});

		after(function() {
			tmpPorc.kill('SIGINT');
		});

		it('should Emit event "StreamingData" when data is streaming', function(done) {
			this.timeout(5000);
			StreamListener.startListen({ ip: '0.0.0.0', port: 5555 })
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

		/*		it('should failed when the address is unavailable', function(done) {
					this.timeout(10000);
					StreamListener.startListen({ ip: '221.44.1.69', port: 5555 })
						.then(function(res) {
							done('worked but it shouldn\'t');
						})
						.catch(function(err) {
							console.log(err);
							done();
						});
				});*/
	});
}

start();
