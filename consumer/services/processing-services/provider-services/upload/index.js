module.exports.start = function(params, err, done) {
	console.log('Upload service of ProviderServices started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		done();
	}

	console.log('Lifting appropriate upload service...');
	// dynamically lift the provider's upload service
	var uploadService = require('../providers/' + process.env.PROVIDER + '/upload-service');
	if (uploadService) {
		uploadService.upload(params, err, done);
	} else {
		console.log('Provider upload service was not found.');
		done();
	}
};

function validateInput(params) {
	console.log('Provider is: ', process.env.PROVIDER);

	if (!process.env.PROVIDER) {
		return false;
	}

	return true;
}
