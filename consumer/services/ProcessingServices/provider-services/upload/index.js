module.exports.start = function(params) {
    console.log('Upload service of ProviderServices started.');

    if (!validateInput(params)) {
        console.log('Some parameters are missing.');
    }

    console.log('Lifting appropriate upload service...');
    // dynamically lift the provider's upload service
    var uploadService = require('../providers/' + process.env.PROVIDER + '/UploadService');
    if (uploadService)
        uploadService.upload(params)
    else
        console.log('Provider upload service was not found.');
}

function validateInput(params) {
    console.log('Provider is: ', process.env.PROVIDER);

    if (!process.env.PROVIDER)
        return false;

    return true;
}