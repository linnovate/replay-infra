/*
    This Service Watch file, it will emit event when the file is not changed for a while.
*/

// all requires
var fs = require('fs');
var event = require('events').EventEmitter,
	util = require('util');

// const
const SERVICE_NAME = '#FileWatcher#',
	MAX_CHECK_TRIES = 3;

// Init the FileWathcer Service.
var FileWatcher = function() {
	var self = this;

	var _currentFileSize = -1,
		_fileTimer,
		_timeToWait = 5000,
		_checkingAttempts = 1;

	// Stoping the timer when it needed.
	var _stopTimer = function(timer) {
		if (timer) {
			clearInterval(timer);
		} else if (_fileTimer) {
			clearInterval(_fileTimer);
		}
		_currentFileSize = -1;
		_checkingAttempts = 1;
	};

	// Check the file Size, when it not growing it will emit event.
	var _CheckFileSize = function(path) {
		const METHOD_NAME = 'CheckFileSize';
		// console.log(SERVICE_NAME, '.', METHOD_NAME, ' start running...');
		// Get the State Of the file.
		fs.stat(path, function(err, stat) {
			if (err) {
				if (_checkingAttempts === MAX_CHECK_TRIES) {
					// Emit event of error and stop the timer.
					self.emit('FileDontExist_FileWatcher', 'Error accured in :' + SERVICE_NAME + '.' + METHOD_NAME + ': ' +
						'could not found any file, ignore it and continue on');
					console.log(SERVICE_NAME, METHOD_NAME, ': ', 'Stop the Timer...');
					_stopTimer(_fileTimer);
				} else {
					console.log(SERVICE_NAME, 'Could not find the file, trying again...');
					_checkingAttempts++;
				}
				return false;
			}

			console.log(SERVICE_NAME, METHOD_NAME, ' CurrentFileSize: ', stat.size, ' | LastFileSize: ', _currentFileSize);

			// Check if the file size is bigger than the last check.
			if (stat.size > _currentFileSize) {
				// Update the file size.
				_currentFileSize = stat.size;
			} else {
				// Callback called when the file stopped grow.
				console.log(SERVICE_NAME, METHOD_NAME, ': ', 'Stop the Timer...');
				_stopTimer(_fileTimer);
				self.emit('FileWatchStop', path);
			}
			// console.log(SERVICE_NAME, '.', METHOD_NAME, ' Finished...');
		});
	};

	/*
	    This func start watch given file,
	    It Check every X seconds if the file has changed, if it didnt change in the last X seconds, it will stop watch the file and will emit event.

	    Params should contain at least Path To the file we want to watch.
	*/
	self.startWatchFile = function(params) {
		var promise = new Promise(function(resolve, reject) {
			const METHOD_NAME = 'StartWatchFile';
			// Check if there is path.
			if (params.timeToWait) {
				_timeToWait = params.timeToWait;
			}
			if (!params.path) {
				return reject('Error accured in ' + SERVICE_NAME + '.' + METHOD_NAME + ' : Path cannot be undefined');
			}

			console.log(SERVICE_NAME, METHOD_NAME, ' Init new interval...');
			console.log(SERVICE_NAME, METHOD_NAME, ' Start checking at:', params.path);

			// Start Timer to follow the file.
			_fileTimer = setInterval(function() {
				_CheckFileSize(params.path);
			}, _timeToWait);

			// console.log(SERVICE_NAME, '.', METHOD_NAME, ' Finished...');
			return resolve(_fileTimer);
		});
		return promise;
	};

	/*
	    This func stop the follow of the file when it needed.
	*/
	self.stopWatchFile = function(timer) {
		_stopTimer(timer);
	};
};

// Inhertis from the eventEmitter object
util.inherits(FileWatcher, event);

// export out service.
module.exports = new FileWatcher();
