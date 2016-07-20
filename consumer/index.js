var rabbit = require('replay-rabbitmq'),
	mongoose = require('mongoose'),
	elasticsearch = require('elasticsearch'),
	bluebird = require('bluebird'),
	JobsService = require('replay-jobs-service');

var connectMongo = require('replay-schemas/connectMongo');
var Promise = bluebird;

// set mongoose promise library
mongoose.Promise = bluebird.Promise;

// notify we're up, and check input
console.log('Consumer is up!');

// extract command line params
var jobType = process.argv[2];
if (!isInputValid()) {
	console.log('Bad input was received.');
	process.exit();
}

connectMongo(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE)
	.then(connectElasticSearch)
	.then(connectRabbitMQ)
	.then(consumeRabbitMQ)
	.catch(function(err) {
		console.log(err);
	});

// enforces basic validations on the environment input passed to process,
// such as mandatory parameters.
// later on, specific functions should enforce specific validations on their inputs
function isInputValid() {
	console.log('Job type is: ', jobType);
	console.log('RabbitMQ host: ', process.env.RABBITMQ_HOST);
	console.log('Mongo host: ', process.env.MONGO_HOST);
	console.log('Mongo port: ', process.env.MONGO_PORT);
	console.log('Mongo database: ', process.env.MONGO_DATABASE);
	console.log('Elastic host: ', process.env.ELASTIC_HOST);
	console.log('Elastic port: ', process.env.ELASTIC_PORT);
	console.log('Files storage path: ', process.env.STORAGE_PATH);

	// check mandatory parameter we can't continue without
	if (!JobsService.isKnownJobType(jobType) || !process.env.MONGO_DATABASE || !process.env.STORAGE_PATH) {
		return false;
	}

	return true;
}

function connectRabbitMQ() {
	var host = process.env.RABBITMQ_HOST || 'localhost';
	return rabbit.connect(host);
}

function consumeRabbitMQ() {
	// get the matching queue name of the job type
	var queueName = JobsService.getQueueName(jobType);
	var maxMessagesAmount = JobsService.getQueueMaxMessagesAmount(jobType);
	return rabbit.consume(queueName, maxMessagesAmount, handleMessage);
}

function handleMessage(message, err, done) {
	console.log('Received message: ', message);
	console.log('Lifting appropriate service...');

	// get the appropriate service name and start it
	var serviceName = JobsService.getServiceName(jobType);
	var service = require('./services/processing-services/' + serviceName);
	if (service) {
		service.start(message, err, done);
	} else {
		console.log('Bad service name');
	}
	return;
}

// connect to ElasticSearch once so the service won't have to re-create connection each time
function connectElasticSearch() {
	return new Promise(function(resolve, reject) {
		var host = process.env.ELASTIC_HOST || 'localhost';
		var port = process.env.ELASTIC_PORT || 9200;

		var uri = host + ':' + port;
		// connect to elastic
		// keep-alive is true by default, which means forever
		global.elasticsearch = new elasticsearch.Client({
			host: uri,
			log: ['error', 'warning']
		});

		console.log('Connected to elastic.');
		resolve();
	});
}
