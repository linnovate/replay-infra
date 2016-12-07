var Mission = require('replay-schemas/Mission'),
	Video = require('replay-schemas/Video'),
	VideoMetadata = require('replay-schemas/VideoMetadata');
var BoundingPolygonService = require('./bounding-polygon');
var logger = require('./service-helper').logger;
var Promise = require('bluebird');

module.exports = {
	getMissionById: function(id) {
		logger.info('query mission %s', id);
		return Mission.findOne({ _id: id });
	},

	getVideoById: function(id) {
		logger.info('query video %s', id);
		return Video.findOne({ _id: id });
	},

	getMissionVideos: function(missionObj) {
		logger.info('get Mission %s videos', missionObj.missionName);
		return Video.find({
			$and: [{ endTime: { $gte: missionObj.startTime } },
				{ startTime: { $lte: missionObj.endTime } },
				{ sourceId: missionObj.sourceId }
			]
		});
	},

	removeVideoCompartment: function(missionObj) {
		logger.info('Remove video comartment for Mission', missionObj.missionName);
		return Mission.update({ _id: missionObj._id }, {
			$set: { videoCompartments: [] },
			$unset: { boundingPolygon: 1 }
		});
	},

	setBoundingPolygon: function(missionObj) {
		logger.info('set bounding polygon to mission ', missionObj.missionName);
		return BoundingPolygonService.compartmentsBoundingPolygon(missionObj._id)
			.then(function(compartmentBoundingPolygon) {
				return Mission.update({ _id: missionObj._id }, {
					$set: {
						boundingPolygon: compartmentBoundingPolygon
					}
				});
			});
	},

	deleteMissionVideoCompartment: function(missionObj, videoObj) {
		logger.info('remove video compartment if exist.');
		return Mission.update({ _id: missionObj._id }, { $pull: { videoCompartments: { videoId: videoObj._id } } });
	},

	addNewVideoCompartment: function(missionObj, videoObj) {
		logger.info('Adding new video compartment.');
		return prepareCompartmentObject(missionObj, videoObj)
			.then(function(compartmentObj) {
				return Mission.update({ _id: missionObj._id }, { $push: { videoCompartments: compartmentObj } });
			});
	},

	updateMetadataMission: function(missionObj, videoObj) {
		logger.info('Set mission id to metadata objects.');
		return VideoMetadata.update({ videoId: videoObj._id.toString() }, { $set: { missionId: missionObj._id } }, { multi: true });
	},

	removeMetadataMission: function(mission) {
		logger.info('Remove mission id to metadata objects.');
		return VideoMetadata.update({ missionId: mission }, { $unset: { missionId: 1 } }, { multi: true });
	},

	getVideoMissions: function(videoObj) {
		logger.info('Query new video missions.');
		return Mission.find({
			$and: [{ endTime: { $gte: videoObj.startTime } },
				{ startTime: { $lte: videoObj.endTime } },
				{ sourceId: videoObj.sourceId }
			]
		});
	}
};

function prepareCompartmentObject(missionObj, videoObj) {
	return BoundingPolygonService.createBoundingPolygon(videoObj._id, missionObj.startTime, missionObj.endTime)
		.then(function(boundingPolygon) {
			var relativeStartTime = calculateRelativeStartTime(missionObj.startTime, videoObj.startTime);
			var compartmentObj = {
				boundingPolygon: boundingPolygon,
				videoId: videoObj._id,
				startTime: getMaximumDate(new Date(missionObj.startTime),
					new Date(videoObj.startTime)),
				endTime: getMinimumDate(new Date(missionObj.endTime),
					new Date(videoObj.endTime)),
				relativeStartTime: relativeStartTime
			};
			return Promise.resolve(compartmentObj);
		});
}

function calculateRelativeStartTime(missionStart, videoStart) {
	var asset = new Date(missionStart) - new Date(videoStart);
	if (asset > 0) {
		// Convert millisecond to second
		return asset / 1000;
	}

	return 0;
}

function getMaximumDate(firstDate, secondDate) {
	if (firstDate > secondDate) {
		return firstDate;
	}
	return secondDate;
}

function getMinimumDate(firstDate, secondDate) {
	if (firstDate < secondDate) {
		return firstDate;
	}
	return secondDate;
}
