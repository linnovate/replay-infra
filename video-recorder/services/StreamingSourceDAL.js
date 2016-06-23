var mongoose = require('mongoose'),
	promise = require('bluebird'),
	moment = require('moment');
var StreamingSource = require('../schemas/StreamingSource');

// Optional streaming sources statuses
const CAPTURING = 'CAPTURING',
	NONE = 'NONE',
	LISTENING = 'LISTENING',
	SERVICE_NAME = '#StreamingSourceDAL#';

module.exports = StreamingSourceDAL;

function StreamingSourceDAL(host, port, db) {
	if (!host || !port || !db) {
		return promise.reject('#StreamingSourceDAL# bad conection params provided');
	}

	mongoose.connect('mongodb://' + host + ':' + port + '/' + db);

	// Retrives a stream source from the database by ID
	var getStreamingSource = function(sourceId) {
		return StreamingSource.findOne({ SourceID: sourceId }, function(err, StreamingSource) {
			// make sure StreamingSource exist and also our object at the specified sourceId
			if (err) {
				return promise.reject('StreamingSource has no object at sourceId ' + sourceId);
			}

			if (!StreamingSource) {
				console.log(SERVICE_NAME, 'no Streaming Source found');
				return promise.reject('no stream source found');
			}

			return promise.resolve(StreamingSource);
		});
	};

	// Help method to update data source
	var updateSourceStatus = function(sourceStatus) {
		StreamingSource.update({ SourceID: sourceStatus.sourceId }, { StreamingStatus: { status: sourceStatus.status, updated_at: moment.now() } },
		null, function(err, numEffected) {
			if (err) {
				return promise.reject('Canot update streaming source status: ' + err);
			}
			return promise.resolve(numEffected);
		});
	};

	// Update CAPTURING status and current update time
	var notifySourceCapturing = function(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: CAPTURING });
	};

	// Update no action taken status and current update time
	var notifySourceNone = function(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: NONE });
	};

	// Update LISTENING status and current update time
	var notifySourceListening = function(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: LISTENING });
	};

	return {
		getStreamingSource: getStreamingSource,
		notifySourceCapturing: notifySourceCapturing,
		notifySourceNone: notifySourceNone,
		notifySourceListening: notifySourceListening
	};
}
