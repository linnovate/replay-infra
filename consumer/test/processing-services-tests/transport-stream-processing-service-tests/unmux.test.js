var config = require('../../config.js');
var unmux = require('../../../processing-services/transport-stream-processing-service/unmux.js');
var rmdir = require('rmdir');
// var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var fluentFFmpeg = require('fluent-ffmpeg');
var Promise = require('bluebird');

function startTests() {
	describe('\nunmux.js test:', function() {
		initAssets();
		describe('\ninput Tests:', function() {
			inputTests();
		});
		describe('\nerror Tests:', function() {
			beforeEach(function(done) {
				process.env.STORAGE_PATH = path.join(process.env.STORAGE_PATH, 'ts-output-unmux');
				done();
			});
			errorTests();
		});
		describe('\nsuccess Tests:', function() {
			beforeEach(function(done) {
				process.env.STORAGE_PATH = path.join(process.env.STORAGE_PATH, 'ts-output-unmux');
				done();
			});
			successTests();
		});
	});
}

function initAssets() {
	beforeEach(function() {
		config.resetEnvironment();
	});
	after(function(done) {
		config.resetEnvironment();
		rmdir(path.join(process.env.STORAGE_PATH, 'ts-output-unmux'), done);
	});
}

function handleRejection(err) {
	console.log(err);
}

function inputTests() {
	it('should reject when there is not parameter object', function(done) {
		unmux()
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it('should reject when the parameter object is empty', function(done) {
		unmux({})
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it('should reject when the parameter object property "fileRelativePath" is missing', function(done) {
		unmux({ fileType: 'a' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it('should reject when the parameter object property "fileType" is missing', function(done) {
		unmux({ fileRelativePath: 'a' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it('should reject when the parameter object property "fileType" isnt "Telemetry" nor "Video"', function(done) {
		unmux({ fileRelativePath: 'a', fileType: 'hi' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it("should reject when there isn't STORAGE_PATH in the process environments", function(done) {
		delete process.env.STORAGE_PATH;
		unmux({ fileRelativePath: '/sample.ts', fileType: 'Telemetry' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it("should reject when there isn't CAPTURE_STORAGE_PATH in the process environments", function(done) {
		delete process.env.CAPTURE_STORAGE_PATH;
		unmux({ fileRelativePath: '/sample.ts', fileType: 'Telemetry' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});
}

function errorTests() {
	it('should reject when the input path isnt exist', function(done) {
		unmux({ fileRelativePath: '/notExistFile.ts', fileType: 'Video' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function(err) {
				handleRejection(err);
				done();
			});
	});

	it('should reject when the input define as Telemetry and there is no telemtry in the file', function(done) {
		unmux({ fileRelativePath: '/sample-without-data.ts', fileType: 'Telemetry' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function(err) {
				handleRejection(err);
				done();
			});
	});

	it('should reject when the input define as Video and there is no video in the file', function(done) {
		unmux({ fileRelativePath: '/data.data', fileType: 'Video' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function(err) {
				handleRejection(err);
				done();
			});
	});
}

function successTests() {
	it('should make mp4 format video with flavors', function(done) {
		this.timeout(30000);
		unmux({ fileRelativePath: '/sample.ts', fileType: 'Video' })
			.then(function(paths) {
				console.log('the paths that given:', paths);
				checkVideoProducts(paths, done);
			})
			.catch(function(err) {
				console.log('ffmpeg failed to execute the command:');
				console.log(err);
				done(new Error('ffmpeg failed, check the error above for more information'));
			});
	});

	it('should make data file just like in the example', function(done) {
		unmux({ fileRelativePath: '/sample.ts', fileType: 'Telemetry' })
			.then(function(paths) {
				var productFile = fs.readFileSync(path.join(process.env.CAPTURE_STORAGE_PATH, 'data.data'));
				var expectedFile = fs.readFileSync(paths.dataPath);
				if (productFile.toString() === expectedFile.toString()) {
					done();
				} else {
					done(new Error("the file that was created didn't created as expected"));
				}
			})
			.catch(function(err) {
				console.log('ffmpeg failed to execute the command:');
				console.log(err);
				done(new Error('ffmpeg failed, check the error above for more information'));
			});
	});
}

function checkVideoProducts(paths, done) {
	fluentFFmpeg.ffprobe(paths.videoPath, function(err, info) {
		if (err) {
			console.log(err);
			done(new Error('could not analyze the file see error above'));
		} else {
			Promise.all(paths.additionalPaths.map(checkProperties))
				.then(function() {
					done();
				})
				.catch(function(err) {
					done(err);
				});
		}
	});
}

function checkProperties(path) {
	return new Promise(function(resolve, reject) {
		fluentFFmpeg.ffprobe(path, function(err, info) {
			if (err) {
				return reject(err);
			}
			var format = info.format.format_name.includes('mp4');
			var relevantStream = info.streams.find(function(index) {
				return index.codec_type === 'video';
			});
			var dimension = (relevantStream.height === 360 || relevantStream.height === 480);
			if (format && dimension) {
				return resolve(true);
			}
			return reject(new Error('the flavors are not in the right format or in the right dimensions'));
		});
	});
}

startTests();
