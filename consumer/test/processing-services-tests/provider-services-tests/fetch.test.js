var config = require('../../config');
var FetchService = require('../../../processing-services/provider-services/fetch');

describe('fetch service tests', function() {
	before(function() {
		config.resetEnvironment();
	});

	describe('bad input tests', function() {
		it('lacks provider', function(done) {
			delete process.env.PROVIDER;

			FetchService.start({},
				function _error() {
					done();
				},
				function _done() {
					done(new Error('fetch service should have errored.'));
				});
		});
	});
});
