var Promise = require('bluebird');

const CONSUMER_NAME = '#video-proccesing#';

/*******************************************************************************************************
!!!!!!!!!!!!!!!now assumesing that the message come from video recorder!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*******************************************************************************************************/
module.exports.start = function(params, error, done) {
	if (!paramsIsValid(params)) {
		console.log(CONSUMER_NAME, 'params are not valid');
		return error();
	}

	proccesVideo(params)
		.then(function() {

		})
		.catch(function() {

		});
};

// validate the params.
function paramsIsValid(params) {
	// check the minimal requires for the message that send to the next job.
	if (!params || !params.sourceId || !params.receivingMethod || !params.transactionId) {
		return false;
	}

	// check the require for the reciving method.
	if (!params.receivingMethod || !params.receivingMethod.standard || !params.receivingMethod.version) {
		return false;
	}

	// check the require file path for processing.
	if (!params.videoRelativePath && !params.dataRelativePath) {
		return false;
	}

	return true;
}

// understand what ts file we deal (video/data/video and data) and manipulate it.
function proccesVideo(params) {
	switch (params.receivingMethod.standard) {
		case 'VideoStandard':
			switch (params.receivingMethod.version) {
				case '0.9':
					break;
				case '1.0':
					break;
				default:
					Promise.reject('Unsupported version for video-standard');
					break;
			}
			break;
		case 'stanag':
			switch (params.receivingMethod.version) {
				case '4609':
					break;
				default:
					Promise.reject('Unsupported version for stanag');
					break;
			}
			break;
		default:
			Promise.reject('Unsupported standard');
			break;
	}
}
