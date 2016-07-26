var ffmpeg = require('fluent-ffmpeg'),
	BluebirdPromise = require('bluebird');
var event = require('./EventEmitterSingleton');

const SERVICE_NAME = '#FFmpegWrapper#';

module.exports = {
	// Params object (e.g{inputs:<[inputs]>,Directory:<dir/dir2>,file:<filename>,duration:<sec/hh:mm:ss.xxx>})
	captureMuxedVideoTelemetry: function(params) {
		// setting the boolean requests to check params
		var checkBadParams = (!params.duration || !params.file || !params.dir || !params.inputs || params.inputs.length === 0);
		if (checkBadParams) {
			return BluebirdPromise.reject('bad params suplied');
		}
		console.log(SERVICE_NAME, 'capturing muxed!!!!!');
		// Building the FFmpeg command
		var builder = new BluebirdPromise(function(resolve, reject) {
			// FFmpeg command initialization
			var command = ffmpeg();
			// Resolving the command forward
			resolve(command);
		});

		// Start building command
		builder
			.then(function(command) {
				return initializeInputs(command, params);
			})
			.then(function(command) {
				return videoOutput(command, params);
			})
			.then(function(command) {
				return extractData(command, params);
			})
			.then(function(command) {
				return setEvents(command, params);
			})
			.then(function(command) {
				return runCommand(command);
			})
			.catch(function(err) {
				event.emit('FFmpegError', err);
			});

		return builder;
	},

	captureVideoWithoutTelemetry: function(params) {
		// setting the boolean requests to check params
		var checkBadParams = (!params.duration || !params.file || !params.dir || !params.inputs || params.inputs.length === 0);
		if (checkBadParams) {
			return BluebirdPromise.reject('bad params suplied');
		}
		// Building the FFmpeg command
		var builder = new BluebirdPromise(function(resolve, reject) {
			// FFmpeg command initialization
			var command = ffmpeg();
			// Resolving the command forward
			resolve(command);
		});

		// Start building command
		builder
			.then(function(command) {
				return initializeInputs(command, params);
			})
			.then(function(command) {
				return videoOutput(command, params);
			})
			.then(function(command) {
				return setEvents(command, params);
			})
			.then(function(command) {
				return runCommand(command);
			})
			.catch(function(err) {
				event.emit('FFmpegError', err);
			});

		return builder;
	},

	captureTelemetryWithoutVideo: function(params) {
		// setting the boolean requests to check params
		var checkBadParams = (!params.duration || !params.file || !params.dir || !params.inputs || params.inputs.length === 0);
		if (checkBadParams) {
			return BluebirdPromise.reject('bad params suplied');
		}
		// Building the FFmpeg command
		var builder = new BluebirdPromise(function(resolve, reject) {
			// FFmpeg command initialization
			var command = ffmpeg();
			// Resolving the command forward
			resolve(command);
		});

		// Start building command
		builder
			.then(function(command) {
				return initializeInputs(command, params);
			})
			.then(function(command) {
				return extractData(command, params);
			})
			.then(function(command) {
				return setEvents(command, params);
			})
			.then(function(command) {
				return runCommand(command);
			})
			.catch(function(err) {
				event.emit('FFmpegError', err);
			});

		return builder;
	},

	/*********************************************************************************************************
	 *
	 *	@author din
	 *
	 *	Convert the mpegts format video to mp4 format video
	 *	@params {object} contain the file path[filePath].
	 *	@return Promise when finished the preparing/unexcepted error eccured while preparing the converting.
	 *
	 *	@emit 'FFmpegWrapper_errorOnConverting' when error eccured on converting.
	 *	@emit 'FFmpegWrapper_finishConverting' when finish the converting.
	 *
	 *********************************************************************************************************/
	convertMpegTsFormatToMp4: function(params) {
		var builder = new BluebirdPromise(function(resolve, reject) {
			var command = ffmpeg();
			resolve(command);
		});

		builder
			.then(function(command) {
				// Get the file path and change the suffix of the path e.g /my/path/file.ts --> /my/path/file.mp4
				var newFilePath = params.filePath.replace('.ts', '.mp4');

				console.log(SERVICE_NAME, 'converting the file:', params.filePath, 'to:', newFilePath);

				command
				// define the input.
					.input(params.filePath)
					// define the output.
					.output(newFilePath)
					// force the ffmpeg to override file with the same name.
					.outputOptions(['-y'])
					// force the ffmpeg to convert the video to mp4 format.
					.format('mp4')
					.on('start', function(commandLine) {
						console.log(SERVICE_NAME, 'convert the file with the command:\n', commandLine);
					})
					// when any error happen when the ffmpeg process run.
					.on('error', function(err) {
						event.emit('FFmpegWrapper_errorOnConverting', err);
					})
					// when ffmpeg process done his job.
					.on('end', function() {
						event.emit('FFmpegWrapper_finishConverting', newFilePath, params.filePath);
					})
					.run();
				return BluebirdPromise.resolve(command);
			})
			.catch(function(err) {
				return BluebirdPromise.reject(err);
			});

		return builder;
	}
};

function runCommand(command) {
	command.run();
	return command;
}

function setEvents(command, params) {
	var videoPath = params.dir + '/' + params.file + '.ts';
	var telemetryPath = params.dir + '/' + params.file + '.data';
	command
		.on('start', function(commandLine) {
			console.log(SERVICE_NAME, 'Spawned FFmpeg with command: ' + commandLine);
			// Initialize indicator for data started flowing
			event.emit('FFmpegBegin', { telemetryPath: telemetryPath, videoPath: videoPath });
			command.bytesCaptureBegan = false;
		})
		.on('progress', function(progress) {
			// Check if should notify for first bytes captured
			if (command.bytesCaptureBegan === false) {
				command.bytesCaptureBegan = true;
				event.emit('FFmpegFirstProgress', { telemetryPath: telemetryPath, videoPath: videoPath });
			}
		})
		.on('end', function() {
			// command.kill('SIGKILL');
			console.log(SERVICE_NAME, 'Processing finished !');
			event.emit('FFmpegDone', { telemetryPath: telemetryPath, videoPath: videoPath });
		})
		.on('error', function(err) {
			// command.kill('SIGKILL');
			event.emit('FFmpegError', 'Error on FFmpegWrapper : ' + err);
		});
	return command;
}

function initializeInputs(command, params) {
	params.inputs.forEach(function(value) {
		command.input(value);
	});
	return command;
}

// Define a origin video output
function videoOutput(command, params) {
	command.output(params.dir + '/' + params.file + '.ts')
		.outputOptions(['-y'])
		.duration(params.duration)
		.format('mpegts');
	return command;
}

// Define a 360p video output

/* function videoOutput360p(command, params) {
	command.output(params.dir + '/' + params.file + '_320p.mp4')
		.duration(params.duration)
		.outputOptions(['-y'])
		.format('mp4')
		.size('480x360');
	return command;
}*/

// Define a 480p video output

/* function videoOutput480p(command, params) {
	command.output(params.dir + '/' + params.file + '_480p.mp4')
		.duration(params.duration)
		.outputOptions(['-y'])
		.format('mp4')
		.size('640x480');
	return command;
}*/

// Extracting binary data from stream
function extractData(command, params) {
	command.output(params.dir + '/' + params.file + '.data')
		.duration(params.duration)
		.outputOptions(['-map data-re', '-codec copy', '-f data', '-y']);
	return command;
}
