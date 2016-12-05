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

var StreamingSourceDAL = require('./services/StreamingSourceDAL');

const PROCESS_NAME = '#MainRoutine#',
	TS_SUFFIX = '.ts';

// Configuration
const SOURCE_ID = process.env.SOURCE_ID || process.env.INDEX,
	RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'localhost',
	RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672',
	RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || 'guest',
	RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'guest';

function MainRoutine() {
	var self = this;

	self.streamListener = new StreamListener();
	self.fileWatcher = new FileWatcher();
	self.ffmpeg = FFmpeg;
	self.streamStatusTimer = new StatusTimer();

	self.metadataRelativeFilePath = '';
	self.fileName = '';
	self.videoRelativePath = '';
	self.command = undefined;
	self.streamingSource = undefined;
	self.startRecordTime = undefined;
	self.endRecordTime = undefined;
	self.currentRecordingFile = '';

	/****************************************************************************************************/
	/*                                                                                                  */
	/*                              Events handlers                                                     */
	/*                                                                                                  */
	/****************************************************************************************************/

	self.begin = function() {
		StreamingSourceDAL.connect(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE,
				process.env.MONGO_USERNAME, process.env.MONGO_PASSWORD)
			.then(function(methods) {
				self.streamingSourceDAL = methods;
				return rabbit.connect(RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USERNAME, RABBITMQ_PASSWORD);
			})
			.then(function() {
				return self.streamingSourceDAL.getStreamingSource(SOURCE_ID);
			})
			.then(function(source) {
				self.streamingSource = source;

				/****************************************************************************************************/
				/*                                                                                                  */
				/*                              Events Section:                                                     */
				/*                                                                                                  */
				/****************************************************************************************************/

				// When Error eccured in StreamListener
				self.streamListener.on('unexceptedError_StreamListener', function(err) {
					console.log(err);
				});

				// When the streamListenerService found some streaming data in the address.
				self.streamListener.on('StreamingData', streamingDataHandle);

				// When the file didnt created by the ffmpeg
				self.fileWatcher.on('FileDosentExist_FileWatcher', fileDosentExistHandler);

				// When finish the recording.
				self.ffmpeg.on('ffmpegWrapper_finish_recording', finishRecordHandle);

				// When error eccured while recording.
				self.ffmpeg.on('ffmpegWrapper_error_while_recording', errorOnRecordHandle);

				// when ffmpeg start to record
				self.ffmpeg.on('FFmpeg_start_recording', startRecordHandler);

				// When the source stop stream data.
				self.fileWatcher.on('FileWatchStop', fileWatcherStopHandler);

				exitHandler.on('processBeforeExit', processExitHandler);

				// Starting Listen to the address.
				console.log(PROCESS_NAME + ' Start listen to port: ');
				return startStreamListener();
			})
			.catch(function(err) {
				console.log(err);
			});
	};

	// starting Listen to the stream
	function startStreamListener() {
		var streamListenerParams = {
			ip: self.streamingSource.sourceIP,
			port: self.streamingSource.sourcePort
		};
		return self.streamListener.startListen(streamListenerParams)
			.then(function() {
				self.streamStatusTimer.setInterval(function() {
					self.streamingSourceDAL.notifySourceListening(self.streamingSource.sourceID);
				});
			});
	}

	function streamingDataHandle() {
		var dateOfCreating = util.getCurrentDate();
		var newFileName = self.streamingSource.sourceID + '_' + dateOfCreating + '_' + util.getCurrentTime();
		var newFilePath = path.join(process.env.STORAGE_PATH, self.streamingSource.sourceID, dateOfCreating, newFileName, newFileName);
		console.log(PROCESS_NAME + ' Record new video at: ', newFilePath);
		// Check if the path exist,if not create it.
		util.checkPath(path.parse(newFilePath).dir);

		// save the time that the video created.
		self.startRecordTime = moment();

		var ffmpegParams = {
			input: 'udp://' + self.streamingSource.sourceIP + ':' + self.streamingSource.sourcePort,
			duration: parseInt(process.env.DURATION, 10) || 10,
			output: newFilePath
		};

		// starting the ffmpeg process
		self.ffmpeg.record(ffmpegParams)
			.then(function(ffmpegCommand) {
				self.command = ffmpegCommand;
				// starting to watch the file
				self.fileWatcher.startWatchFile({ path: newFilePath + TS_SUFFIX, timeToWait: process.env.INTERVAL_TIME || 5000 });
				self.streamStatusTimer.setInterval(function() {
					self.streamingSourceDAL.notifySourceCapturing(self.streamingSource.sourceID);
				});
				self.startRecordTime = moment().format();
			})
			.catch(function(err) {
				throw err;
			});
	}

	function fileDosentExistHandler(tsPath) {
		console.log("couldn't find the file, delete the path and continue");
		util.deletePath(path.parse(tsPath).dir, function() {
			self.currentRecordingFile = '';
			self.streamStatusTimer.clearInterval();
			startStreamListener();
		});
	}

	function finishRecordHandle(tsPath) {
		// stop the fileWatcher
		self.fileWatcher.stopWatchFile();
		// get video duration.
		getDurationAndSendMessage(tsPath)
			.then(function() {
				// Starting Listen to the address again.
				self.currentRecordingFile = '';
				startStreamListener();
			})
			.catch(function(err) {
				console.trace(err);
			});
	}

	function errorOnRecordHandle(err) {
		console.log('error eccured while recording:');
		console.log(err);

		// Stop the timer
		self.fileWatcher.stopWatchFile();
		// Starting Listen to the address again.
		self.currentRecordingFile = '';
		startStreamListener();
	}

	function startRecordHandler(tsPath) {
		console.log('start FFmpeg');
		self.currentRecordingFile = tsPath;
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
				startStreamListener();
			})
			.catch(function(err) {
				console.trace(err);
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
		self.streamingSourceDAL.notifySourceNone(self.streamingSource.sourceID)
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
			streamingSource: self.streamingSource,
			videoName: path.parse(tsPath).name,
			fileRelativePath: path.relative(process.env.STORAGE_PATH, tsPath),
			storagePath: process.env.STORAGE_PATH,
			startTime: self.startRecordTime,
			endTime: self.endRecordTime
		};
	}
}

/****************************************************************************************************/
/*                                                                                                  */
/*                              Helper Methods                                                      */
/*                                                                                                  */
/****************************************************************************************************/

// Sets a keep alive status notifier
function StatusTimer() {
	var self = this;
	self.timer = undefined;

	self.setInterval = function(logic) {
		clearInterval(self.timer);
		self.timer = setInterval(function() {
			console.log(PROCESS_NAME + ' updating status....' + moment().format());
			logic();
		}, process.env.INTERVAL_TIME || 5000);
	};

	self.clearInterval = function() {
		clearInterval(self.timer);
	};
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

module.exports = MainRoutine;
