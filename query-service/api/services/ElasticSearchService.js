var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
	host: sails.config.settings.services.elastic.host + sails.config.settings.services.elastic.port,
	log: ['error', 'warning']
});

module.exports = {
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

	searchVideoMetadata: function(polygon) {
		var body = {
			query: {
				geo_shape: {
					sensorTrace: {
						relation: 'intersects',
						shape: {
							type: 'polygon',
							coordinates: [
								[polygon]
							]
						}
					}
				}
			}
		};
		// body.query  = {};
		// body.query.geo_shape = {};
		// body.query.geo_shape.location = {};
		// body.query.geo_shape.location.relation = relation;
		// body.query.geo_shape.location.shape = {};
		// body.query.geo_shape.location.shape.type = 'polygon';
		// body.query.geo_shape.location.shape.coordinates = [[]];
		// body.query.geo_shape.location.shape.coordinates[0] = polygon;

		return client.search('videometadata', 'videometadatas', body);
	}
};
