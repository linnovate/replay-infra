// The service job is to handle differnent mission statuses (new/updated/deleted), and attach
// the videos according to the mission definition (source and times).
// the videos are converted to video compartment object, that holds the data for queries,
// and play - like relative start time, duration and bounding polygon.

// message structure: { type: mission/video ,id: _mongoId, status: new/update/delete}

var Promise = require('bluebird');
var MissionHandler = require('./services/handle-mission');
var JobsService = require('replay-jobs-service');
var logger = require('./services/service-helper').logger;
var _transactionId;
var _jobStatusTag = 'attache-video-to-mission';

module.exports.start = function(params, error, done) {
	logger.info('AttachVideoToMission service started for parameters: %s', params);
	if (!validateInput(params)) {
		logger.error('Some paramertes are missing: %s', params);
		return error();
	}

	_transactionId = params.transactionId;

	attachVideoToMission(params)
		.then(() => updateJobStatus())
		.then(function() {
			logger.info('Calling done and updating job status');
			done();
			return Promise.resolve();
		})
		.catch(function(err) {
			if (err) {
				logger.error(err);
				error();
			}
		});
};

function validateInput(params) {
	// we always need transactionId
	if (!params.transactionId) {
		return false;
	}

	// we might receive video metadatas or video
	if ((params.type === 'mission' || params.type === 'video') && params.id) {
		return true;
	}

	return false;
}

function attachVideoToMission(params) {
	logger.info('attach video to mission.');

	switch (params.type) {
		case 'mission':
			return handleMission(params);
		case 'video':
			return handleVideo(params);
		default:
			return Promise.reject(new Error('invalid object type'));
	}
}

function handleVideo(params) {
	return MissionHandler.handleNewVideo(params.id);
}

function handleMission(params) {
	switch (params.status) {
		case 'new':
			return MissionHandler.handleNewMission(params.id);
		case 'update':
			return MissionHandler.handleUpdatedMission(params.id);
		case 'delete':
			return MissionHandler.handleDeletedMission(params.id);
		default:
			return Promise.reject(new Error('invalid object status'));
	}
}

// update job status, swallaw errors so they won't invoke error() on message
function updateJobStatus() {
	return JobsService.updateJobStatus(_transactionId, _jobStatusTag)
		.catch(function(err) {
			if (err) {
				logger.error(err);
			}
		});
}
