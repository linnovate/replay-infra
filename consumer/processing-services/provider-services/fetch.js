var path = require('path');

module.exports.start = function(params, error, done) {
	console.log('Fetch service of ProviderServices started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
		return error();
	}

	console.log('Lifting appropriate fetch service...');
	// dynamically lift the provider's upload service
	var fetchService = require(path.join(__dirname, 'providers/', process.env.PROVIDER, '/fetch-service'));
	if (fetchService) {
		fetchService.fetch(params, error, done);
	} else {
		console.log('Provider fetch service was not found.');
		error();
	}
};

function validateInput(params) {
	console.log('Provider is: ', params.provider);

	if (!params.provider) {
		return false;
	}

	return true;
}
