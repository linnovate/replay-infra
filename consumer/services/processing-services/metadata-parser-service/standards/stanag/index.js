var stanag = require('stanag'),
	_ = require('lodash');
	// parses the raw data from the metadata file into objects

module.exports.parse = function(data, params) {
	var metadata = stanag(data, 'name');
	var result = metadataObjectsToVideoMetadata(metadata, params);
	return result;
};
function metadataObjectsToVideoMetadata(metadatas, params) {
	var polygon = {
		type: 'polygon',
		coordinates: [
			[34.8, 32.1],
			[34.8, 31.1],
			[34.9, 31.1],
			[34.9, 32.1],
			[34.8, 32.1]]
	}
		;

	var mapping = _.map(metadatas, function(metadata) {
		// time = addOneSecond(metadata.uNIXTimeStamp);

		console.log(metadata.sensorLatitude);
		// document.write(dateStr);
		changeCoordinates(polygon);
		return {
			sourceId: params.sourceId,
			videoId: params.videoId,
			receivingMethod: params.receivingMethod,
			timestamp: metadata.value.unixTimeStamp.value,
			sensorPosition: {
				lat: metadata.value.sensorLatitude,
				lon: metadata.value.sensorLongitude
			},
			sensorTrace: polygon,
			data: {}
		};
	});
	return mapping;
}

function changeCoordinates(polygon) {
	var coordinates = [];
	polygon.coordinates.forEach(function(lonLat) {
		lonLat[0] = Number((lonLat[0] + 0.01).toPrecision(4));
		lonLat[1] = Number((lonLat[1] + 0.01).toPrecision(4));
		coordinates.push(lonLat);
	});
	polygon.coordinates = coordinates;
}

// stanag time sample: 2009-06-17T16:53:05.099Z
// function addOneSecond(time) {

// 	var minMilli = 1000 * 60;
// 	var hrMilli = minMilli * 60;
// 	var dyMilli = hrMilli * 24;

// 	var testDate = new Date(time);

// 	testDate.setSeconds(testDate.getSeconds()+1);
// 	dateStr = testDate.getYear()+'-'+testDate.getMonth()+'-'+testDate.getDay()
// 	+'T'+testDate.getHours()+':'+testDate.getMinutes()+':'+
// 	testDate.getSeconds()+'.'+testDate.getMilliseconds()+'Z';
// 	return dateStr;
// }

