// requires
var moment = require('moment'),
	mongoose = require('mongoose'),
	rabbit = require('replay-rabbitmq'),
	ffmpeg = require('replay-ffmpeg');

var path = require('path');

var streamListener = require('./services/StreamListener'),
	fileWatcher = require('./services/FileWatcher'),
	util = require('./utilitties'),
	exitHendler = require('./utilitties/exitUtil');

var streamingSourceDAL = require('./services/StreamingSourceDAL')(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE);

const DURATION = parseInt(process.env.DURATION, 10) || 10,
	INTERVAL_TIME = process.env.INTERVAL_TIME || 5000,
	PROCESS_NAME = '#MainRoutine#';
const TS_SUFFIX = '.ts';

// Configuration
const MONGO_HOST = process.env.MONGO_HOST,
	MONGO_PORT = process.env.MONGO_PORT,
	MONGO_DATABASE = process.env.MONGO_DATABASE,
	STORAGE_PATH = process.env.STORAGE_PATH || '/VideoRecorder',
	INDEX = process.env.INDEX,
	RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';

module.exports = function() {
	console.log('Video recorder service is up.');
	console.log(PROCESS_NAME + ' Mongo host:', MONGO_HOST);
	console.log(PROCESS_NAME + ' Mongo port:', MONGO_PORT);
	console.log(PROCESS_NAME + ' Mongo database:', MONGO_DATABASE);
	console.log(PROCESS_NAME + ' Files storage path: ', STORAGE_PATH);
	console.log(PROCESS_NAME + ' RabbitMQ host: ', RABBITMQ_HOST);
	console.log(PROCESS_NAME + ' Interval time: ', INTERVAL_TIME);
	console.log(PROCESS_NAME + ' Duration: ', DURATION);
	console.log(PROCESS_NAME + ' Index: ', INDEX);

	// index used to find my StreamingSource object in the DB collection
	var StreamingSourceIndex = INDEX;

	rabbit.connect(RABBITMQ_HOST)
		.then(function() {
			streamingSourceDAL.getStreamingSource(StreamingSourceIndex)
				.then(function(source) {
					handleVideoSavingProcess(source);
				})
				.catch(function(err) {
					throw err;
				});
		})
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
		startRecordTime: null,
		endRecordTime: null
	};

	console.log(PROCESS_NAME + ' Start listen to port: ' + streamingSource.sourcePort);
	// Starting Listen to the address.
	startStreamListener(streamingSource)
		.then(function() {
			globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
				streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
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

	// When Error eccured in StreamListener
	streamListener.on('unexceptedError_StreamListener', function(err) {
		throw err;
	});

	// When the streamListenerService found some streaming data in the address.
	streamListener.on('StreamingData', streamingDataHandle);

	// When the file didnt created by the ffmpeg
	fileWatcher.on('FileDontExist_FileWatcher', fileDontExistHandler);

	// When finish the recording.
	ffmpeg.on('ffmpegWrapper_finish_recording', finishRecordHandle);

	// When error eccured while recording.
	ffmpeg.on('ffmpegWrapper_error_while_recording', errorOnRecordHandle);

	// When Error eccured on FFmpeg module.
	ffmpeg.on('FFmpegError', ffmpegErrorHandle);

	// When the source stop stream data.
	fileWatcher.on('FileWatchStop', fileWatcherStopHandler);

	/********************************************************************************************************************************************/

	/********************************************************************************************/
	/*                                                                                          */
	/*                                 events handlers                                          */
	/*                                                                                          */
	/********************************************************************************************/

	function streamingDataHandle() {
		var dateOfCreating = util.getCurrentDate();
		var newFileName = streamingSource.sourceID + '_' + dateOfCreating + '_' + util.getCurrentTime();
		var newFilePath = path.join(STORAGE_PATH, streamingSource.sourceID, dateOfCreating, newFileName, newFileName);
		console.log(PROCESS_NAME + ' Record new video at: ', newFilePath);
		// Check if the path exist,if not create it.
		util.checkPath(path.parse(newFilePath).dir);

		// save the time that the video created.
		globals.startRecordTime = moment();

		var ffmpegParams = {
			input: 'udp://' + streamingSource.sourceIP + ':' + streamingSource.sourcePort,
			duration: DURATION,
			output: newFilePath
		};

		// starting the ffmpeg process
		ffmpeg.record(ffmpegParams)
			.then(function(ffmpegCommand) {
				exitHendler.setFFmpegProcessCommand(ffmpegCommand);
				globals.command = ffmpegCommand;
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceCapturing(streamingSource.sourceID);
				});
				globals.startRecordTime = moment().format();
			})
			.catch(function(err) {
				throw err;
			});

		// starting to watch the file
		startWatchFile(newFilePath + TS_SUFFIX)
			.then(function(timer) {
				globals.fileWatcherTimer = timer;
			})
			.catch(function(err) {
				throw err;
			});
	}

	function finishRecordHandle(tsPath) {
		getDurationAndSendMessage(tsPath);
		// stop the fileWatcher
		stopWatchFile(globals.fileWatcherTimer);
		// Starting Listen to the address again.
		startStreamListener(streamingSource)
			.then(function() {
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
				});
			})
			.catch(function(err) {
				throw err;
			});
	}

	function errorOnRecordHandle(err) {
		console.log('error eccured while recording');
		console.log(err);

		// Stop the timer
		stopWatchFile(globals.fileWatcherTimer);

		// Starting Listen to the address again.
		startStreamListener(streamingSource)
			.then(function() {
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
				});
			})
			.catch(function(err) {
				throw err;
			});
	}

	function ffmpegErrorHandle(err) {
		console.log(err);
		stopWatchFile(globals.fileWatcherTimer);
		startStreamListener(streamingSource)
			.then(function() {
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
				});
			})
			.catch(function(err) {
				throw err;
			});
	}

	function fileWatcherStopHandler(tsPath) {
		// kill The FFmpeg Process.
		console.log(PROCESS_NAME + ' The Source stop stream data, Killing the ffmpeg process');
		stopFFmpegProcess(globals.command);
		getDurationAndSendMessage(tsPath);
		startStreamListener(streamingSource)
			.then(function() {
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
				});
			})
			.catch(function(err) {
				throw err;
			});
	}

	function fileDontExistHandler(err) {
		console.log(err);
		startStreamListener(streamingSource)
			.then(function() {
				globals.streamStatusTimer = setStatusTimer(globals.streamStatusTimer, function() {
					streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
				});
			})
			.catch(function(err) {
				throw err;
			});
	}

	/********************************************************************************************************************************************/
	function getDurationAndSendMessage(tsPath) {
		globals.endRecordTime = moment().format();
		// prepare the message for sending.
		var newMessage = {
			streamingSource: streamingSource,
			videoName: path.parse(tsPath).name,
			fileRelativePath: path.relative(STORAGE_PATH, tsPath),
			storagePath: STORAGE_PATH,
			startTime: globals.startRecordTime,
			endTime: globals.endRecordTime
		};
		// get the duration of the file.
		ffmpeg.duration({ filePath: tsPath })
			.then(function(duration) {
				newMessage.duration = duration;
			})
			.catch(function(err) {
				console.log(err);
				newMessage.duration = null;
			})
			.finally(function() {
				sendToJobQueue(newMessage);
			});
	}
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
		ip: streamingSource.sourceIP,
		port: streamingSource.sourcePort
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

// Send message to the next service.
function sendToJobQueue(params) {
	var message = {
		sourceId: params.streamingSource.sourceID,
		videoName: params.videoName,
		fileRelativePath: params.fileRelativePath,
		storagePath: params.storagePath,
		receivingMethod: {
			standard: params.streamingSource.streamingMethod.standard,
			version: '1.0'
		},
		startTime: params.startTime,
		endTime: params.endTime,
		duration: params.duration,
		sourceType: params.streamingSource.sourceType,
		transactionId: new mongoose.Types.ObjectId()
	};
	rabbit.produce('TransportStreamProcessingQueue', message);
}

/********************************************************************************************/
