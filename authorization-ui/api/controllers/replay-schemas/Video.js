// populated mongoose types with geo json schemas
require('mongoose-geojson-schema');
var mongoose = require('mongoose');
var ReceivingMethod = require('./common-nested-schemas/ReceivingMethod');
var Schema = mongoose.Schema;

// create a schema
var VideoSchema = new Schema({
	sourceId: {
		type: String,
		required: true
	},
	// relative path of the content directory in format of: 'sourceId/date/name' (e.g. 102/05-09-2016/102_05-09-2016_12-34-59)
	contentDirectoryPath: {
		type: String
	},
	// base name = the directory name, in format of: 'sourceId_date_name' (e.g. 102_05-09-2016_12-34-59)
	baseName: {
		type: String,
		required: true
	},
	// video file name - WITH EXTENSION
	videoFileName: {
		type: String,
		required: true
	},
	// flavors files name - WITH EXTENSION
	flavors: {
		type: [String]
	},
	// request format for the stream url (smil file should be in same content directory with the same name as videoName with extension of '.smil')
	requestFormat: {
		type: String,
		enum: ['mp4', 'smil'],
		required: true
	},
	receivingMethod: ReceivingMethod,
	boundingPolygon: mongoose.Schema.Types.GeoJSON,
	// status fields:
	jobStatusId: {
		type: String,
		required: true
	},
	status: {
		type: String,
		enum: ['processing', 'ready'],
		default: 'processing'
	},
	// provider fields:
	provider: {
		type: String,
		enum: ['none', 'kaltura'],
		default: 'none'
	},
	providerId: {
		type: String
	},
	providerData: {
		type: Schema.Types.Mixed
	},
	// extra fields:
	startTime: {
		type: Date,
		required: true
	},
	endTime: {
		type: Date,
		validate: endTimeValidator,
		required: true
	},
	durationInSeconds: {
		type: Number
	},
	tags: [{
		type: Schema.Types.ObjectId,
		ref: 'Tag'
	}],
	copyright: {
		type: String
	}
}, {
	timestamps: true
});

VideoSchema.pre('save', calculateDuration);
VideoSchema.pre('update', calculateDuration);

var Video = mongoose.model('Video', VideoSchema);

module.exports = Video;

// help functions:

function calculateDuration(next) {
	var self = this;
	var differenceInMillis = self.endTime - self.startTime;
	self.durationInSeconds = differenceInMillis / 1000;
	next();
}

// validators functions:

function endTimeValidator(obj) {
	if (obj.startTime <= obj.endTime) {
		return false;
	}
	return true;
}
