var xml2js = require('xml2js'),
	_ = require('lodash'),
	moment = require('moment');

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
		return {
			sourceId: params.sourceId,
			videoId: params.videoId,
			receivingMethod: params.receivingMethod,
			timestamp: moment(metadata.TimeTag.Time).utc().format(),
			sensorPosition: {
				lat: metadata.SensorPOV.Position.Latitude,
				lon: metadata.SensorPOV.Position.Longitude
			},
			sensorTrace: tracePointsToGeoJson(metadata.SensorTrace.TracePoint),
			data: metadata
		};
	});
	return mapping;
}

// convert tracePoints array in the form of:
// [{ Eastings: ... , Northing: ....}]
// to Geo Json in the form of:
// { type: 'polygon', coordinates: [[[lon, lat]]] }
function tracePointsToGeoJson(tracePoints) {
	var geoJson = {};
	geoJson.type = 'Polygon';
	// check there are at least 2 points (which is valid, we duplicate the first one)
	if (tracePoints.length > 1) {
		geoJson.coordinates = [[]];
		geoJson.coordinates[0] = toWGS84(tracePoints);
		// copy first coordinate to last position in order to complete the polygon
		geoJson.coordinates[0].push(geoJson.coordinates[0][0]);
		return geoJson;
	}
	// return undefined sensorTrace
	console.log('Trace points received are not a valid polygon');
	return undefined;
}

// convert EPSG Code 32636 (UTM 36N) points to WGS-84 points
function toWGS84(epsgPoints) {
	return _.map(epsgPoints, function(point) {
		var latlon = geoConverter.utmToLatLon(point.Eastings, point.Northings, 36, false);
		// Geo-Json coordinates are lon, lat!
		return [latlon[1], latlon[0]];
	});
}
