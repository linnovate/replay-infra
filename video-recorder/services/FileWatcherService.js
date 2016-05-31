/*
	This Service Watch file, it will emit event when the file is not changed for a while.
*/

// all requires
var fs = require('fs'),
    event = require('./EventService');

// globals
var TimeToWait = 3000;

// Const
const SERVICENAME = 'FileWatcherService';

module.exports = FileWatcher;

function FileWatcher() {
    var _CurrentFileSize = -1,
        _FileTimer;

    var _CheckFileSize = function(){

    };

    var _StopTimer = function(){

        if(_FileTimer){

            clearInterval(_FileTimer);
            
        }
    };

    this.StartWatchFile = function(){

    };

    this.StopWatchFile = function(){

    };
};

/*
	This func start watch given file,
	It Check every X seconds if the file has changed, if it didnt change in the last X seconds, it will stop watch the file and will emit event.

	Params should contain at least Path To the file we want to watch.
*/
exports.StartWatchFile = function(params) {

    const METHODNAME = 'StartWatchFile';

    console.log(SERVICENAME, '.', METHODNAME, ' start running...');

    // Check if there is path.
    if (!params.Path) {
        event.emit('error', 'Error accured in ', SERVICENAME, '.', METHODNAME, ' : Path cannot be undefined.');
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

    console.log(SERVICENAME, '.', METHODNAME, ' Init new interval...');
    console.log(SERVICENAME,'.',METHODNAME,' Start checking at:',params.Path);

    // Start Timer to follow the file.
    Timer = setInterval(function() { CurrentFileSize = CheckFileSize(params.Path, CurrentFileSize, Timer, FileStoppedGrow); }, TimeToWait);

    console.log(SERVICENAME, '.', METHODNAME, ' Finished...');

    return Timer;
};

/*
	This func stop the follow of the file when it needed.
*/
exports.StopWatchFile = function(timer) {

    const METHODNAME = 'StopWatchFile';

    console.log(SERVICENAME, '.', METHODNAME, ' start running...');

    clearInterval(Timer);

    console.log(SERVICENAME, '.', METHODNAME, ' Finished...');
};


// Check the file Size, when it 
var CheckFileSize = function(path, filesize, timer, callback) {

    const METHODNAME = 'CheckFileSize';

    console.log(SERVICENAME, '.', METHODNAME, ' start running...');

    // Get the State Of the file.
    fs.stat(path, function(err, stat) {

        if(err){
            event.emit('error','Error accured in :' + SERVICENAME + '.' + METHODNAME + ': ' + err);
            callback(timer);
        }

        console.log(SERVICENAME, '.', METHODNAME, ' CurrentFileSize: ', stat.size, ' | LastFileSize: ', filesize);

        // Check if the file size is bigger than the last check.
        if (stat.size > filesize) {

            // Update the file size.
            //filesize = stat.size;
            return stat.size;

        } else {

            // Callback called when the file stopped grow.
            console.log('taking down timer!')
            callback(timer);

        }

        console.log(SERVICENAME, '.', METHODNAME, ' Finished...');

    });
};
