var mongoose = require('mongoose'),
	StreamingSource = require('../schemas/StreamingSource'),
	promise = require('bluebird'),
	moment = require('moment');

// Optional streaming sources statuses
const CAPTURING = 'CAPTURING',
	NONE = 'NONE',
	LISTENING = 'LISTENING';

module.exports = StreamingSourceDAL;

function StreamingSourceDAL(host, port, db) {
	
	mongoose.connect('mongodb://' + host + ':' + port + '/' + db);

	// Retrives a stream source from the database by ID
	var GetStreamingSource = function(sourceId) {
		return StreamingSource.findOne({ SourceID: sourceId }, function(err, StreamingSource) {
			// make sure StreamingSource exist and also our object at the specified sourceId
			if (err) {
				return promise.reject("StreamingSource has no object at sourceId " + sourceId);
			}

			return promise.resolve(StreamingSource);
		});
	};

	// Update capturing status and current update time
	var NotifySourceCapturing = function(sourceId) {
		StreamingSource.update({ SourceID: sourceId }, { StreamingStatus: { status: CAPTURING, updated_at: moment.now() } }, null, function(err, numEffected) {
			if (err) {
				return promise.reject("Cannot update streaming source status: " + err);
			}
			promise.resolve(numEffected);
		})
	};

	// Update no action taken status and current update time 
	var NotifySourceNone = function(sourceId) {
		StreamingSource.update({ SourceID: sourceId }, { StreamingStatus: { status: NONE, updated_at: moment.now() } }, null, function(err, numEffected) {
			if (err) {
				return promise.reject("Cannot update streaming source status: " + err);
			}
			promise.resolve(numEffected);
		})
	};

	// Update listening status and current update time
	var NotifySourceListening = function(sourceId) {
		StreamingSource.update({ SourceID: sourceId }, { StreamingStatus: { status: LISTENING, updated_at: moment.now() } }, null, function(err, numEffected) {
			if (err) {
				return promise.reject("Cannot update streaming source status: " + err);
			}
			promise.resolve(numEffected);
		})
	};

	return {
		GetStreamingSource: GetStreamingSource,
		NotifySourceCapturing: NotifySourceCapturing,
		NotifySourceNone: NotifySourceNone,
		NotifySourceListening: NotifySourceListening
	};
};
