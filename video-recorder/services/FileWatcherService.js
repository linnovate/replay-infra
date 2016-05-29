/*
	This Service Watch file, it will emit event when the file is not changed for a while.
*/

// all requires
var fs = require('fs'),
    event = require('./EventService');

// globals
var TimeToWait = 3000,
    CurrentFileSize,
    Timer,
    FilePath;

/*
	This func start watch given file,
	It Check every X seconds if the file has changed, if it didnt change in the last X seconds, it will stop watch the file and will emit event.

	Params should contain at least Path To the file we want to watch.
*/
exports.StartWatchFile = function(params) {

    // Reset The Current file size.
    CurrentFileSize = -1;

    // Set the file path.
    FilePath = params.Path;

    // Start Timer to follow the file.
    Timer = setInterval(CheckFileSize, TimeToWait);
};

/*
	This func stop the follow of the file when it needed.
*/
exports.StopWatchFile = function(){
	clearInterval(Timer);
};


// Check the file Size.
var CheckFileSize = function() {

    // Get the State Of the file.
    fs.stat(FilePath, function(err, stat) {

        // Check if the file size is bigger than the last check.
        if (stat.size > CurrentFileSize) {

            // Update the file size.
            CurrentFileSize = stat.size;

        } else {

            // Stop the timer and emit event.
            clearInterval(Timer);
            event.emit('FileWatchStop');

        }
    });
};
