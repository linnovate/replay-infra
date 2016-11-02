var rabbit = require('replay-rabbitmq'),
	mongoose = require('mongoose');

var rabbitHost = process.env.RABBITMQ_HOST || 'localhost';
var startTime = new Date();
var endTime = addMinutes(startTime, 30);

rabbit.connect(rabbitHost)
	.then(function() {
		var message = {
			sourceId: '123',
			videoFileName: 'sample.ts',
			dataFileName: 'sample.data',
			contentDirectoryPath: '/',
			baseName: 'sample',
			requestFormat: 'mp4',
			receivingMethod: {
				standard: 'VideoStandard',
				version: '1.0'
			},
			startTime: startTime,
			endTime: endTime,
			transactionId: new mongoose.Types.ObjectId()
		};
		return rabbit.produce('NewVideosQueue', message);
	})
	.catch(function(err) {
		console.log(err);
	})
	.finally(function() {
		setTimeout(() => process.exit(), 3000);
	});

function addMinutes(date, minutes) {
	return new Date(date.getTime() + minutes * 60000);
}
