/*
    This Service Watch file, it will emit event when the file is not changed for a while.
*/

// all requires
var fs = require('fs');
var event = require('./EventEmitterSingleton');

// globals
var TimeToWait = 5000;

// const
const SERVICE_NAME = '#FileWatcher#';

// export out service.
module.exports = FileWatcher;

// Init the FileWathcer Service.
function FileWatcher() {
    var _CurrentFileSize = -1,
        _FileTimer;

    // Stoping the timer when it needed.
    var _StopTimer = function(timer) {
        if (timer) {
            clearInterval(timer);
            _CurrentFileSize = -1;
        }
    };

    // Check the file Size, when it not growing it will emit event.
    var _CheckFileSize = function(path) {
        const METHOD_NAME = 'CheckFileSize';
        //console.log(SERVICE_NAME, '.', METHOD_NAME, ' start running...');
        // Get the State Of the file.
        fs.stat(path, function(err, stat) {
            if (err) {
                // Emit event of error and stop the timer.
                event.emit('error', 'Error accured in :' + SERVICE_NAME + '.' + METHOD_NAME + ': ' + err);
                console.log(SERVICE_NAME, METHOD_NAME, ': ', 'Stop the Timer...');
                _StopTimer(_FileTimer);
                return false;
            }

            console.log(SERVICE_NAME, METHOD_NAME, ' CurrentFileSize: ', stat.size, ' | LastFileSize: ', _CurrentFileSize);

            // Check if the file size is bigger than the last check.
            if (stat.size > _CurrentFileSize) {
                // Update the file size.
                _CurrentFileSize = stat.size;
            } else {
                // Callback called when the file stopped grow.
                console.log(SERVICE_NAME, METHOD_NAME, ': ', 'Stop the Timer...');
                _StopTimer(_FileTimer);
                event.emit('FileWatchStop');
            }
            //console.log(SERVICE_NAME, '.', METHOD_NAME, ' Finished...');
        });
    };

    /*
        This func start watch given file,
        It Check every X seconds if the file has changed, if it didnt change in the last X seconds, it will stop watch the file and will emit event.

        Params should contain at least Path To the file we want to watch.
    */
    var startWatchFile = function(params) {
        const METHOD_NAME = 'StartWatchFile';
        // Check if there is path.
        if (!params.Path) {
            event.emit('error', 'Error accured in ', SERVICE_NAME, '.', METHOD_NAME, ' : Path cannot be undefined.');
            return null;
        }

        console.log(SERVICE_NAME, METHOD_NAME, ' Init new interval...');
        console.log(SERVICE_NAME, METHOD_NAME, ' Start checking at:', params.Path);

        // Start Timer to follow the file.
        _FileTimer = setInterval(function() {
            _CheckFileSize(params.Path);
        }, TimeToWait);

        //console.log(SERVICE_NAME, '.', METHOD_NAME, ' Finished...');
        return _FileTimer;
    };

    /*
        This func stop the follow of the file when it needed.
    */
    var stopWatchFile = function(timer) {
        _StopTimer(timer);
    };

    return {
        startWatchFile: startWatchFile,
        stopWatchFile: stopWatchFile
    };
}
