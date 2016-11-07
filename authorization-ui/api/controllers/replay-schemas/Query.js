// populated mongoose types with geo json schemas
require('mongoose-geojson-schema');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// create a schema
var QuerySchema = new Schema({
	fromMissionTime: {
		type: Date
	},
	toMissionTime: {
		type: Date
	},
	minMissionDuration: {
		type: Number
	},
	maxMissionDuration: {
		type: Number
	},
	missionName: {
		type: String
	},
	sourceId: {
		type: String
	},
	tagsIds: {
		type: [String]
	},
	userId: {
		type: String,
		required: true
	},
	boundingShape: mongoose.Schema.Types.GeoJSON
}, {
	timestamps: true
});

var Query = mongoose.model('Query', QuerySchema);

module.exports = Query;
