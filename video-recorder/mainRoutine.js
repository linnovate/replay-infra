// requires
var moment = require('moment'),
	mongoose = require('mongoose'),
	rabbit = require('replay-rabbitmq'),
	ffmpeg = require('replay-ffmpeg'),
	Promise = require('bluebird');

var path = require('path');

var streamListener = require('./services/StreamListener'),
	fileWatcher = require('./services/FileWatcher'),
	util = require('./utilitties'),
	exitHendler = require('./utilitties/exitUtil');

var streamingSourceDAL = require('./services/StreamingSourceDAL');

const PROCESS_NAME = '#MainRoutine#',
	TS_SUFFIX = '.ts';

// Configuration
const SOURCE_ID = process.env.SOURCE_ID || process.env.INDEX;

module.exports = function() {
	console.log('Video recorder service is up.');
	console.log(PROCESS_NAME + ' Mongo host:', process.env.MONGO_HOST);
	console.log(PROCESS_NAME + ' Mongo port:', process.env.MONGO_PORT);
	console.log(PROCESS_NAME + ' Mongo database:', process.env.MONGO_DATABASE);
	console.log(PROCESS_NAME + ' Files storage path: ', process.env.STORAGE_PATH);
	console.log(PROCESS_NAME + ' RabbitMQ host: ', process.env.RABBITMQ_HOST);
	console.log(PROCESS_NAME + ' RabbitMQ port: ', process.env.RABBITMQ_PORT);
	console.log(PROCESS_NAME + ' RabbitMQ username: ', process.env.RABBITMQ_USERNAME);
	console.log(PROCESS_NAME + ' RabbitMQ password: ', process.env.RABBITMQ_PASSWORD);
	console.log(PROCESS_NAME + ' Interval time: ', process.env.INTERVAL_TIME);
	console.log(PROCESS_NAME + ' Duration: ', process.env.DURATION);
	console.log(PROCESS_NAME + ' Index: ', process.env.INDEX);

	var RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost';
	var RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
	var RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || 'guest';
	var RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'guest';

	streamingSourceDAL.connect(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE,
			process.env.MONGO_USERNAME, process.env.MONGO_PASSWORD)
		.then(function(methods) {
			streamingSourceDAL = methods;
			return rabbit.connect(RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USERNAME, RABBITMQ_PASSWORD);
		})
		.then(function() {
			return streamingSourceDAL.getStreamingSource(SOURCE_ID);
		})
		.then(function(source) {
			return handleVideoSavingProcess(source);
		})
		.catch(function(err) {
			throw err;
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

	/****************************************************************************************************/
	/*                                                                                                  */
	/*                              Events Section:                                                     */
	/*                                                                                                  */
	/****************************************************************************************************/

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

	// When the source stop stream data.
	fileWatcher.on('FileWatchStop', fileWatcherStopHandler);

	/****************************************************************************************************/
	/*                                                                                                  */
	/*                              Events handlers                                                     */
	/*                                                                                                  */
	/****************************************************************************************************/

	function streamingDataHandle() {
		var dateOfCreating = util.getCurrentDate();
		var newFileName = streamingSource.sourceID + '_' + dateOfCreating + '_' + util.getCurrentTime();
		var newFilePath = path.join(process.env.STORAGE_PATH, streamingSource.sourceID, dateOfCreating, newFileName, newFileName);
		console.log(PROCESS_NAME + ' Record new video at: ', newFilePath);
		// Check if the path exist,if not create it.
		util.checkPath(path.parse(newFilePath).dir);

		// save the time that the video created.
		globals.startRecordTime = moment();

		var ffmpegParams = {
			input: 'udp://' + streamingSource.sourceIP + ':' + streamingSource.sourcePort,
			duration: parseInt(process.env.DURATION, 10) || 10,
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
		startStreamListener(streamingSource, globals.streamStatusTimer);
	}

	function errorOnRecordHandle(err) {
		console.log('error eccured while recording:');
		console.log(err);

		// Stop the timer
		stopWatchFile(globals.fileWatcherTimer);
		// Starting Listen to the address again.
		startStreamListener(streamingSource, globals.streamStatusTimer);
	}

	function fileWatcherStopHandler(tsPath) {
		// kill The FFmpeg Process.
		console.log(PROCESS_NAME + ' The Source stop stream data, Killing the ffmpeg process');
		stopFFmpegProcess(globals.command);
		getDurationAndSendMessage(tsPath);
		startStreamListener(streamingSource, globals.streamStatusTimer);
	}

	function fileDontExistHandler(tsPath) {
		console.log("couldn't find the file, delete the path and continue");
		util.deletePath(path.parse(tsPath).dir, function() {
			startStreamListener(streamingSource, globals.streamStatusTimer);
		});
	}

	function getDurationAndSendMessage(tsPath) {
		globals.endRecordTime = moment().format();
		// prepare the message for sending.
		var newMessage = {
			streamingSource: streamingSource,
			videoName: path.parse(tsPath).name,
			fileRelativePath: path.relative(process.env.STORAGE_PATH, tsPath),
			storagePath: process.env.STORAGE_PATH,
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
				return sendToJobQueue(newMessage);
			});
	}

	// Starting Listen to the address.
	console.log(PROCESS_NAME + ' Start listen to port: ' + streamingSource.sourcePort);
	return startStreamListener(streamingSource, globals.streamStatusTimer);
}

/****************************************************************************************************/
/*                                                                                                  */
/*                              Helper Methods                                                      */
/*                                                                                                  */
/****************************************************************************************************/

// Sets a keep alive status notifier
function setStatusTimer(timer, callBack) {
	clearInterval(timer);
	timer = setInterval(function() {
		console.log(PROCESS_NAME + ' updating status....' + moment().format());
		callBack();
	}, process.env.INTERVAL_TIME || 5000);

	return timer;
}

// starting Listen to the stream
function startStreamListener(streamingSource, streamStatusTimer) {
	var streamListenerParams = {
		ip: streamingSource.sourceIP,
		port: streamingSource.sourcePort
	};
	return streamListener.startListen(streamListenerParams)
		.then(function() {
			streamStatusTimer = setStatusTimer(streamStatusTimer, function() {
				streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
			});

			return Promise.resolve();
		})
		.catch(function(err) {
			throw err;
		});
}

// Start timer that watch over file
function startWatchFile(path) {
	return fileWatcher.startWatchFile({ path: path, timeToWait: process.env.INTERVAL_TIME || 5000 });
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
			version: params.streamingSource.streamingMethod.version
		},
		startTime: params.startTime,
		endTime: params.endTime,
		duration: params.duration,
		sourceType: params.streamingSource.sourceType,
		transactionId: new mongoose.Types.ObjectId()
	};
	rabbit.produce('TransportStreamProcessingQueue', message);
}
