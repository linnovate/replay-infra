var path = require('path');

module.exports.start = function(params, error, done) {
	console.log('Upload service of ProviderServices started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		return error();
	}

	console.log('Lifting appropriate upload service...');
	// dynamically lift the provider's upload service
	var uploadService = require(path.join(__dirname, 'providers/', process.env.PROVIDER, '/upload-service'));
	if (uploadService) {
		uploadService.upload(params, error, done);
	} else {
		console.log('Provider upload service was not found.');
		error();
	}
};

function validateInput(params) {
	console.log('Provider is: ', process.env.PROVIDER);

	if (!process.env.PROVIDER) {
		return false;
	}

	return true;
}
