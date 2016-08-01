var sails = require('sails');

before(function(done) {
	// Increase the Mocha timeout so that Sails has enough time to lift.
	this.timeout(5000);

	sails.lift({
		port: 1339,
		settings: {
			services: {
				kaltura: {
					server: 'http://localhost',
					port: '80',
					partnerId: 101
				}
			}
		}
	}, function(err, server) {
		if (err) {
			return done(err);
		}
		// here you can load fixtures, etc.
		done(err, sails);
	});
});

after(function(done) {
	// here you can clear fixtures, etc.
	sails.lower(done);
});
