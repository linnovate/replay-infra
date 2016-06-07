var JobsService = require('JobsService');

module.exports = {
	start: function(req, res) {
		handleMessage({
			type: 'MetadataParser',
			params: {
				videoId: 'someVideoId',
				relativePath: 'someVideoId.data',
				method: {
					standard: 'VisionStandard',
					version: 1.0
				}
			}
		});
	}
}

function handleMessage(message) {
	// detect service job type
	var jobType = process.env.JOB_TYPE;
	// JOB_TYPE can be empty (handle all jobs), or a specific known JOB TYPE.
	// message.type must be a known specific job.
	if ((jobType && !JobsService.isKnownJobType(jobType)) ||
		!JobsService.isKnownJobType(message.type)) {
		console.log('Bad job type was inserted');
		return;
	}

	// in case we are handling all job types, or,
	// the job type is of our type
	if (!jobType || message.type === jobType) {
		var serviceName = JobsService.getServiceName(message.type);
		service = require('../../services/ProcessingServices/' + serviceName);
		if (service)
			service.start(message.params);
		else
			console.log('Bad service name');
		return;
	}
}
