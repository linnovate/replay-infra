var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ReceivingMethod = require('./common-nested-schemas/ReceivingMethod');

// create a schema
var StreamingSourceSchema = new Schema({
	sourceID: {
		type: String,
		required: true,
		unique: true
	},
	sourceName: {
		type: String,
		required: true
	},
	sourceType: {
		type: String,
		required: true
	},
	sourceIP: {
		type: String,
		required: true
	},
	sourcePort: {
		type: Number,
		required: true
	},
	streamingMethod: ReceivingMethod,
	streamingStatus: {
		type: String,
		enum: ['NONE', 'LISNTENING', 'CAPTURING'],
		required: true,
		default: ['NONE']
	}
}, {
	timestamps: true
});

var StreamingSource = mongoose.model('StreamingSource', StreamingSourceSchema);

module.exports = StreamingSource;
