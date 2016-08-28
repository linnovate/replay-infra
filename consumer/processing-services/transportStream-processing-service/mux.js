var ffmpeg = require('replay-ffmpeg');
var Promise = require('bluebird');
var path = require('path');

// export the process job for the video-standard version 0.9 (video/data).
module.exports = processTS;

var STORAGE_PATH = process.env.STORAGE_PATH;

function processTS(params) {
	if (!paramsIsValid(params)) {
		return Promise.reject(new Error('video-standard work with video/data, and there was none'));
	}
	var tsFilePath = params.fileRelativePath;
	// set the paths to the new files that will create.
	var relativePathTo = path.parse(tsFilePath);
	relativePathTo = path.join(STORAGE_PATH, relativePathTo.dir, relativePathTo.name);
	// set the storage path from the params or default.
	var storagePath = params.filesStoragePath || STORAGE_PATH;
	// set the path to the file.
	tsFilePath = path.join(storagePath, tsFilePath);
	return new Promise(function(resolve, reject) {
		// converting and extracting the data, wait until finishing the work and return promise.
		ffmpeg.convertAndExtract({ inputPath: tsFilePath, outputPath: relativePathTo });
		ffmpeg.on('finishConvertAndExtract', resolve);
		ffmpeg.on('errorOnConvertAndExtract', reject);
	});
}

// validate the params, check if there is both video and data path.
function paramsIsValid(params) {
	return (params && params.videoRelativePath && params.dataRelativePath);
}
