var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var StreamingSourceSchema = new Schema({
	SourceId: {
		type: Number,
		required: true,
		unique: true
	},
	SourceName: {
		type: String,
		required: false
	},
	SourceType: {
		type: String,
		required: true
	},
	SourceIP: {
		type: String,
		required: true
	},
	SourcePort: {
		type: Number,
		required: true
	},
	StreamingMethod: {
		standard: {
			type: String,
			required: true
		},
		version: {
			type: Number,
			required: true
		}
	},
	StreamingStatus: {
		Status: {
			type: String,
			required: true,
			default:'STOP'
		},
		updated_at: {
			type: Date,
			default: Date.now()
		}
	}
});

var StreamingSource = mongoose.model('StreamingSource', StreamingSourceSchema);

module.exports = StreamingSource;