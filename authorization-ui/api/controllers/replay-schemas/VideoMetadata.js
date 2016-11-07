// populated mongoose types with geo json schemas
require('mongoose-geojson-schema');
var mongoose = require('mongoose');
var ReceivingMethod = require('./common-nested-schemas/ReceivingMethod');
var Schema = mongoose.Schema;

// create a schema
var VideoMetadataSchema = new Schema({
	sourceId: {
		type: String,
		required: true
	},
	videoId: {
		type: String
	},
	receivingMethod: ReceivingMethod,
	timestamp: {
		type: Date
	},
	sensorPosition: {
		lat: { type: Number },
		lon: { type: Number }
	},
	sensorTrace: mongoose.Schema.Types.Polygon,
	data: {
		type: Schema.Types.Mixed
	}
}, {
	timestamps: true
});

var VideoMetadata = mongoose.model('VideoMetadata', VideoMetadataSchema);

module.exports = VideoMetadata;
