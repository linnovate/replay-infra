var BusService = require('BusService'),
	fs = require('fs'),
	JobsService = require('JobsService'),
	_ = require('lodash');

// notify we're up, and check input
console.log('Post processing consumer is up!');
logEnvironVariables();

// create bus
BusService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);
// consume the finished videos queue to know when a video has finished
BusService.consume(getFinishedVideosQueueName(), handleNewVideoMessages);

function logEnvironVariables() {
	console.log('Redis host: ', process.env.REDIS_HOST);
	console.log('Redis port: ', process.env.REDIS_PORT);
	console.log('Redis password: ', process.env.REDIS_PASSWORD);
}

// Although we could hardcode the queue name since the producer consumes
// only one queue, I decided to take it from the queues file so the
// procedure will stay organized in a certain structure.
// If one day the queue name will be changed, it will be changed transparently
// in the queues file, and no code will be affected.
function getFinishedVideosQueueName() {
	var queues = JSON.parse(fs.readFileSync('../queues-config/queues.json', "utf8"));
	if (queues.FinishedVideosQueue)
		return queues.FinishedVideosQueue.name;
	else
		throw "Error finding the finished videos queue name.";
}

// Although the producer should consume one job type from queue,
// which is the OnVideoFinish, to keep things arranged, make sure
// that the job is intended to him (also would prevent bugs in the future).
function handleNewVideoMessages(message) {
	var jobType = 'OnVideoFinish';

	if (!JobsService.isKnownJobType(jobType) || !JobsService.isKnownJobType(message.type)) {
		console.log('Bad job type was inserted.');
		return;
	}

	// check if message is destinated for us
	if (message.type === jobType) {
		var serviceName = JobsService.getServiceName(message.type);
		service = require('./services/' + serviceName);
		if (service)
			service.start(message.params);
		else
			console.log('Bad service name');
		return;
	}
}
