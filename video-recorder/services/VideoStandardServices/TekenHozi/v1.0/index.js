var fs = require('fs');

// inner variables
var SYNC_DURATION = 1000, // the duration in which the timer wakes up
	CUT_DURATION = 30 * 60 * 1000, // the duration in which we cut the video
	isRecording, // are we recording right now or not
	isVideoReady, //  whether video is streamed to port or not
	currentRecordingProps; // used to track the current recording

module.exports.start = function(karonId, params) {

	// the port 'Video Shazur' is coming through
	var port = params.videoPort;

	setInterval(function() {

		// case we're not recording
		if (!isRecording) {

			// case no video is streamed to port and no recording process is undergoing
			if (!isVideoReady) {
				//
				// setup listener to listen to port if it isn't listening already
				// listener should accept the port number, and allow to set event callbacks for:
				// 1. onStreamingStart
				// 2. onStreamingPause
				// we'll change the status of isVideoReady in those callbacks
				// update DB with a VideoStatus of 'LISTENING TO PORT'
				//
			}
			// in case video is ready, setup directories and start ffmpeg
			else {
				//
				//	stop listener
				//

				// get directory of the video file
				var dir = setupDirectories(karonId);

				// create the file name
				var filename = karonId + '_' + moment().format();

				//
				// start FFmpeg service on this port with the specified file name
				//

				//
				//	update DB with a VideoStatus of 'RECORDING';
				//

				// track the file
				currentRecordingProps = {};
				currentRecordingProps.filename = filename;
				currentRecordingProps.filesize = 0;
				isRecording = true;
			}
		}
		// case we're recording, track file progress
		else {

			// check file size
			// detect whether file is growing or at the same size
			// if it is growing, or if CUR_DURATION hasn't passed continue
			// else:
			// 1. cut the video (stop the FFmpeg recording)
			// 2. update DB with a VideoStatus of 'FINISHED'

		}

	}, SYNC_DURATION);
}

// make sure the karon directory exists and there's a directory for today,
// and return the path
function setupDirectories(karonId) {
	var karonDirPath = process.env.STORAGE_PATH + '/' + karonId;
	// make sure the karon directory exists and if not, create it
	createDirIfNotExists(karonDirPath);

	// now make sure a directory for today exists and if not, create it
	var todayDate = moment().format('DD-MM-YYYY');
	var todayDirPath = karonDirPath + '/' + todayDate;
	createDirIfNotExists(todayDirPath);

	return todayDirPath;
}

function createDirIfNotExists(path) {
	try {
		fs.mkdirSync(path);
	} catch (e) {
		if (e.code != 'EXIST') throw e;
	}
}
