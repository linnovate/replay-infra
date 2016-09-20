var config = require('../config');

var SaveVideoService = require('../../processing-services/save-video-service');
var Video = require('replay-schemas/Video'),
	rabbit = require('replay-rabbitmq'),
	JobsService = require('replay-jobs-service');


// Test that the service produces a message with the expected values

describe('integration tests', function () {
	before(function () {
		config.resetEnvironment();
		return config.connectServices()
			.then(config.wipeMongoCollections);
	});

	after(function () {
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues);
	});

	describe('save-video-service', function () {
	
	});
});
