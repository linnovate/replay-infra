var rabbit = require('replay-rabbitmq'),
	mongoose = require('mongoose');

var rabbitHost = process.env.RABBITMQ_HOST || 'localhost';
var startTime = new Date();
var endTime = addMinutes(startTime, 30);

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
			startTime: startTime,
			endTime: endTime,
			transactionId: new mongoose.Types.ObjectId()
		};
		rabbit.produce('NewVideosQueue', message);
	})
	.catch(function(err) {
		console.log(err);
	});

function addMinutes(date, minutes) {
	return new Date(date.getTime() + minutes * 60000);
}
