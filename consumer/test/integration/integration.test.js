var spawn = require('child-process-promise').spawn,
	Promise = require('bluebird');

var config = require('../config');
var JobsService = require('replay-jobs-service');

var _childProcesses = [];

describe('integration tests', function () {
	before(function () {
		config.resetEnvironment();
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues)
			.then(() => liftConsumers());
	});

	after(function () {
		return config.wipeMongoCollections()
			.then(config.deleteAllQueues)
			.then(() => closeConsumers());
	});

	describe('save-video-service', function () {
	});
});

function liftConsumers() {
	var consumersPromises = [];
	var jobsConfig = JobsService.getAllJobsConfig();
	jobsConfig.forEach(function (jobConfig) {
		var jobName = jobConfig.type;

		var promise = spawn('node', ['../index.js', jobName]);
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
}
