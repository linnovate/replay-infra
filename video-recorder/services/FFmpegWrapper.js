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
/*			.then(function(command) {
				return videoOutput360p(command, params);
			})*/
			.then(function(command) {
				return extractData(command, params);
			})
/*			.then(function(command) {
				return videoOutput480p(command, params);
			})*/
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
/*			.then(function(command) {
				return videoOutput360p(command, params);
			})
			.then(function(command) {
				return videoOutput480p(command, params);
			})*/
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
