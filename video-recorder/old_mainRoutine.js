// requires
var moment = require('moment'),
	mongoose = require('mongoose'),
	rabbit = require('replay-rabbitmq'),
	FFmpeg = require('replay-ffmpeg'),
	Promise = require('bluebird');

var path = require('path');

var StreamListener = require('./services/StreamListener'),
	FileWatcher = require('./services/FileWatcher'),
	util = require('./utilities'),
	exitHandler = require('./utilities/exitUtil');

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

	return streamingSourceDAL.connect(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE,
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
			return Promise.reject(err);
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
	var self = this;

	self.streamListener = StreamListener;
	self.fileWatcher = FileWatcher;
	self.ffmpeg = FFmpeg;

	self.fileWatcherTimer = undefined;
	self.streamStatusTimer = undefined;
	self.metadataRelativeFilePath = '';
	self.fileName = '';
	self.videoRelativePath = '';
	self.command = undefined;
	self.startRecordTime = undefined;
	self.endRecordTime = undefined;
	self.currentRecordingFile = '';

	/****************************************************************************************************/
	/*                                                                                                  */
	/*                              Events Section:                                                     */
	/*                                                                                                  */
	/****************************************************************************************************/

	// When Error eccured in StreamListener
	self.streamListener.on('unexceptedError_StreamListener', function(err) {
		throw err;
	});

	// When the streamListenerService found some streaming data in the address.
	self.streamListener.on('StreamingData', streamingDataHandle);

	// When the file didnt created by the ffmpeg
	self.fileWatcher.on('FileDontExist_FileWatcher', fileDontExistHandler);

	// When finish the recording.
	self.ffmpeg.on('ffmpegWrapper_finish_recording', finishRecordHandle);

	// When error eccured while recording.
	self.ffmpeg.on('ffmpegWrapper_error_while_recording', errorOnRecordHandle);

	// when ffmpeg start to record
	self.ffmpeg.on('FFmpeg_start_recording', startRecordHandler);

	// When the source stop stream data.
	self.fileWatcher.on('FileWatchStop', fileWatcherStopHandler);

	exitHandler.on('processBeforeExit', processExitHandler);

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
		self.startRecordTime = moment();

		var ffmpegParams = {
			input: 'udp://' + streamingSource.sourceIP + ':' + streamingSource.sourcePort,
			duration: parseInt(process.env.DURATION, 10) || 10,
			output: newFilePath
		};

		// starting the ffmpeg process
		self.ffmpeg.record(ffmpegParams)
			.then(function(ffmpegCommand) {
				self.command = ffmpegCommand;
				return setStatusTimer(self.streamStatusTimer);
			})
			.then(function() {
				return streamingSourceDAL.notifySourceCapturing(streamingSource.sourceID);
			})
			.then(function() {
				self.startRecordTime = moment().format();
				return startWatchFile(newFilePath + TS_SUFFIX);
			})
			.then(function(timer) {
				self.fileWatcherTimer = timer;
			})
			.catch(function(err) {
				throw err;
			});
	}

	function finishRecordHandle(tsPath) {
		// stop the fileWatcher
		stopWatchFile(self.fileWatcherTimer);
		// get video duration.
		getDurationAndSendMessage(tsPath)
			.then(function() {
				// Starting Listen to the address again.
				self.currentRecordingFile = '';
				return startStreamListener(streamingSource, self.streamStatusTimer);
			})
			.catch(function(err) {
				console.trace(err);
			});
	}

	function errorOnRecordHandle(err) {
		console.log('error eccured while recording:');
		console.log(err);

		// Stop the timer
		stopWatchFile(self.fileWatcherTimer);
		// Starting Listen to the address again.
		self.currentRecordingFile = '';
		startStreamListener(streamingSource, self.streamStatusTimer);
	}

	function fileWatcherStopHandler(tsPath) {
		// kill The FFmpeg Process.
		console.log(PROCESS_NAME + ' The Source stop stream data, Killing the ffmpeg process');
		stopFFmpegProcess(self.command)
			.then(function() {
				return getDurationAndSendMessage(tsPath);
			})
			.then(function() {
				self.currentRecordingFile = '';
				return startStreamListener(streamingSource, self.streamStatusTimer);
			})
			.catch(function(err) {
				console.trace(err);
			});
	}

	function fileDontExistHandler(tsPath) {
		console.log("couldn't find the file, delete the path and continue");
		util.deletePath(path.parse(tsPath).dir, function() {
			self.currentRecordingFile = '';
			startStreamListener(streamingSource, self.streamStatusTimer)
				.catch(function(err) {
					throw err;
				});
		});
	}

	function getDurationAndSendMessage(tsPath) {
		self.endRecordTime = moment().format();
		// prepare the message for sending.
		var newMessage = prepareMessage(tsPath);
		// get the duration of the file.
		return self.ffmpeg.duration({ filePath: tsPath })
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

	function processExitHandler() {
		var newMessage = prepareMessage(self.currentRecordingFile);
		newMessage.duration = null;
		streamingSourceDAL.notifySourceNone(streamingSource.sourceID)
			.then(function() {
				return stopFFmpegProcess(self.command);
			})
			.then(function() {
				if (self.currentRecordingFile !== '') {
					return sendToJobQueue(newMessage);
				}
				return Promise.resolve();
			})
			.catch(function(err) {
				console.trace(err);
			})
			.finally(function() {
				process.exit();
			});
	}

	function prepareMessage(tsPath) {
		return {
			streamingSource: streamingSource,
			videoName: path.parse(tsPath).name,
			fileRelativePath: path.relative(process.env.STORAGE_PATH, tsPath),
			storagePath: process.env.STORAGE_PATH,
			startTime: self.startRecordTime,
			endTime: self.endRecordTime
		};
	}

	function startRecordHandler(tsPath) {
		self.currentRecordingFile = tsPath;
	}

	// Starting Listen to the address.
	console.log(PROCESS_NAME + ' Start listen to port: ' + streamingSource.sourcePort);
	return startStreamListener(streamingSource, self.streamStatusTimer);
}

/****************************************************************************************************/
/*                                                                                                  */
/*                              Helper Methods                                                      */
/*                                                                                                  */
/****************************************************************************************************/

// Sets a keep alive status notifier
function setStatusTimer(timer) {
	clearInterval(timer);
	timer = setInterval(function() {
		console.log(PROCESS_NAME + ' updating status....' + moment().format());
	}, process.env.INTERVAL_TIME || 5000);

	return Promise.resolve(timer);
}

// starting Listen to the stream
function startStreamListener(streamingSource, streamStatusTimer) {
	var streamListenerParams = {
		ip: streamingSource.sourceIP,
		port: streamingSource.sourcePort
	};

	return StreamListener.startListen(streamListenerParams)
		.then(function() {
			return setStatusTimer(streamStatusTimer);
		})
		.then(function() {
			return streamingSourceDAL.notifySourceListening(streamingSource.sourceID);
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
}

// Start timer that watch over file
function startWatchFile(path) {
	return FileWatcher.startWatchFile({ path: path, timeToWait: process.env.INTERVAL_TIME || 5000 });
}

// Stop timer that watch over file
function stopWatchFile(timer) {
	if (timer) {
		FileWatcher.stopWatchFile(timer);
	}
}

// Stop the ffmpeg process
function stopFFmpegProcess(command) {
	if (command) {
		command.kill('SIGKILL');
	}
	return Promise.resolve();
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
	return rabbit.produce('TransportStreamProcessingQueue', message);
}
