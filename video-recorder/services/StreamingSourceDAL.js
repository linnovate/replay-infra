var Promise = require('bluebird'),
	StreamingSource = require('replay-schemas/StreamingSource'),
	connectMongo = require('replay-schemas/connectMongo');

var StreamingStatuses = require('../enums/StreamingStatuses');

const SERVICE_NAME = '#StreamingSourceDAL#';

module.exports = new StreamingSourceDAL();

function StreamingSourceDAL() {
	function connect(host, port, db, mongoUsername, mongoPassword) {
		if (!host || !port || !db || !mongoUsername || !mongoPassword) {
			return Promise.reject(SERVICE_NAME + ' bad conection params provided');
		}
		return connectMongo(host, port, db, mongoUsername, mongoPassword)
			.then(function() {
				return Promise.resolve({
					getStreamingSource: getStreamingSource,
					notifySourceCapturing: notifySourceCapturing,
					notifySourceNone: notifySourceNone,
					notifySourceListening: notifySourceListening
				});
			})
			.catch(function(err) {
				return Promise.reject('error connection mongo' + err);
			});
	}

	// Retrives a stream source from the database by ID
	function getStreamingSource(sourceId) {
		return new Promise(function(resolve, reject) {
			StreamingSource.findOne({ sourceID: sourceId }, function(err, StreamingSource) {
				// make sure StreamingSource exist and also our object at the specified sourceId
				if (err) {
					return reject(new Error('StreamingSource has no object at sourceId ' + sourceId));
				}

				if (!StreamingSource) {
					console.log(SERVICE_NAME, 'no Streaming Source found');
					return reject(new Error('no stream source found'));
				}

				return resolve(StreamingSource);
			});
		});
	}

	// Help method to update data source
	function updateSourceStatus(sourceStatus) {
		return new Promise(function(resolve, reject) {
			StreamingSource.update({ sourceID: sourceStatus.sourceId }, { streamingStatus: sourceStatus.status },
				null,
				function(err, numEffected) {
					if (err) {
						return reject('Canot update streaming source status: ' + err);
					}
					return resolve(numEffected);
				});
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
		connect: connect
	};
}
