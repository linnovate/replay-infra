// // Pass the name of the hosts as parameters to the script
// // Default variables will be used if no input was inserted
// // The script basically replace all $HOST tags inside all the template files ending with *.template

// var path = require('path'),
// 	fs = require('fs');

// var DEFAULT_URLS = [
// 	'localhost',
// 	'dev.replay.linnovate.net'
// ];

// var hosts = process.argv.slice(2);
// if (hosts.length === 0) {
// 	console.log('No hosts inserted...');
// 	console.log('Generating config files for the default urls:', DEFAULT_URLS);
// 	hosts = DEFAULT_URLS;
// }
// else {
// 	console.log('Generating config files for:', hosts);
// }

// var templateFiles = readFilesSync('.template');
// for()

// function readFilesSync(filter) {
// 	var resultFiles = [];
// 	var files = fs.readdirSync(__dirname);
// 	for (var i = 0; i < files.length; i++) {
// 		if (files[i].indexOf(filter) >= 0) {
// 			resultFiles.push(files[i]);
// 		}
// 	}

// 	return resultFiles;
// }
