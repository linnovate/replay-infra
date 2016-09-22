var spawn = require('child-process-promise').spawn,
	Promise = require('bluebird');

var config = require('../config');
var JobsService = require('replay-jobs-service'),
	rabbit = require('replay-rabbitmq');

var _childProcesses = [];

describe('integration tests', function () {
	before(function (done) {
		config.resetEnvironment();
		config.connectServices()
			.then(config.wipeMongoCollections)
			.then(config.deleteAllQueues)
			.then(liftConsumers)
			.then(setTimeout(() => done(), 4000));
	});

	after(function () {
		return config.connectServices()
			.then(config.wipeMongoCollections)
			.then(config.deleteAllQueues)
			.then(closeConsumers);
	});

	describe('sanity tests', function () {
		it('should perform all jobs successfuly', function(done) {
			var message = config.generateMessageForTsProcessing();
			rabbit.produce('TransportStreamProcessingQueue', message)
				.then(setTimeout(() => Promise.resolve(), 5000))
				.then(() => validateJobsSucceed())
				.then(done);

		});
	});
});

function validateJobsSucceed() {
	return Promise.resolve();
}

function liftConsumers() {
	var consumersPromises = [];
	var jobsConfig = JobsService.getAllJobConfigs();
	jobsConfig.forEach(function (jobConfig) {
		var jobName = jobConfig.type;

		var promise = spawn('node', ['index.js', jobName]);
		var childProcess = promise.childProcess;
		// track the child process
		_childProcesses.push(childProcess);

		// redirect outputs
		childProcess.stdout.on('data', function (data) {
			console.log('%s job stdout: ', jobName, data.toString());
		});
		childProcess.stderr.on('data', function (data) {
			console.log('%s job stderr: ', jobName, data.toString());
		});

		consumersPromises.push(promise);
	});

	return Promise.all(consumersPromises);
}

function closeConsumers() {
	_childProcesses.forEach(function(proc) {
		proc.kill('SIGINT');
	});
	return Promise.resolve();
}
