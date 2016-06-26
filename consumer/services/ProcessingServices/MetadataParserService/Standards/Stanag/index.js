var stanag = require('stanag');
	// parses the raw data from the metadata file into objects
module.exports.parse = function(data) {
	var result = stanag(data);
	return result;
};
