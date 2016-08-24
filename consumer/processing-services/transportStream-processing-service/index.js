var Promise = require('bluebird');

const CONSUMER_NAME = '#transportStream-proccesing#';

/*******************************************************************************************************
!!!!!!!!!!!!!!!now assumesing that the message come from video recorder!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*******************************************************************************************************/
module.exports.start = function(params, error, done) {
	if (!paramsIsValid(params)) {
		console.log(CONSUMER_NAME, 'params are not valid');
		return error();
	}

	proccesTS(params)
		.then(function(paths) {
			return produceJobs(params, paths);
		})
		.then(done)
		.catch(function(err) {
			console.log('error on:', CONSUMER_NAME, err);
			error();
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
function proccesTS(params) {
	var processTsMethod;
	// preaper the require params for the processing method.
	var paramsForMethod = {
		videoRelativePath: params.videoRelativePath,
		dataRelativePath: params.dataRelativePath
	};
	// check the reciving method standart
	switch (params.receivingMethod.standard) {
		case 'VideoStandard':
			// check the reciving method version
			switch (params.receivingMethod.version) {
				case '0.9':
					processTsMethod = require('./unmux');
					break;
				case '1.0':
					processTsMethod = require('./mux');
					break;
				default:
					return Promise.reject(new Error(CONSUMER_NAME + 'Unsupported version for video-standard'));
			}
			break;
		case 'stanag':
			// check the reciving method version
			switch (params.receivingMethod.version) {
				case '4609':
					processTsMethod = require('./mux');
					break;
				default:
					return Promise.reject(new Error(CONSUMER_NAME + 'Unsupported version for stanag'));
			}
			break;
		default:
			return Promise.reject(new Error(CONSUMER_NAME + 'Unsupported standard'));
	}
	// activate the processing method
	return processTsMethod(paramsForMethod);
}

function produceJobs(params, paths) {
	/*
	need to know what the next job before writing the method.
	*/
}
