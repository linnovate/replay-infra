require('../../config');
var FetchService = require('../../../processing-services/provider-services/fetch');

describe('fetch service tests', function() {
	describe('bad input tests', function() {
		it('lacks provider', function(done) {
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
