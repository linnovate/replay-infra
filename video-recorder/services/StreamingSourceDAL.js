var Promise = require('bluebird'),
	StreamingSource = require('replay-schemas/StreamingSource'),
	connectMongo = require('replay-schemas/connectMongo');

var StreamingStatuses = require('../enums/StreamingStatuses');

const SERVICE_NAME = '#StreamingSourceDAL#';

module.exports = StreamingSourceDAL;

function StreamingSourceDAL(host, port, db) {
	if (!host || !port || !db) {
		throw new Error(SERVICE_NAME + ' bad conection params provided');
	}
	connectMongo(host, port, db)
		.catch(function(err) {
			throw new Error('error connection mongo' + err);
		});

	// Retrives a stream source from the database by ID
	function getStreamingSource(sourceId) {
		return StreamingSource.findOne({ sourceID: sourceId }, function(err, StreamingSource) {
			// make sure StreamingSource exist and also our object at the specified sourceId
			if (err) {
				throw new Error('StreamingSource has no object at sourceId ' + sourceId);
			}

			if (!StreamingSource) {
				console.log(SERVICE_NAME, 'no Streaming Source found');
				throw new Error('no stream source found');
			}

			return Promise.resolve(StreamingSource);
		});
	}

	// Help method to update data source
	function updateSourceStatus(sourceStatus) {
		StreamingSource.update({ sourceID: sourceStatus.sourceId }, { streamingStatus: sourceStatus.status },
			null,
			function(err, numEffected) {
				if (err) {
					return Promise.reject('Canot update streaming source status: ' + err);
				}
				return Promise.resolve(numEffected);
			});
	}

	// Update CAPTURING status and current update time
	function notifySourceCapturing(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: StreamingStatuses.CAPTURING });
	}

	// Update no action taken status and current update time
	function notifySourceNone(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: StreamingStatuses.NONE });
	}

	// Update LISTENING status and current update time
	function notifySourceListening(sourceId) {
		return updateSourceStatus({ sourceId: sourceId, status: StreamingStatuses.LISTENING });
	}

	return {
		getStreamingSource: getStreamingSource,
		notifySourceCapturing: notifySourceCapturing,
		notifySourceNone: notifySourceNone,
		notifySourceListening: notifySourceListening
	};
}
