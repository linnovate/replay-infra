var xml2js = require('xml2js');

// parses the raw data from the metadata file into objects
module.exports.parse = function(data) {
	var result = [];

	var delimiter = '</VIMSMessage>';

	var xmls = data.split(delimiter);

	xmls.forEach(function(xmlString) {
		if (xmlString) {

			xmlString += delimiter;

			// parse xmlString while:
			// do not make an array for each child
			// remove root element
			// ignore attributes
			xml2js.parseString(xmlString, {
				explicitArray: false,
				explicitRoot: false,
				ignoreAttrs: true
			}, function(err, xmlObj) {
				if (err)
					throw err;
				else if (xmlObj)
					result.push(xmlObj);
			});
		}
	});
	return result;
}
