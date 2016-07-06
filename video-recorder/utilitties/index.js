var fs = require('fs');
var mkdirp = require('mkdirp');

module.exports = new Utilitties();

function Utilitties() {
	return {
		checkPath: checkPath,
		getCurrentDate: getCurrentDate,
		getCurrentTime: getCurrentTime,
		addMetadataManualy: addMetadataManualy
	};
}

/*****************************************
 * For Integration with parser component *
 *****************************************/
function addMetadataManualy(metadataFile) {
	fs.createReadStream('./DemoData/DemoXML.xml')
		.pipe(fs.createWriteStream(metadataFile));
}

// check if the path is exist (path e.g. 'STORAGE_PATH/SourceID/CurrentDate(dd-mm-yyyy)/')
function checkPath(path) {
	try {
		console.log('#MainRoutine# Check if the path: ', path, ' exist...');
		fs.accessSync(path, fs.F_OK);
		console.log('#MainRoutine# The path is exist');
	} catch (err) {
		// when path not exist
		console.log('#MainRoutine# The path not exist...');
		// create a new path
		mkdirp.sync(path);
		console.log('#MainRoutine# new path create at: ', path);
	}
}
// get the current date and return format of dd-mm-yyyy
function getCurrentDate() {
	var today = new Date(),
		dd = checkTime(today.getDate()),
		mm = checkTime(today.getMonth() + 1), // January is 0!
		yyyy = today.getFullYear();

	return dd + '-' + mm + '-' + yyyy;
}

// get the current time and return format of hh-MM-ss
function getCurrentTime() {
	var today = new Date(),
		h = checkTime(today.getHours()),
		m = checkTime(today.getMinutes()),
		s = checkTime(today.getSeconds());

	return h + '-' + m + '-' + s;
}

// helper method for the getCurrentDate function and for the getCurrentTime function
function checkTime(i) {
	// Check if the num is under 10 to add it 0, e.g : 5 - 05.
	if (i < 10) {
		i = '0' + i;
	}
	return i;
}
