var config = require('../../config.js');
var mux = require('../../../processing-services/transport-stream-processing-service/mux.js');
// var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var fluentFFmpeg = require('fluent-ffmpeg');
var Promise = require('bluebird');

function startTests() {
	describe('\nmux.js test:', function() {
		initAssets();
		describe('\ninput Tests:', function() {
			inputTests();
		});
		describe('\nerror Tests:', function() {
			beforeEach(function(done) {
				process.env.STORAGE_PATH = path.join(process.env.STORAGE_PATH, 'ts-output-mux');
				done();
			});
			errorTests();
		});
		describe('\nsuccess Tests:', function() {
			beforeEach(function(done) {
				process.env.STORAGE_PATH = path.join(process.env.STORAGE_PATH, 'ts-output-mux');
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
}

function handleRejection(err) {
	console.log(err);
}

function inputTests() {
	it('should reject when there is not parameter object', function(done) {
		mux()
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it('should reject when the parameter object is empty', function(done) {
		mux({})
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it('should reject when the parameter object property "fileRelativePath" is missing', function(done) {
		mux({ foo: 'bar' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it("should reject when there isn't STORAGE_PATH in the process environments", function(done) {
		delete process.env.STORAGE_PATH;
		mux({ fileRelativePath: '/sample.ts' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function() {
				done();
			});
	});

	it("should reject when there isn't CAPTURE_STORAGE_PATH in the process environments", function(done) {
		delete process.env.CAPTURE_STORAGE_PATH;
		mux({ fileRelativePath: '/sample.ts' })
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
		mux({ fileRelativePath: '/notExistFile.ts' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function(err) {
				handleRejection(err);
				done();
			});
	});

	it('should reject when the input dont have telemetry', function(done) {
		mux({ fileRelativePath: '/sample-without-data.ts' })
			.then(function() {
				done(new Error('should failed'));
			})
			.catch(function(err) {
				handleRejection(err);
				done();
			});
	});

	it('should reject when the input dont have video', function(done) {
		mux({ fileRelativePath: '/data.data' })
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
	it('should make mp4 format video with flavors and make the data file just like in the example', function(done) {
		this.timeout(30000);
		mux({ fileRelativePath: '/sample.ts' })
			.then(function(paths) {
				console.log('the paths that given:', paths);
				var productFile = fs.readFileSync(path.join(process.env.CAPTURE_STORAGE_PATH, 'data.data'));
				var expectedFile = fs.readFileSync(paths.dataPath);
				if (productFile.toString() === expectedFile.toString()) {
					checkVideoProducts(paths, done);
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
