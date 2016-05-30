/*
	This Service Watch file, it will emit event when the file is not changed for a while.
*/

// all requires
var fs = require('fs'),
    event = require('./EventService');

// globals
var TimeToWait = 3000;

// Const
const ServiceName = 'FileWatcherService';

/*
	This func start watch given file,
	It Check every X seconds if the file has changed, if it didnt change in the last X seconds, it will stop watch the file and will emit event.

	Params should contain at least Path To the file we want to watch.
*/
exports.StartWatchFile = function(params) {

    const MethodName = 'StartWatchFile';

    console.log(ServiceName, '.', MethodName, ' start running...');

    // Check if there is path.
    if (!params.Path) {
        event.emit('error', 'Error accured in ', ServiceName, '.', MethodName, ' : Path cannot be undefined.');
        return null;
    }

    // Reset The Current file size.
    var CurrentFileSize = -1,
        Timer;

    // Callback function, when the file stop grow it will activate.
    var FileStoppedGrow = function(timer) {
        clearInterval(timer);
        event.emit('FileWatchStop');
    };

    console.log(ServiceName, '.', MethodName, ' Init new interval...');

    // Start Timer to follow the file.
    Timer = setInterval(function() { CheckFileSize(params.Path, CurrentFileSize, Timer, FileStoppedGrow); }, TimeToWait);

    console.log(ServiceName, '.', MethodName, ' Finished...');

    return Timer;
};

/*
	This func stop the follow of the file when it needed.
*/
exports.StopWatchFile = function(timer) {

    const MethodName = 'StopWatchFile';

    console.log(ServiceName, '.', MethodName, ' start running...');

    clearInterval(Timer);

    console.log(ServiceName, '.', MethodName, ' Finished...');
};


// Check the file Size, when it 
var CheckFileSize = function(path, filesize, timer, callback) {

    const MethodName = 'CheckFileSize';

    console.log(ServiceName, '.', MethodName, ' start running...');

    // Get the State Of the file.
    fs.stat(path, function(err, stat) {

        console.log(ServiceName, '.', MethodName, ' CurrentFileSize: ', stat.size, ' | LastFileSize: ', filesize);

        // Check if the file size is bigger than the last check.
        if (stat.size > filesize) {

            // Update the file size.
            filesize = stat.size;

        } else {

            // Callback called when the file stopped grow.
            callback(timer);

        }

        console.log(ServiceName, '.', MethodName, ' Finished...');

    });
};
