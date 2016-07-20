var fs = require('fs');

module.exports.upload = function(params, err, done) {
	console.log('Kaltura Upload Service started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		done();
	}

	var sourceFilePath = process.env.STORAGE_PATH + '/' + params.relativePath;
	var targetFilePath = process.env.DROP_FOLDER_PATH + '/' + params.videoName;

	// copy video file into drop folder
	copyFile(sourceFilePath, targetFilePath, function(err) {
		if (err) {
			console.log('Error copying video to dropfolder: ', err);
			err();
		}

		console.log('Video successfuly copied to dropfolder.');
		done();
	});
};

function validateInput(params) {
	console.log('Video name is: ', params.videoName);
	console.log('Relative path to video is: ', params.relativePath);
	console.log('Drop folder path is: ', process.env.DROP_FOLDER_PATH);

	if (!process.env.STORAGE_PATH || !process.env.DROP_FOLDER_PATH || !params.relativePath || !params.videoName) {
		return false;
	}

	return true;
}

function copyFile(source, target, cb) {
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	rd.on('error', function(err) {
		done(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on('error', function(err) {
		done(err);
	});
	wr.on('close', function(ex) {
		done();
	});
	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			cbCalled = true;
			cb(err);
		}
	}
}
