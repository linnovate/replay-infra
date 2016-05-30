var Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('fs'));

module.exports.start = function(params){
	console.log('MetadataParserService started.');

	// extract params and handle metadata
	var relativePathToData = params.relativePath;
	var method = params.method;

	console.log('Relative path is: ', relativePathToData);
	console.log('Method is: ', method);

	// validate params
	if(!relativePathToData || !process.env.STORAGE_PATH ||
		!method || !method.standard || !method.version){
		console.log('Some vital parameters are missing.');
		return;
	}

	// concat full path
	var pathToData = process.env.STORAGE_PATH + '/' + relativePathToData;

	readDataAsString(pathToData)
	.then(function(data){
		return dataToObjects(method, data);
	})
	.then(saveToElastic)
	.catch(handleErrors);
}

function readDataAsString(path){
	return fs.readFileAsync(path, "utf8");
}

function dataToObjects(method, data){
	return new Promise(function(resolve, reject){
		
		var standardHandler;
		if(method.standard == 'TekenHozi' && method.version == 0.9)
			standardHandler = require('./Standards/TekenHozi/0.9');
		else if(method.standard == 'TekenHozi' && method.version == 1.0)
			standardHandler = require('./Standards/TekenHozi/1.0');
		else
			reject('Unsupported standard and version');

		resolve(standardHandler.parse(data));
	});
}

function saveToElastic(xmls){
	console.log('xmls are ', xmls);
}

function handleErrors(err){	
	if(err) console.log(err);
}