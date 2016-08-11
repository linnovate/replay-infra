
const CONSUMER_NAME = '#video-proccesing#';

module.exports.start = function(params, error, done) {
	if (!paramsIsValid(params)) {
		console.log(CONSUMER_NAME, 'params are not valid');
		return error();
	}

	proccesVideo()
		.then(function() {

		})
		.catch(function() {

		});
};

// validate the params.
function paramsIsValid(params) {
	return true;
}

// understand what ts file we deal (video/data/video and data) and manipulate it.
function proccesVideo() {
	return true;
}
