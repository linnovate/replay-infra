/********************************************************************************************/
/*                                                                                          */
/*                                 Exit Methods                                             */
/*                                                                                          */
/*    This will clean up the ffmpeg process before the node process will close somehow.     */
/*                                                                                          */
/********************************************************************************************/

var event = require('events').EventEmitter,
	util = require('util');

function Exitutil() {
	var self = this;

	function processExit() {
		console.log('process is about to exit');
	}

	function processSigint() {
		self.emit('processBeforeExit');
	}

	function processError(err) {
		console.trace(err);
		self.emit('processBeforeExit');
	}

	function exitBind() {
		process.stdin.resume(); // so the program will not close instantly

		// do something when app is closing
		process.on('exit', processExit);
		// catches ctrl+c event
		process.on('SIGINT', processSigint);
		// catches uncaught exceptions
		process.on('uncaughtException', processError);
	}

	// function body:
	exitBind();
}

// Inhertis from the eventEmitter object
util.inherits(Exitutil, event);

// export out service.
module.exports = new Exitutil();
