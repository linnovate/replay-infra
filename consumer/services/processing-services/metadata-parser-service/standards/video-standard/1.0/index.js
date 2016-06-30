var xml2js = require('xml2js'),
	_ = require('lodash'),
	moment = require('moment'),
	VideoMetadata = require('replay-schemas/VideoMetadata');

var geoConverter = require('./services/utm-lat-lon-converter');

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
			timestamp: moment(metadata.TimeTag.Time).utc().format(),
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

// convert EPSG Code 32636 (UTM 36N) points to WGS-84 points
function toWGS84(epsgPoints) {
	return _.map(epsgPoints, function(point) {
		var latlon = geoConverter.utmToLatLon(point.Eastings, point.Northings, 36, false);
		return {
			lat: latlon[0],
			lon: latlon[1],
			_id: undefined
		};
	});
}
