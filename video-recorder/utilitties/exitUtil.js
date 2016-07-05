/********************************************************************************************/
/*                                                                                          */
/*                                 Exit Methods                                             */
/*                                                                                          */
/*    This will clean up the ffmpeg process before the node process will close somehow.     */
/*                                                                                          */
/********************************************************************************************/

module.export = new Exitutil();

function Exitutil() {
	var _ffmpegProcessCommand;

	function setFFmpegProcessCommand(command) {
		_ffmpegProcessCommand = command;
	}

	process.stdin.resume(); // so the program will not close instantly

	// do something when app is closing
	// process.on('exit', exitHandler.bind(null));
	// catches ctrl+c event
	process.on('SIGINT', exitHandler.bind(null, { exit: true }));
	// catches uncaught exceptions
	process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

	function exitHandler(options, err) {
		if (err) {
			console.log(err);
		}
		if (_ffmpegProcessCommand) {
			_ffmpegProcessCommand.kill('SIGKILL');
		}
		if (options.exit) {
			console.log('process exit');
			process.exit();
		}
	}

	return {
		setFFmpegProcessCommand: setFFmpegProcessCommand
	};
}
