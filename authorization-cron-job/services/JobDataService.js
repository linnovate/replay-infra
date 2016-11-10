var Mission = require('replay-schemas/Mission'),
	Video = require('replay-schemas/Video');
var BoundingPolygonService = require('./BoundingPolygonService');

module.exports = {
	getMissionsByStatus: function(status) {
		console.log('query %s missions', status);
		return Mission.find({ videoStatus: status });
	},

	getMissionVideos: function(missionObj) {
		console.log('get Mission video');

		return Video.find({
			$and: [{ endTime: { $gte: missionObj.startTime } },
				{ startTime: { $lte: missionObj.endTime } },
				{ sourceId: missionObj.sourceId }
			]
		});
	},

	removeVideoCompartment: function(missionObj) {
		console.log('Remove video comartment for Mission', missionObj.missionName);
		return Mission.update({ _id: missionObj._id }, { $set: { videoCompartments: [] } });
	},

	setMissionStatus: function(missionObj, status) {
		console.log('set handled status to', missionObj.missionName);
		return Mission.update({ _id: missionObj._id }, {
			$set: {
				videoStatus: status
			}
		}, function(err) {
			if (err) {
				console.log(err);
			}
		});
	},

	setHandledStatus: function(missionObj, status) {
		console.log('set handled status to', missionObj.missionName);
		return BoundingPolygonService.compartmentsBoundingPolygon(missionObj._id)
			.then(function(compartmentBoundingPolygon) {
				return Mission.update({ _id: missionObj._id }, {
					$set: {
						videoStatus: status,
						boundingPolygon: compartmentBoundingPolygon
					}
				}, function(err) {
					if (err) {
						console.log(err);
					}
				});
			});
	},

	addNewVideoCompartment: function(missionObj, videoObj) {
		console.log('Adding new video compartment...');
		return prepareCompartmentObject(missionObj, videoObj)
			.then(function(compartmentObj) {
				console.log('Inserted video compartment to the database');
				return Mission.update({ _id: missionObj._id }, { $push: { videoCompartments: compartmentObj } });
			});
	},

	getVideoMissions: function(videoObj) {
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
