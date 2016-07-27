var path = require('path'),
	fs = require('fs');

var Promise = require('bluebird');

var mkdirp = Promise.promisify(require('mkdirp')),
	removeFolder = Promise.promisify(require('rimraf'));

var config = require('../../../config');
var UploadService = require('../../../../processing-services/provider-services/providers/kaltura/upload-service');

var _tempDropFolderName = '/drop_folder';
var _transactionId;

describe('kaltura upload-service tests', function() {
	before(function() {
		return config.connectServices()
			.then(function() {
				return config.wipeMongoCollections();
			});
	});

	describe('sanity tests', function() {
		beforeEach(function(done) {
			process.env.DROP_FOLDER_PATH = path.join(process.env.STORAGE_PATH, _tempDropFolderName);
			return createDropFolder()
				.then(function() {
					return config.generateJobStatus();
				})
				.then(function(jobStatus) {
					_transactionId = jobStatus.id;
					return Promise.resolve();
				})
				.then(function() {
					done();
				})
				.catch(function(err) {
					if (err) {
						done(new Error('error in creating temp drop folder'));
					}
				});
		});

		afterEach(function(done) {
			removeDropFolder()
				.then(function() {
					return config.wipeMongoCollections();
				})
				.then(function() {
					done();
				})
				.catch(function(err) {
					if (err) {
						done(err);
					}
				});
		});

		it('should copy to folder', function(done) {
			this.timeout(15000);
			var message = config.generateValidMessage();
			message.transactionId = _transactionId;

			UploadService.upload(message,
				function _error() {
					done(new Error('kaltura upload service errored.'));
				},
				function _done() {
					isVideoExists(message, done);
				});
		});

		it('should not copy to folder due to replay of job', function(done) {
			this.timeout(15000);
			var message = config.generateValidMessage();
			message.transactionId = _transactionId;

			UploadService.upload(message,
				function _error() {
					done(new Error('kaltura upload service errored.'));
				},
				function _done() {
					UploadService.upload(message,
						function _error() {
							done(new Error('kaltura upload service errored.'));
						},
						function _done() {
							isVideoExists(message, done);
						});
				});
		});
	});

	describe('bad input tests', function() {
		beforeEach(function() {
			// reset the env variables
			require('../../../config');
		});

		it('lacks storage path', function(done) {
			delete process.env.STORAGE_PATH;
			UploadService.upload({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('upload service should have errored.'));
				});
		});

		it('lacks drop folder path', function(done) {
			delete process.env.DROP_FOLDER_PATH;
			UploadService.upload({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('upload service should have errored.'));
				});
		});

		it('lacks video relative path', function(done) {
			var message = config.generateValidMessage();
			message.videoRelativePath = undefined;
			UploadService.upload({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('upload service should have errored.'));
				});
		});

		it('lacks video name', function(done) {
			var message = config.generateValidMessage();
			message.videoName = undefined;
			UploadService.upload({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('upload service should have errored.'));
				});
		});

		it('lacks transaction id', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = undefined;
			UploadService.upload({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('upload service should have errored.'));
				});
		});

		it('lacks transaction id', function(done) {
			var message = config.generateValidMessage();
			message.transactionId = undefined;
			UploadService.upload({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('upload service should have errored.'));
				});
		});
	});
});

function isVideoExists(message, done) {
	var filepath = path.join(process.env.DROP_FOLDER_PATH, message.videoName);
	try {
		fs.accessSync(filepath, fs.F_OK);
		done();
	} catch (e) {
		done(new Error('file did not properly copy to drop folder'));
	}
}

function createDropFolder() {
	return mkdirp(process.env.DROP_FOLDER_PATH);
}

function removeDropFolder() {
	return removeFolder(process.env.DROP_FOLDER_PATH);
}
