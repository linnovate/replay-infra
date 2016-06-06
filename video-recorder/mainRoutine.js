// requires
var mongoose = require('mongoose'),
	fs = require('fs'),
	promise = require('bluebird'),
	mkdirp = require('mkdirp'),
	StreamingSource = require('./schemas/StreamingSource'),
	FFmpegService = require('./services/FFmpegService'),
	Event = require('./services/EventService'),
	FileWatcher = require('./services/FileWatcherService')(),
	StreamListener = require('./services/StreamListenerService')();

module.exports = function() {
	console.log("Video recorder service is up.");
	console.log('Mongo host:', process.env.MONGO_HOST);
	console.log('Mongo port:', process.env.MONGO_PORT);
	console.log('Mongo database:', process.env.MONGO_DATABASE);
	console.log('Files storage path: ', process.env.STORAGE_PATH);

	// index used to find my StreamingSource object in the DB collection
	var StreamingSourceIndex = process.env.INDEX;

	getStreamingSource(StreamingSourceIndex)
		.then(handleVideoSavingProcess)
		.catch(function(err) {
			if (err)
				console.log(err);
		});
};

// fetches StreamingSource object from DB
function getStreamingSource(index) {
	mongoose.connect('mongodb://' + process.env.MONGO_HOST + ':' + process.env.MONGO_PORT + '/' + process.env.MONGO_DATABASE);

	return StreamingSource.find()
		.then(function(StreamingSource) {
			// make sure StreamingSource exist and also our object at the specified index
			if (!StreamingSource)
				return Promise.reject("StreamingSource does not exist in DB");
			else if (!StreamingSource[index])
				return Promise.reject("StreamingSource has no object at index " + index);

			return Promise.resolve(StreamingSource[index]);
		});
};

/********************************************************************************************************************************************/
/*                                                                                                                                          */
/*    Here all the process begin to run.                                                                                                    */
/*    first he will listen to the address, when he catch data streaming he will run the ffmpeg command and file watcher.                    */
/*    when the ffmpeg finish his progress or the file watcher see that the file is not get bigger it will start the whole process again.    */
/*                                                                                                                                          */
/********************************************************************************************************************************************/
function handleVideoSavingProcess(StreamingSource) {

	var FileWatcherTimer,
		command;

	console.log('Start listen to port: '); // still not finished.

	// Starting Listen to the address.
	StreamListener.StartListen({ Port: 1234, Ip: '239.0.0.1' });
	/***** Just For now HardCoded Address *****/
	/*     Should be:                         */
	/*  startStreamListener(StreamingSource)  */
	/******************************************/


	/******************************************/
	/*                                        */
	/*         Events Section:                */
	/*                                        */
	/******************************************/

	// When Error eccured in one of the services.
	Event.on('error', function(err) {
		// TODO: Handle the error.
		console.log("Error: " + err);
		if (command) {
			promise.resolve()
				.then(function() {
					command.kill('SIGKILL');
				})
				.then(function() {
					FileWatcher.StopWatchFile(FileWatcherTimer);
					StreamListener.StartListen({ Port: 1234, Ip: '239.0.0.1' });
					/***** Just For now HardCoded Address *****/
					/*     Should be:                         */
					/*  startStreamListener(StreamingSource)  */
					/******************************************/
				})
		}
	});

	// When the StreamListenerService found some streaming data in the address.
	Event.on('StreamingData', function() {
		var CurrentPath = pathBuilder({ KaronId: 239 });
		// check if the path is exist (path e.g. 'STORAGE_PATH/SourceID/CurrentDate(dd-mm-yyyy)/')
		try {
			console.log('Check if the path: ', CurrentPath, ' exist...');
			fs.accessSync(CurrentPath, fs.F_OK);
			console.log('The path is exist');
		} catch (err) {
			// when path not exist
			console.log('The path not exist...');
			// create a new path
			mkdirp.sync(CurrentPath);
			console.log('new path create at: ', CurrentPath);
		}

		var now = getCurrentTime();

		// TMP:
		var hardcodedParameters = {
			inputs: ['udp://239.0.0.1:1234'],
			duration: 10,
			dir: CurrentPath,
			file: now
		}

		// var ffmepgParams = {
		//     inputs: ['udp://' + StreamingSource.SourceIP + ':' + StreamingSource.SourcePort],
		//     duration: CONST_BLA,
		//     dir: CurrentPath,
		//     file: now
		// }

		// starting the ffmpeg process
		console.log('Record new video at: ', CurrentPath);

		FFmpegService.captureMuxedVideoTelemetry(hardcodedParameters)
			.then(function(res) {
				command = res;
				// CurrentPath += '/' + now + '.mp4';

			}, function(rej) {
				// TODO...
			});
	});

	// Start file watcher on data start flowing
	Event.on('CapturingBegan', function(filePath) {
		// start to watch the file that the ffmpeg will create
		FileWatcherTimer = FileWatcher.StartWatchFile({ Path: filePath });
	});

	// when FFmpeg done his progress
	Event.on('FFmpegDone', function() {
		promise.resolve()
			.then(function() {
				// Stop the file watcher.
				console.log('ffmpeg done his progress.');
				FileWatcher.StopWatchFile(FileWatcherTimer);
			})
			.then(function() {
				// Start the whole process again by listening to the address again.
				console.log('Start to listen the address again');
				StreamListener.StartListen({ Port: 1234, Ip: '239.0.0.1' });
				/***** Just For now HardCoded Address *****/
				/*     Should be:                         */
				/*  startStreamListener(StreamingSource)  */
				/******************************************/
			});
	});

	// When the source stop stream data.
	Event.on('FileWatchStop', function() {
		// kill The FFmpeg Process.
		console.log('The Source stop stream data, Killing the ffmpeg process');
		promise.resolve()
			.then(function() {
				command.kill('SIGKILL');
				console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
			})
			.then(function() {
				// Start the whole process again by listening to the address again.
				console.log('Start to listen the address again');
				StreamListener.StartListen({ Port: 1234, Ip: '239.0.0.1' });
				/***** Just For now HardCoded Address *****/
				/*     Should be:                         */
				/*  startStreamListener(StreamingSource)  */
				/******************************************/
			});
	});

	// kill the ffmpeg, will emit when something happen to the node process and we want to clean up things
	Event.on('KillFFmpeg', function(cb) {
		console.log('Killing ffmpeg...');
		if (command) {
			command.kill('SIGKILL');
		}
	});

};

/********************************************************************************************/
/*                                                                                          */
/*                                 Helper Methods                                           */
/*                                                                                          */
/********************************************************************************************/

// build new path in the current date. e.g: STORAGE_PATH/27-05-1996
function pathBuilder(VideoObject) {
	return process.env.STORAGE_PATH + '/' + VideoObject.KaronId + '/' + getCurrentDate();
};

// get the current date and return format of dd-mm-yyyy
function getCurrentDate() {
	var today = new Date(),
		dd = checkTime(today.getDate()),
		mm = checkTime(today.getMonth() + 1), //January is 0!
		yyyy = today.getFullYear();

	return dd + '-' + mm + '-' + yyyy;
};

// get the current time and return format of hh-MM-ss
function getCurrentTime() {
	var today = new Date(),
		h = checkTime(today.getHours()),
		m = checkTime(today.getMinutes()),
		s = checkTime(today.getSeconds());

	return h + '-' + m + '-' + s;
};

// helper method for the getCurrentDate function and for the getCurrentTime function
function checkTime(i) {
	// Check if the num is under 10 to add it 0, e.g : 5 - 05.
	if (i < 10) {
		i = "0" + i;
	}
	return i;
};

// starting Listen to the stream
function startStreamListener(StreamingSource) {

	var StreamListenerParams = {
		Ip: StreamingSource.SourceIP,
		Port: StreamingSource.SourcePort
	}
	StreamListener.StartListen(StreamListenerParams);
};

/********************************************************************************************/
/*                                                                                          */
/*                                 Exit Methods                                             */
/*                                                                                          */
/*    This will clean up the ffmpeg process before the node process will close somehow.     */
/*                                                                                          */
/********************************************************************************************/

process.stdin.resume(); // so the program will not close instantly

function exitHandler(options, err) {
	if (options.cleanup)
		Event.emit('KillFFmpeg');
	if (err)
		console.log(err.stack);
	if (options.exit)
		process.exit();
};

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
