var ffmpeg = require('replay-ffmpeg');
var Promise = require('bluebird');

// export the process job for the video-standard version 0.9 (video/data).
module.exports = processTS;

function processTS(params) {
	if (!paramsIsValid(params)) {
		return Promise.reject('video-standard work with video/data, and there was none');
	}

	var tsFilePath = params.videoRelativePath || params.dataRelativePath;
	return new Promise(function(resolve, reject) {
		// check if the path is for video.
		if (params.videoRelativePath) {
			ffmpeg.convertToMp4(tsFilePath);
			ffmpeg.on('finishConvertToMp4', resolve);
			ffmpeg.on('errorOnConvertToMp4', reject);
		} else {
			// the path is for data.
			ffmpeg.extractData(tsFilePath);
			ffmpeg.on('finishExtractData', resolve);
			ffmpeg.on('errorOnExtractData', reject);
		}
	});
}

// validate the params, check if there is at least on of the paths.
function paramsIsValid(params) {
	return (params && (params.videoRelativePath || params.dataRelativePath));
}
