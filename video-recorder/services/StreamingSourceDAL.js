var mongoose = require('mongoose'),
	StreamingSource = require('../schemas/StreamingSource'),
	promise = require('bluebird'),
	moment = require('moment');

// Optional streaming sources statuses
const CAPTURING = 'CAPTURING',
	NONE = 'NONE',
	LISTENING = 'LISTENING',
	SERVICE_NAME = '#StreamingSourceDAL#';

module.exports = StreamingSourceDAL;

function StreamingSourceDAL(host, port, db) {

	if(!host || !port || !db){
		return promise.reject('#StreamingSourceDAL# bad connection params provided');
	}

	mongoose.connect('mongodb://' + host + ':' + port + '/' + db);

	// Retrives a stream source from the database by ID
	var GetStreamingSource = function(sourceId) {
		return StreamingSource.findOne({ SourceID: sourceId }, function(err, StreamingSource) {
			// make sure StreamingSource exist and also our object at the specified sourceId
			if (err) {
				return promise.reject("StreamingSource has no object at sourceId " + sourceId);
			}

			if (!StreamingSource) {
				console.log(SERVICE_NAME, 'no Streaming Source found');
				return promise.reject('no stream source found');
			}

			return promise.resolve(StreamingSource);
		});
	};

	// Update capturing status and current update time
	var NotifySourceCapturing = function(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: CAPTURING });
	};

	// Update no action taken status and current update time 
	var NotifySourceNone = function(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: NONE });
	};

	// Update listening status and current update time
	var NotifySourceListening = function(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: LISTENING });
	};

	// Help method to update data source
	var updateSourceStatus = function(sourceStatus) {
		StreamingSource.update({ SourceID: sourceStatus.sourceId }, { StreamingStatus: { status: sourceStatus.status, updated_at: moment.now() } }, null, function(err, numEffected) {
			if (err) {
				return promise.reject("Cannot update streaming source status: " + err);
			}
			return promise.resolve(numEffected);
		})
	}

	return {
		GetStreamingSource: GetStreamingSource,
		NotifySourceCapturing: NotifySourceCapturing,
		NotifySourceNone: NotifySourceNone,
		NotifySourceListening: NotifySourceListening
	};
};
