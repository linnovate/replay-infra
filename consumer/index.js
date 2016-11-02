var rabbit = require('replay-rabbitmq'),
	mongoose = require('mongoose'),
	bluebird = require('bluebird'),
	JobsService = require('replay-jobs-service');

var path = require('path');
var connectMongo = require('replay-schemas/connectMongo');
// set mongoose promise library
mongoose.Promise = bluebird.Promise;

// environment variables
var RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
var RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
var RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || 'guest';
var RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'guest';
var RABBITMQ_MAX_UNACKED_MESSAGES = parseInt(process.env.RABBITMQ_MAX_UNACKED_MESSAGES, 10) || 10;
var RABBITMQ_MAX_RESEND_ATTEMPTS = process.env.RABBITMQ_MAX_RESEND_ATTEMPTS;
var FAILED_JOBS_QUEUE_NAME = process.env.FAILED_JOBS_QUEUE_NAME;
var MONGO_HOST = process.env.MONGO_HOST;
var MONGO_PORT = process.env.MONGO_PORT;
var MONGO_DATABASE = process.env.MONGO_DATABASE;
var STORAGE_PATH = process.env.STORAGE_PATH;
var CAPTIONS_PATH = process.env.CAPTIONS_PATH;
var CAPTURE_STORAGE_PATH = process.env.CAPTURE_STORAGE_PATH;

// notify we're up, and check input
console.log('Consumer is up!');

// extract command line params
var JOB_TYPE = process.argv[2];
if (!isInputValid()) {
	console.log('Bad input was received.');
	process.exit(1);
}

connectMongo(MONGO_HOST, MONGO_PORT, MONGO_DATABASE)
	.then(connectRabbitMQ)
	.then(consumeRabbitMQ)
	.catch(function(err) {
		console.log(err);
		process.exit(1);
	});

// enforces basic validations on the environment input passed to process,
// such as mandatory parameters.
// later on, specific functions should enforce specific validations on their inputs
function isInputValid() {
	console.log('Job type is:', JOB_TYPE);
	console.log('RabbitMQ host:', RABBITMQ_HOST);
	console.log('RabbitMQ port:', RABBITMQ_PORT);
	console.log('RabbitMQ username:', RABBITMQ_USERNAME);
	console.log('RabbitMQ password:', RABBITMQ_PASSWORD);
	console.log('RabbitMQ max unacked messages amount:', RABBITMQ_MAX_UNACKED_MESSAGES);
	console.log('RabbitMQ max resend attempts:', RABBITMQ_MAX_RESEND_ATTEMPTS);
	console.log('RabbitMQ failed jobs queue:', FAILED_JOBS_QUEUE_NAME);
	console.log('Mongo host:', MONGO_HOST);
	console.log('Mongo port:', MONGO_PORT);
	console.log('Mongo database:', MONGO_DATABASE);
	console.log('Storage path:', STORAGE_PATH);
	console.log('Captions path:', CAPTIONS_PATH);
	console.log('Capture storage path:', CAPTURE_STORAGE_PATH);

	// check mandatory parameter we can't continue without
	if (!JobsService.isKnownJobType(JOB_TYPE) || !MONGO_DATABASE || !STORAGE_PATH) {
		return false;
	}

	return true;
}

function connectRabbitMQ() {
	return rabbit.connect(RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USERNAME, RABBITMQ_PASSWORD);
}

function consumeRabbitMQ() {
	// get the matching queue name of the job type
	var queueName = JobsService.getQueueName(JOB_TYPE);
	return rabbit.consume(queueName, RABBITMQ_MAX_UNACKED_MESSAGES, handleMessage);
}

function handleMessage(message, error, done) {
	console.log('Lifting appropriate service...');

	// get the appropriate service name and start it
	var serviceName = JobsService.getServiceName(JOB_TYPE);
	var service = require(path.join(__dirname, 'processing-services/', serviceName));
	if (service) {
		service.start(message, error, done);
	} else {
		console.log('Bad service name');
	}
	return;
}

