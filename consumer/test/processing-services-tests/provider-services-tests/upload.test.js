var config = require('../../config');
var UploadService = require('../../../processing-services/provider-services/upload');

describe('upload service tests', function() {
	before(function() {
		config.resetEnvironment();
	});

	describe('bad input tests', function() {
		it('lacks provider', function(done) {
			delete process.env.PROVIDER;
			UploadService.start({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('upload service should have errored.'));
				});
		});
	});
});
