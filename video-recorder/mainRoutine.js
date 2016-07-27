// requires
var promise = require('bluebird'),
	moment = require('moment'),
	BusService = require('replay-bus-service');
var event = require('./services/EventEmitterSingleton'),
	streamListener = require('./services/StreamListener'),
	fileWatcher = require('./services/FileWatcher'),
	util = require('./utilitties'),
	exitHendler = require('./utilitties/exitUtil'),
	ffmpegWrapper = require('./services/FFmpegWrapper.js');

var viewStandardHandler = require('./services/ViewStandardHandler')(),
	streamingSourceDAL = require('./services/StreamingSourceDAL')(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE);

const DURATION = process.env.DURATION || 10,
	INTERVAL_TIME = process.env.INTERVAL_TIME || 5000,
	PROCESS_NAME = '#MainRoutine#';

// Configuration
const MONGO_HOST = process.env.MONGO_HOST,
	MONGO_PORT = process.env.MONGO_PORT,
	MONGO_DATABASE = process.env.MONGO_DATABASE,
	STORAGE_PATH = process.env.STORAGE_PATH || '/VideoRecorder',
	INDEX = process.env.INDEX,
	REDIS_HOST = process.env.REDIS_HOST,
	REDIS_PORT = process.env.REDIS_PORT;

module.exports = function() {
	console.log('Video recorder service is up.');
	console.log(PROCESS_NAME + ' Mongo host:', MONGO_HOST);
	console.log(PROCESS_NAME + ' Mongo port:', MONGO_PORT);
	console.log(PROCESS_NAME + ' Mongo database:', MONGO_DATABASE);
	console.log(PROCESS_NAME + ' Files storage path: ', STORAGE_PATH);

	// index used to find my StreamingSource object in the DB collection
	var StreamingSourceIndex = INDEX;

	streamingSourceDAL.getStreamingSource(StreamingSourceIndex)
		.then(handleVideoSavingProcess)
		.catch(function(err) {
			if (err) {
				throw err;
			}
		});
};
/********************************************************************************************************************************************/
/*                                                                                                                                          */
/*    The main function of the service, register all events and start all capturing process.                                                */
/*    first listening to the source ip & port address, when catching data streaming, running the ffmpeg command and file watcher.           */
/*    when the ffmpeg finish or the file watcher detect that the file is not getting bigger ,restarting the proccess all over again.        */
/*                                                                                                                                          */
/********************************************************************************************************************************************/
function handleVideoSavingProcess(streamingSource) {
	// const METHOD_NAME = 'handleVideoSavingProcess';

	var globals = {
		fileWatcherTimer: null,
		streamStatusTimer: null,
		metadataRelativeFilePath: '',
		fileName: '',
		videoRelativePath: '',
		command: null,
		currentFileStartTime: null
	};

	console.log(PROCESS_NAME + ' Start listen to port: ' + streamingSource.SourcePort);
	// Starting Listen to the address.
	startStreamListener(streamingSource)
		.then(function() {
			globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
				streamingSourceDAL.notifySourceListening(streamingSource.SourceID);
			});
		})
		.catch(function(err) {
			throw err;
		});

	/******************************************/
	/*                                        */
	/*         events Section:                */
	/*                                        */
	/******************************************/

	// When Error eccured in one of the services.
	event.on('error', function(err) {
		throw err;
	});

	// When Error eccured in StreamListener
	event.on('unexceptedError_StreamListener', function(err) {
		throw err;
	});

	// When the file didnt created by the ffmpeg
	event.on('FileDontExist_FileWatcher', function(err) {
		console.log(err);
		startStreamListener(streamingSource)
			.then(function() {
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceListening(streamingSource.SourceID);
				});
			})
			.catch(function(err) {
				throw err;
			});
	});

	// When the streamListenerService found some streaming data in the address.
	event.on('StreamingData', function() {
		var dateOfCreating = util.getCurrentDate();
		var pathForFFmpeg = STORAGE_PATH + '/' + streamingSource.SourceID + '/' + dateOfCreating;
		var FileNameForFFmpeg = streamingSource.SourceID + '_' + dateOfCreating + '_' + util.getCurrentTime();
		// Check if the path exist,if not create it.
		util.checkPath(pathForFFmpeg);

		/************************************************************/
		/*    Adding Data Manualy (It will be deleted!!!)           */
		/************************************************************/
		util.addMetadataManualy(pathForFFmpeg + '/' + FileNameForFFmpeg + '.data');
		/************************************************************/

		// save the time that the video created.
		globals.currentFileStartTime = moment();

		var ffmpegParams = {
			inputs: ['udp://' + streamingSource.SourceIP + ':' + streamingSource.SourcePort],
			duration: DURATION,
			dir: pathForFFmpeg,
			file: FileNameForFFmpeg
		};

		// starting the ffmpeg process
		console.log(PROCESS_NAME + ' Record new video at: ', pathForFFmpeg);
		viewStandardHandler.realizeStandardCaptureMethod(streamingSource.SourceType, streamingSource.StreamingMethod.version)
			.then(function(captureCommand) {
				return captureCommand(ffmpegParams);
			})
			.then(function(res) {
				exitHendler.setFFmpegProcessCommand(res);
				globals.command = res;
			})
			.catch(function(err) {
				console.log(err);
				throw err;
			});
		globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
			streamingSourceDAL.notifySourceCapturing(streamingSource.SourceID);
		});
	});

	// When ffmpeg process begin.
	// Expect to get path in object e.g {videoPath:'/path/to/video.mp4',telemetryPath:'/path/to/telemetry.data'}.
	event.on('FFmpegBegin', function(paths) {
		// start to watch the file that the ffmpeg will create
		var pathToWatch;
		if (!paths) {
			throw new Error('There is no file to watch');
		}
		if (paths.telemetryPath) {
			globals.metadataRelativeFilePath = paths.telemetryPath.substring(paths.videoPath.indexOf(STORAGE_PATH) + STORAGE_PATH.length);
			globals.fileName = globals.metadataRelativeFilePath.split('/').pop().split('.')[0];
			pathToWatch = paths.telemetryPath;
		}
		if (paths.videoPath) {
			globals.videoRelativeFilePath = paths.videoPath.substring(paths.videoPath.indexOf(STORAGE_PATH) + STORAGE_PATH.length);
			globals.fileName = globals.videoRelativeFilePath.split('/').pop().split('.')[0];
			pathToWatch = paths.videoPath;
		}

		startWatchFile(pathToWatch)
			.then(function(timer) {
				globals.fileWatcherTimer = timer;
			})
			.catch(function(err) {
				throw err;
			});
	});

	// when FFmpeg done his progress,
	event.on('FFmpegDone', function(paths) {
		promise.resolve()
			.then(function() {
				// Stop the file watcher.
				console.log(PROCESS_NAME + ' ffmpeg done his progress.');
				stopWatchFile(globals.fileWatcherTimer);
			})
			.then(function() {
				return convertMpegtsToMp4(paths.videoPath, globals.currentFileStartTime)
					.then(function() {
						return promise.resolve();
					})
					.catch(function(err) {
						console.log('could not spwan the ffmpeg converting process,' + err + ' \n \n noving on');
						return promise.reject();
					});
			})
			.then(function() {
				// Start the whole process again by listening to the address again.
				console.log(PROCESS_NAME + ' Start to listen the address again');
				startStreamListener(streamingSource)
					.then(function() {
						globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
							streamingSourceDAL.notifySourceListening(streamingSource.SourceID);
						});
					})
					.catch(function(err) {
						throw err;
					});
			});
	});

	// When Error eccured on FFmpeg service.
	event.on('FFmpegError', function(err) {
		console.log(err);
		stopWatchFile(globals.fileWatcherTimer);
		startStreamListener(streamingSource)
			.then(function() {
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceListening(streamingSource.SourceID);
				});
			})
			.catch(function(err) {
				throw err;
			});
	});

	// When the source stop stream data.
	event.on('FileWatchStop', function() {
		// kill The FFmpeg Process.
		console.log(PROCESS_NAME + ' The Source stop stream data, Killing the ffmpeg process');
		stopFFmpegProcess(globals.command);
		convertMpegtsToMp4(STORAGE_PATH + '/' + globals.videoRelativeFilePath, globals.currentFileStartTime)
			.then(function() {
				return promise.resolve();
			})
			.catch(function(err) {
				console.log('could not spwan the ffmpeg converting process,' + err + ' \n \n noving on');
				return promise.reject();
			});
	});

	// when error eccured on the converting.
	event.on('FFmpegWrapper_errorOnConverting', function(err) {
		console.log('FFmpegWrapper_errorOnConverting emited:', err);
	});

	// when converting finished.
	event.on('FFmpegWrapper_finishConverting', function(newFilePath, oldFilePath, startTime) {
		var startDateTime, endDateTime;
		// get the start time format.
		startDateTime = startTime.format();

		// get the duration of the video that was created.
		ffmpegWrapper.getDurationOfVideo({ filePath: oldFilePath })
			.then(function(duration) {
				console.log('duration:', duration);
				// add the duration time to the start time of the video to get the most exact time.
				endDateTime = startTime.add(Math.ceil(duration), 's').format();
				console.log('finish converting, send to jobqueue');
				// send to the next job.
				sendToJobQueue({
					streamingSource: streamingSource,
					videoPath: newFilePath,
					dataPath: newFilePath.replace('.mp4', '.data'),
					videoName: globals.fileName,
					startTime: startDateTime,
					endTime: endDateTime
				});
				try {
					// delete the unnecessary ts file.
					util.deleteFile(oldFilePath);
				} catch (err) {
					console.log('could not delete the ts file,', err, 'continue on');
				}
			})
			.catch(function(err) {
				console.log('couldnt get the duration, ignore and continue on,\n', err);
			});
	});
}

/********************************************************************************************************************************************/

/********************************************************************************************/
/*                                                                                          */
/*                                 Helper Methods                                           */
/*                                                                                          */
/********************************************************************************************/

// Sets a keep alive status notifier
function setStatusTimer(timer, callBack) {
	clearInterval(timer);
	timer = setInterval(function() {
		console.log(PROCESS_NAME + ' updating status....' + moment().format());
		callBack();
	}, INTERVAL_TIME);

	return timer;
}

// starting Listen to the stream
function startStreamListener(streamingSource) {
	var streamListenerParams = {
		ip: streamingSource.SourceIP,
		port: streamingSource.SourcePort
	};
	return streamListener.startListen(streamListenerParams);
}

// Start timer that watch over file
function startWatchFile(path) {
	return fileWatcher.startWatchFile({ path: path, timeToWait: INTERVAL_TIME });
}

// Stop timer that watch over file
function stopWatchFile(timer) {
	if (timer) {
		fileWatcher.stopWatchFile(timer);
	}
}

// Stop the ffmpeg process
function stopFFmpegProcess(command, callBack) {
	if (command) {
		command.kill('SIGKILL');
	}
	if (callBack) {
		callBack();
	}
}

// Convert the finished video to mp4 format
function convertMpegtsToMp4(path, startTime) {
	return ffmpegWrapper.convertMpegTsFormatToMp4({ filePath: path, startTime: startTime });
}

// Send message to the next service.
function sendToJobQueue(params) {
	var busServiceProducer = new BusService(REDIS_HOST, REDIS_PORT);
	var message = {
		params: {
			sourceId: params.streamingSource.SourceID,
			videoName: params.videoName + '.mp4',
			videoRelativePath: params.videoPath,
			dataRelativePath: params.dataPath,
			receivingMethod: {
				standard: params.streamingSource.StreamingMethod.standard,
				version: '1.0'
			},
			startTime: params.startTime,
			endTime: params.endTime
		}
	};
	console.log('message is ', message);
	busServiceProducer.produce('NewVideosQueue', message);
}

/********************************************************************************************/
