var assert = require('chai').assert,
	sinon = require('sinon');
var fs = require('fs');
// exec = require('child_process').exec;
var ffmpeg = require('../../../video-recorder/services/FFmpegWrapper.js'),
	event = require('../../../video-recorder/services/EventEmitterSingleton');
// const STREAM_COMMAND = 'tsplay ./Test/src/Sample_Ts_File_For_Testing.ts 238.0.0.1:1234 -loop';

function test() {
	describe('FFmpeg Wrapper Testing', testMethods);
}

function testMethods() {
	testPublicMethods();
}

function testPublicMethods() {
	describe('Method: captureMuxedVideoTelemetry Testing', function() {
		this.timeout(5000);
		var params;
		beforeEach(function() {
			params = {
				inputs: ['./Test/src/Sample_Ts_File_For_Testing.ts'],
				duration: 10,
				dir: '/opt/239',
				file: 'now'
			};
		});
		describe('Inputs tests', function() {
			it('should reject on no duration suplied', function(done) {
				params.duration = undefined;
				ffmpeg.captureMuxedVideoTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no file suplied', function(done) {
				params.file = undefined;
				ffmpeg.captureMuxedVideoTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no directory suplied', function(done) {
				params.dir = undefined;
				ffmpeg.captureMuxedVideoTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no inputs suplied', function(done) {
				params.inputs = undefined;
				ffmpeg.captureMuxedVideoTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on empty inputs suplied', function(done) {
				params.inputs = [];
				ffmpeg.captureMuxedVideoTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
		});
		describe('Normal behavior tests', function() {
			describe('Test capturing with basic params', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegBegin', spy);
					ffmpeg.captureMuxedVideoTelemetry(params);
				});
				it('should emit FFmpegBegin event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
		describe('Error handling tests', function() {
			describe('Testing non muxed media', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegError', spy);
					params.inputs = ['./Test/src/NoMuxedVideo.mp4'];
					ffmpeg.captureMuxedVideoTelemetry(params);
				});
				it('should emit FFmpegError event on no muxed media', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
			describe('Testing unreal input file source', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegError', spy);
					params.inputs = ['/not/real/input.ts'];
					ffmpeg.captureMuxedVideoTelemetry(params);
				});
				it('should emit FFmpegError event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
		describe('Edge cases tests', function() {
			describe('Test handling 2 inputs', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegBegin', spy);
					params.inputs = ['./Test/src/Sample_Ts_File_For_Testing.ts', './Test/src/NoMuxedVideo.mp4'];
					ffmpeg.captureMuxedVideoTelemetry(params);
				});
				it('should emit FFmpegBegin event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
	});
	describe('Method: captureVideoWithoutTelemetry Testing', function() {
		this.timeout(5000);
		var params;
		beforeEach(function() {
			params = {
				inputs: ['./Test/src/Sample_Ts_File_For_Testing.ts'],
				duration: 10,
				dir: '/opt/239',
				file: 'now'
			};
		});
		describe('Inputs tests', function() {
			it('should reject on no duration suplied', function(done) {
				params.duration = undefined;
				ffmpeg.captureVideoWithoutTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no file suplied', function(done) {
				params.file = undefined;
				ffmpeg.captureVideoWithoutTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no directory suplied', function(done) {
				params.dir = undefined;
				ffmpeg.captureVideoWithoutTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no inputs suplied', function(done) {
				params.inputs = undefined;
				ffmpeg.captureVideoWithoutTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on empty inputs suplied', function(done) {
				params.inputs = [];
				ffmpeg.captureVideoWithoutTelemetry(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
		});
		describe('Normal behavior tests', function() {
			describe('Test capturing with basic params', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegBegin', spy);
					ffmpeg.captureVideoWithoutTelemetry(params);
				});
				it('should emit FFmpegBegin event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
		describe('Error handling tests', function() {
			describe('Testing unreal input file source', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegError', spy);
					params.inputs = ['/not/real/input.ts'];
					ffmpeg.captureVideoWithoutTelemetry(params);
				});
				it('should emit FFmpegError event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
		describe('Edge cases tests', function() {
			describe('Test handling 2 inputs', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegBegin', spy);
					params.inputs = ['./Test/src/Sample_Ts_File_For_Testing.ts', './Test/src/NoMuxedVideo.mp4'];
					ffmpeg.captureVideoWithoutTelemetry(params);
				});
				it('should emit FFmpegBegin event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
	});
	describe('Method: captureTelemetryWithoutVideo Testing', function() {
		this.timeout(5000);
		var params;
		beforeEach(function() {
			params = {
				inputs: ['./Test/src/Sample_Ts_File_For_Testing.ts'],
				duration: 10,
				dir: '/opt/239',
				file: 'now'
			};
		});
		describe('Inputs tests', function() {
			it('should reject on no duration suplied', function(done) {
				params.duration = undefined;
				ffmpeg.captureTelemetryWithoutVideo(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no file suplied', function(done) {
				params.file = undefined;
				ffmpeg.captureTelemetryWithoutVideo(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no directory suplied', function(done) {
				params.dir = undefined;
				ffmpeg.captureTelemetryWithoutVideo(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on no inputs suplied', function(done) {
				params.inputs = undefined;
				ffmpeg.captureTelemetryWithoutVideo(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
			it('should reject on empty inputs suplied', function(done) {
				params.inputs = [];
				ffmpeg.captureTelemetryWithoutVideo(params).then(
					function(command) {
						assert.isTrue(false);
						done();
					},
					function(error) {
						assert.equal(error, 'bad params suplied', 'got bad params..');
						done();
					});
			});
		});
		describe('Normal behavior tests', function() {
			describe('Test capturing with basic params', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegBegin', spy);
					ffmpeg.captureTelemetryWithoutVideo(params);
				});
				it('should emit FFmpegBegin event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
		describe('Error handling tests', function() {
			describe('Testing unreal input file source', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegError', spy);
					params.inputs = ['/not/real/input.ts'];
					ffmpeg.captureTelemetryWithoutVideo(params);
				});
				it('should emit FFmpegError event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
		describe('Edge cases tests', function() {
			describe('Test handling 2 inputs', function() {
				var spy;
				beforeEach(function() {
					spy = sinon.spy();
					event.on('FFmpegBegin', spy);
					params.inputs = ['./Test/src/Sample_Ts_File_For_Testing.ts', './Test/src/NoMuxedVideo.mp4'];
					ffmpeg.captureTelemetryWithoutVideo(params);
				});
				it('should emit FFmpegBegin event', function(done) {
					setTimeout(function() {
						assert.isTrue(spy.calledOnce);
						done();
					}, 2000);
				});
			});
		});
	});

	/* din Tests */

	describe('Method: convertMpegTsFormatToMp4', function() {
		it('should emit finish event + checking there is new file the convert', function(done) {
			this.timeout(11000);
			var spyOnSuccess = sinon.spy();
			var spyOnFailure = sinon.spy();

			event.on('FFmpegWrapper_errorOnConverting', spyOnFailure);
			event.on('FFmpegWrapper_finishConverting', spyOnSuccess);

			var handleConverting = function(command) {
				setTimeout(function() {
					if (spyOnFailure.called) {
						return done('FFmpegWrapper_errorOnConverting event was called');
					} else
					if (spyOnSuccess.called) {
						fs.stat('./Test/src/Sample_Ts_File_For_Testing.mp4', function(err, stat) {
							if (err) {
								return done(err);
							} else
							if (stat.size > 0) {
								return done();
							}
						});
					} else {
						done('no events was called');
					}
				}, 10000);
			};

			ffmpeg.convertMpegTsFormatToMp4({ filePath: './Test/src/Sample_Ts_File_For_Testing.ts' })
				.then(handleConverting)
				.catch(function(err) {
					done(err);
				});
		});
	});
}

test();
