var ffmpeg = require('replay-ffmpeg');
var Promise = require('bluebird');

// export the process job for the video-standard version 0.9 (video/data).
module.exports = processTS;

function processTS(params) {
	if (!paramsIsValid(params)) {
		return Promise.reject('video-standard work with video/data, and there was none');
	}
	var videoPath = params.videoRelativePath,
		dataPath = params.dataRelativePath;
	return new Promise(function(resolve, reject) {
		// converting and extracting the data, wait until finishing the work and return promise.
		ffmpeg.convertAndExtract({ videoPath: videoPath, dataPath: dataPath });
		ffmpeg.on('finishConvertAndExtract', resolve);
		ffmpeg.on('errorOnConvertAndExtract', reject);
	});
}

// validate the params, check if there is both video and data path.
function paramsIsValid(params) {
	return (params && params.videoRelativePath && params.dataRelativePath);
}
