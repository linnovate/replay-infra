/********************************************************************************************/
/*                                                                                          */
/*                                 Exit Methods                                             */
/*                                                                                          */
/*    This will clean up the ffmpeg process before the node process will close somehow.     */
/*                                                                                          */
/********************************************************************************************/

module.exports = new Exitutil();

function Exitutil() {
	var _ffmpegProcessCommand;

	function _setFFmpegProcessCommand(command) {
		_ffmpegProcessCommand = command;
	}

	function exitHandler(options, err) {
		if (err) {
			console.log(err);
		}
		if (_ffmpegProcessCommand) {
			console.log('Killing FFmpeg Process');
			_ffmpegProcessCommand.kill('SIGKILL');
		}
		if (options.exit) {
			console.log('process exit');
			process.exit();
		}
	}

	function exitBind() {
		process.stdin.resume(); // so the program will not close instantly

		// do something when app is closing
		// process.on('exit', exitHandler.bind(null));
		// catches ctrl+c event
		process.on('SIGINT', exitHandler.bind(null, { exit: true }));
		// catches uncaught exceptions
		process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
	}

	// function body:

	exitBind();

	return {
		setFFmpegProcessCommand: _setFFmpegProcessCommand
	};
}
