require('mongoose-geojson-schema');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var VideoCompartmentSchema = new Schema({
	videoId: {
		type: Schema.Types.ObjectId,
		ref: 'Video',
		required: true
	},
	boundingPolygon: mongoose.Schema.Types.GeoJSON,
	startTime: {
		type: Date,
		required: true
	},
	endTime: {
		type: Date,
		validate: validateGreaterThanStartTime,
		required: true
	},
	relativeStartTime: {
		type: Number,
		required: true
	},
	duration: {
		type: Number,
		required: true
	},
	destination: {
		type: String,
		required: true
	}
}, {
	timestamps: true
});

module.exports = VideoCompartmentSchema;

function validateGreaterThanStartTime(obj) {
	if (obj.startTime <= obj.endTime) {
		return false;
	}

	return true;
}
