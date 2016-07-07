module.exports.start = function(params) {
	console.log('Fetch service of ProviderServices started.');

	if (!validateInput(params)) {
		console.log('Some parameters are missing.');
	}

	console.log('Lifting appropriate fetch service...');
	// dynamically lift the provider's upload service
	var fetchService = require('../providers/' + process.env.PROVIDER + '/fetch-service');
	if (fetchService) {
		fetchService.fetch(params);
	} else {
		console.log('Provider fetch service was not found.');
	}
};

function validateInput(params) {
	console.log('Provider is: ', params.provider);

	if (!params.provider) {
		return false;
	}

	return true;
}
