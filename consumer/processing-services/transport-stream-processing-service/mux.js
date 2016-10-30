var ffmpeg = require('replay-ffmpeg');
var Promise = require('bluebird'),
	mkdirp = require('mkdirp');
var path = require('path'),
	fs = require('fs');

// export the process job for the video-standard version 0.9 (video/data).
module.exports = processTS;

function processTS(params) {
	if (!paramsIsValid(params)) {
		return Promise.reject(new Error('video-standard work with video/data, and there was none'));
	}
	// prepare the paths to the ffmpeg job.
	var pathsForFFmpeg = preparePath(params);
	return new Promise(function(resolve, reject) {
		// converting and extracting the data, wait until finishing the work and return promise.
		ffmpeg
			.convertAndExtract({
				inputPath: pathsForFFmpeg.inputPath,
				outputPath: pathsForFFmpeg.outputPath,
				divideToResolutions: true
			});
		ffmpeg.on('FFmpeg_finishConvertAndExtract', resolve);
		ffmpeg.on('FFmpeg_errorOnConvertAndExtract', reject);
	});
}

// validate the params, check if there is both video and data path.
function paramsIsValid(params) {
	if (!process.env.CAPTURE_STORAGE_PATH || !process.env.STORAGE_PATH) {
		return false;
	}
	return (params && params.fileRelativePath);
}

// helper method that check if the path exist, if not create it.
function checkPathAndCreate(path) {
	try {
		fs.accessSync(path, fs.F_OK);
	} catch (err) {
		// when path not exist, create a new path
		mkdirp.sync(path);
	}
}

// handle all the path manipulation, create the given path if needed,return two paths,the original Path the the new Path
function preparePath(params) {
	var tsFilePath = path.join(process.env.CAPTURE_STORAGE_PATH, params.fileRelativePath);

	var fileRelativePath = path.parse(params.fileRelativePath);

	var outputPath = path.join(process.env.STORAGE_PATH, fileRelativePath.dir);
	// create new path if dont exist.
	checkPathAndCreate(outputPath);
	// add the name of the file (without the extention).
	outputPath = path.join(outputPath, fileRelativePath.name);

	return { inputPath: tsFilePath, outputPath: outputPath };
}
