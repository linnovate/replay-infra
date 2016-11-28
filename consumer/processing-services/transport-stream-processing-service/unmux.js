var ffmpeg = require('replay-ffmpeg');
var Promise = require('bluebird'),
	mkdirp = require('mkdirp');
var path = require('path'),
	fs = require('fs');

// export the process job for the video-standard version 0.9 (video/data).
module.exports = processTS;

function processTS(params) {
	if (!paramsIsValid(params)) {
		return Promise.reject(new Error('there is missing parameters for the proccesing'));
	}

	// prepare the paths to the ffmpeg job.
	var pathsForFFmpeg = preparePath(params);
	return new Promise(function(resolve, reject) {
		// check the file type.
		if (params.hardCoded) {
			demoXML(pathsForFFmpeg.outputPath, function() {
				ffmpeg
					.convertToMp4({
						inputPath: pathsForFFmpeg.inputPath,
						outputPath: pathsForFFmpeg.outputPath,
						divideToResolutions: true
					});
				ffmpeg.once('FFmpeg_finishConverting', function(paths) {
					if (params.fileType !== 'Video' && params.fileType !== 'Telemetry') {
						paths.dataPath = pathsForFFmpeg.outputPath + '.data';
					}
					resolve(paths);
				});
				ffmpeg.on('FFmpeg_errorOnConverting', reject);
			});
		} else {
			switch (params.fileType) {
				case ('Video'):
					{
						ffmpeg
						.convertToMp4({
							inputPath: pathsForFFmpeg.inputPath,
							outputPath: pathsForFFmpeg.outputPath,
							divideToResolutions: true
						});
						ffmpeg.once('FFmpeg_finishConverting', resolve);
						ffmpeg.on('FFmpeg_errorOnConverting', reject);
						break;
					}
				case ('Telemetry'):
					{
						ffmpeg.extractData({ inputPath: pathsForFFmpeg.inputPath, outputPath: pathsForFFmpeg.outputPath });
						ffmpeg.on('FFmpeg_finishExtractData', resolve);
						ffmpeg.on('FFmpeg_errorOnExtractData', reject);
						break;
					}
				default:
					return reject(new Error('could not recognize the file type'));
			}
		}
	});
}

// validate the params, check if there is at least on of the paths.
function paramsIsValid(params) {
	if (!process.env.STORAGE_PATH) {
		return false;
	}
	return (params && params.fileRelativePath && params.fileType);
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
	var captureFilePath = path.join(process.env.STORAGE_PATH, params.fileRelativePath);

	var fileRelativePath = path.parse(params.fileRelativePath);

	var outputPath = path.join(process.env.STORAGE_PATH, fileRelativePath.dir);
	// create new path if dont exist.
	checkPathAndCreate(outputPath);
	// add the name of the file (without the extention).
	outputPath = path.join(outputPath, fileRelativePath.name);

	return { inputPath: captureFilePath, outputPath: outputPath };
}

function demoXML(datapath, cb) {
	fs.createReadStream(path.join(__dirname, '/demo-data.xml')).pipe(fs.createWriteStream(datapath + '.data'));
	cb();
}
