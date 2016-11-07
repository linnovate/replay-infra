var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// The idea of JobStatus:
// Using it's unique id to identify a transaction in the queues,
// Determine the current state of the flow in the queues in order to recover
// from a failure.
// Upon each significant action (such as insertion of video object to db,
// insertion of VideoMetadata to elastic or mogo, upload to provider, etc),
// The service will be able to determine if this action has been already done or not,
// in order to prevent duplicates upon failure retries.

// create a schema
var JobStatusSchema = new Schema({
	statuses: {
		type: [String],
		enum: [
			'started',
			'video-object-saved',
			'parsed-metadata',
			'saved-metadata-to-mongo',
			'created-captions-from-metadata',
			'added-video-bounding-polygon-to-mongo',
			'transportStream-processing-done',
			'attached-video-to-0.9-metadata'
		],
		default: ['started']
	}
}, {
	timestamps: true
});

var JobStatus = mongoose.model('JobStatus', JobStatusSchema);

module.exports = JobStatus;
