var ffmpeg = require('fluent-ffmpeg'),
	promise = require('bluebird');
var event = require('./EventEmitterSingleton');

const //FFMPEG_TIMEOUT = 30 * 60 * 1000,
	SERVICE_NAME = '#FFmpegWrapper#';

module.exports = {
	// Params object (e.g{inputs:<[inputs]>,Directory:<dir/dir2>,file:<filename>,duration:<sec/hh:mm:ss.xxx>})
	captureMuxedVideoTelemetry: function(params) {
		// setting the boolean requests to check params
		var checkBadParams = (!params.duration || !params.file || !params.dir || !params.inputs || params.inputs.length === 0);
		if (checkBadParams) {
			return promise.reject('bad params suplied');
		}
		console.log(SERVICE_NAME, 'capturing muxed!!!!!');
		// Building the FFmpeg command
		var builder = new promise(function(resolve, reject) {
			// FFmpeg command initialization
			var command = ffmpeg();
			// Resolving the command forward
			resolve(command);
		});

		// Start building command
		builder.then(function(command) {
				return initializeInputs(command, params);
			})
			.then(function(command) {
				return videoOutput(command, params);
			})
			.then(function(command) {
				return videoOutput360p(command, params);
			})
			.then(function(command) {
				return videoOutput480p(command, params);
			})
			.then(function(command) {
				return extractData(command, params);
			})
			.then(function(command) {
				return setEvents(command, params);
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
			return promise.reject('bad params suplied');
		}
		// Building the FFmpeg command
		var builder = new promise(function(resolve, reject) {
			// FFmpeg command initialization
			var command = ffmpeg();
			// Resolving the command forward
			resolve(command);
		});

		// Start building command
		builder.then(function(command) {
				return initializeInputs(command, params);
			})
			.then(function(command) {
				return videoOutput(command, params);
			})
			.then(function(command) {
				return videoOutput360p(command, params);
			})
			.then(function(command) {
				return videoOutput480p(command, params);
			})
			.then(function(command) {
				return setEvents(command, params);
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
			return promise.reject('bad params suplied');
		}
		// Building the FFmpeg command
		var builder = new promise(function(resolve, reject) {
			// FFmpeg command initialization
			var command = ffmpeg();
			// Resolving the command forward
			resolve(command);
		});

		// Start building command
		builder.then(function(command) {
				return initializeInputs(command, params);
			})
			.then(function(command) {
				return extractData(command, params);
			})
			.then(function(command) {
				return setEvents(command, params);
			})
			.catch(function(err) {
				event.emit('FFmpegError', err);
			});

		return builder;
	}
};

function setEvents(command, params) {
	command.on('start', function(commandLine) {
			console.log(SERVICE_NAME, 'Spawned Ffmpeg with command: ' + commandLine);
			// Initialize indicator for data started flowing
			command.bytesCaptureBegan = false;
		})
		.on('progress', function(progress) {
			// Check if should notify for first bytes captured
			if (command.bytesCaptureBegan === false) {
				command.bytesCaptureBegan = true;
				event.emit('CapturingBegan', command._outputs[0].target);
			}
		})
		.on('end', function() {
			// command.kill('SIGKILL');
			console.log(SERVICE_NAME, 'Processing finished !');
			event.emit('FFmpegDone');
		})
		.on('error', function(err) {
			console.log(err);
			// command.kill('SIGKILL');
			event.emit('FFmpegError');
		});

	command.run();
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
	command.output(params.dir + '/' + params.file + '.mp4')
		.outputOptions(['-y'])
		.duration(params.duration)
		.format('mp4');
	return command;
}

// Define a 360p video output
function videoOutput360p(command, params) {
	command.output(params.dir + '/' + params.file + '320p.mp4')
		.duration(params.duration)
		.outputOptions(['-y'])
		.format('mp4')
		.size('480x360');
	return command;
}

// Define a 480p video output
function videoOutput480p(command, params) {
	command.output(params.dir + '/' + params.file + '480p.mp4')
		.duration(params.duration)
		.outputOptions(['-y'])
		.format('mp4')
		.size('640x480');
	return command;
}

// Extracting binary data from stream
function extractData(command, params) {
	command.output(params.dir + '/' + params.file + '.data')
		.duration(params.duration)
		.outputOptions(['-map data-re', '-codec copy', '-f data', '-y']);
	return command;
}
