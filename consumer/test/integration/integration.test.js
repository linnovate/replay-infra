'use strict';

var path = require('path'),
	fs = require('fs'),
	spawn = require('child_process').spawn;

var config = require('../config');
var JobsService = require('replay-jobs-service'),
	JobStatus = require('replay-schemas/JobStatus'),
	rabbit = require('replay-rabbitmq'),
	Promise = require('bluebird');

var rimraf = Promise.promisify(require('rimraf')),
	copyFolder = Promise.promisify(require('ncp').ncp);

var _childProcesses = [],
	_tmpFolder = '/tmp';
// used in combination with 'use strict' because of a bug that this variable becomes /tmp/tmp.../tmp
const _newStoragePath = path.join(process.env.STORAGE_PATH, _tmpFolder);

describe('integration tests', function () {
	before(function (done) {
		config.resetEnvironment();
		process.env.CAPTURE_STORAGE_PATH = path.join(_newStoragePath, 'capture');

		createTempFolder()
			.then(() => {
				process.env.STORAGE_PATH = _newStoragePath;
				return Promise.resolve();
			})
			.then(config.connectServices)
			.then(config.wipeMongoCollections)
			.then(config.deleteAllQueues)
			.then(liftConsumers)
			.then(() => {
				setTimeout(done, 4000);
				return Promise.resolve();
			})
			.catch((err) => {
				if (err) {
					done(err);
				}
			});
	});

	after(function (done) {
		config.connectServices()
			.then(wipeTempFolder)
			.then(config.wipeMongoCollections)
			.then(config.deleteAllQueues)
			.then(closeConsumers)
			.then(() => done())
			.catch((err) => {
				if (err) {
					done(err);
				}
			});
	});

	describe('sanity tests', function () {
		it('should perform all jobs successfuly', function (done) {
			var timeout = 45 * 1000;
			this.timeout(timeout);

			var message = config.generateMessageForTsProcessing();
			rabbit.produce('TransportStreamProcessingQueue', message)
				.then(setTimeout(() => validateJobsSucceed(done), timeout - 3 * 1000));
		});
	});
});

function validateJobsSucceed(done) {
	JobStatus
		.find({})
		.then(function (jobStatuses) {
			expect(jobStatuses).to.have.lengthOf(1);
			var jobStatus = jobStatuses[0];
			console.log('Statuses:', jobStatus.statuses);
			expect(jobStatus.statuses).to.have.lengthOf(JobsService.getAllJobConfigs().length);
			done();
		})
		.catch(function (err) {
			done(err);
		});
}

function liftConsumers() {
	// var consumersPromises = [];
	var jobsConfig = JobsService.getAllJobConfigs();
	jobsConfig.forEach(function (jobConfig) {
		var jobName = jobConfig.type;

		var childProcess = spawn('node', ['index.js', jobName]);
		// track the child process
		_childProcesses.push(childProcess);

		// redirect outputs
		childProcess.stdout.on('data', function (data) {
			console.log('%s job stdout: ', jobName, data.toString());
		});
		childProcess.stderr.on('data', function (data) {
			console.log('%s job stderr: ', jobName, data.toString());
		});
		// consumersPromises.push(promise);
	});

	// return Promise.all(consumersPromises);
	return Promise.resolve();
}

function closeConsumers() {
	_childProcesses.forEach(function (proc) {
		proc.kill('SIGINT');
	});
	return Promise.resolve();
}

function createTempFolder() {
	if (!fs.existsSync(_newStoragePath)) {
		fs.mkdirSync(_newStoragePath);
	}
	return copyFolder(process.env.STORAGE_PATH, _newStoragePath);
}

function wipeTempFolder() {
	return rimraf(_newStoragePath);
}
