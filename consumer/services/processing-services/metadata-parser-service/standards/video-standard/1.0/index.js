var xml2js = require('xml2js'),
	_ = require('lodash'),
	moment = require('moment'),
	VideoMetadata = require('replay-schemas/VideoMetadata');

// parses the raw data from the metadata file into metadataVideo objects
// params is a json of:
// sourceId (must)
// videoId (optional)
// methods (must)

module.exports.parse = function(data, params) {
	var result = [];

	var delimiter = '</VIMSMessage>';

	var xmls = data.split(delimiter);
	// pop last item since it's the delimiter itself
	xmls.pop();

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
				if (err) {
					throw err;
				} else if (xmlObj) {
					result.push(xmlObj);
				}
			});
		}
	});

	return metadataObjectsToVideoMetadata(result, params);
};

function metadataObjectsToVideoMetadata(metadatas, params) {
	var mapping = _.map(metadatas, function(metadata) {
		return new VideoMetadata({
			sourceId: params.sourceId,
			videoId: params.videoId,
			receivingMethod: params.method,
			timestamp: moment.utc(metadata.TimeTag.Time),
			sensorPosition: {
				lat: metadata.SensorPOV.Position.Latitude,
				lon: metadata.SensorPOV.Position.Longitude
			},
			sensorTrace: toWGS84(metadata.SensorTrace.TracePoint),
			data: metadata
		});
	});
	return mapping;
}

// convert EPSG Code 32636 (UTM 36N) to WGS-84
function toWGS84(epsgPoints) {
	return _.map(epsgPoints, function(point) {
		return {
			lat: 31.760051,
			lon: 35.210370,
			_id: undefined
		};
	});
}
