var rabbit = require('replay-rabbitmq'),
	mongoose = require('mongoose');

var rabbitHost = process.env.RABBITMQ_HOST || 'localhost';

rabbit.connect(rabbitHost)
	.then(function() {
		var message = {
			sourceId: '123',
			videoName: 'sample.ts',
			videoRelativePath: 'sample.ts',
			dataRelativePath: 'sample.data',
			receivingMethod: {
				standard: 'VideoStandard',
				version: '1.0'
			},
			transactionId: new mongoose.Types.ObjectId()
		};
		rabbit.produce('NewVideosQueue', message);
	})
	.catch(function(err) {
		console.log(err);
	});
