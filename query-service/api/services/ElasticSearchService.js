var elasticsearch = require('elasticsearch'),
	Promise = require('bluebird');

var _client;

// connect to ElasticSearch once so the service won't have to re-create connection each time
module.exports.connect = function(_host, _port) {
	var host = _host || 'localhost';
	var port = _port || 9200;

	var uri = host + ':' + port;
	// connect to elastic
	// keep-alive is true by default, which means forever
	_client = new elasticsearch.Client({
		host: uri,
		log: ['error', 'warning'],
		apiVersion: '2.3',
		sniffOnConnectionFault: true,
		deadTimeout: 10 * 1000,
		maxRetries: 10,
		defer: function() {
			return Promise.defer();
		}
	});
};

// search: function(index, type, body, callback) {
// client.search({
// 	index: index || "*",
// 	type: type,
// 	body: body

// }).then(callback, function(err, res) {
// 	console.trace("err", err.message);
// 	console.log("res", res);
// });
// },

// searchByDistance: function(latitude, longitude, distance, callback) {
// 	var query = {};
// 	query.filter = {};
// 	query.filter.geo_distance = {};
// 	query.filter.geo_distance.locations = {};
// 	query.filter.geo_distance.distance = distance; //"100km"
// 	query.filter.geo_distance.locations.lat = latitude; //32.100981
// 	query.filter.geo_distance.locations.lon = longitude; //34.811919
// 	this.search(null, "metadata", query, function(resp) {
// 		callback(resp.hits.hits);
// 	});
// }

// pay attention that lon is before lat
// coordonates suppose to have array inside array

module.exports.searchVideoMetadata = function(polygon) {
	var body = {
		query: {
			geo_shape: {
				sensorTrace: {
					relation: 'intersects',
					shape: {
						type: 'Polygon',
						coordinates: polygon
					}
				}
			}
		}
	};
	var query = {
		index: 'videometadatas',
		type: 'videometadata',
		body: body
	};

	return _client.search(query);
};

module.exports.getDataByName = function(index, type, name, sort, callback) {
	var body = {
		query: {
			term: { videoId: name }
		}
	};

	_client.search(index, type, body, sort, function(resp) {
		callback(resp.hits.hits);
	});
};

module.exports.getDataByAll = function(index, type, termsArray, startTime, endTime, polygon, relation, callback) {
	var body = {
		filter: {
			bool: {
				must: {}
			}
		}
	};

	if (polygon !== null) {
		var squery = {
			geo_shape: {
				sensorTrace: {
					relation: relation,
					shape: {
						type: 'polygon',
						coordinates: [
							[]
						]
					}
				}
			}
		};
		var i = 0;

		polygon.forEach(function(r) {
			squery.geo_shape.sensorTrace.shape.coordinates[0][i] = r;
			i++;
		});

		termsArray.push(squery);
	}

	if (startTime !== null) {
		var tquery = {};
		tquery.range = {};
		tquery.range.timestamp = {};
		tquery.range.timestamp.gte = startTime;
		if (endTime === null) {
			var now = new Date();

			console.log(now);
			endTime = now.toISOString();
		}
		console.log(startTime, endTime);
		tquery.range.timestamp.lte = endTime;
		termsArray.push(tquery);
	}

	body.filter.bool.must = termsArray;
	_client.search(index, type, body, null, function(resp) {
		callback(resp.hits.hits);
	});
};
