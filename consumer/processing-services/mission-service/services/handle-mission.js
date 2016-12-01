var Promise = require('bluebird');
var MissionData = require('./mission-data');
var logger = require('./service-helper').logger;

module.exports = {
	handleNewMission: function(missionId) {
		var _missionObj;
		return MissionData.getMissionById(missionId)
			.then((mission) => {
				_missionObj = mission;
				return MissionData.getMissionVideos(mission);
			})
			.then((videos) => {
				return setVideoCompartment(_missionObj, videos);
			})
			.catch(function(err) {
				if (err) {
					return Promise.reject(err);
				}
			});
	},

	handleDeletedMission: function(missionId) {
		return MissionData.getMissionById(missionId)
			.then(MissionData.removeVideoCompartment)
			.then(() => MissionData.removeMetadataMission(missionId))
			.catch(function(err) {
				if (err) {
					return Promise.reject(err);
				}
			});
	},

	handleUpdatedMission: function(missionId) {
		var _missionObj;
		return MissionData.getMissionById(missionId)
			.then((mission) => {
				_missionObj = mission;
				return MissionData.removeVideoCompartment(_missionObj);
			})
			.then(() => {
				return MissionData.getMissionVideos(_missionObj);
			})
			.then((videos) => {
				return setVideoCompartment(_missionObj, videos);
			})
			.catch(function(err) {
				if (err) {
					return Promise.reject(err);
				}
			});
	},

	handleNewVideo: function(videoId) {
		var _videoObj;
		return MissionData.getVideoById(videoId)
			.then((video) => {
				_videoObj = video;
				return MissionData.getVideoMissions(_videoObj);
			})
			.then((missions) => {
				return attachNewVideoToMissions(_videoObj, missions);
			})
			.catch(function(err) {
				if (err) {
					return Promise.reject(err);
				}
			});
	}
};

function setVideoCompartment(missionObj, videos) {
	if (videos.length === 0) {
		logger.info('no videos found for mission ', missionObj.missionName);
		Promise.resolve();
	} else {
		var promises = [];
		videos.forEach(function(video) {
			promises.push(MissionData.deleteMissionVideoCompartment(missionObj, video)
				.then(() => MissionData.addNewVideoCompartment(missionObj, video))
				.then(() => MissionData.updateMetadataMission(missionObj, video))
				.then(() => MissionData.setBoundingPolygon(missionObj)));
		});

		return Promise.all(promises);
	}
}

function attachNewVideoToMissions(videoObj, missions) {
	if (missions.length === 0) {
		logger.info('no missions found for video ', videoObj._id);
		Promise.resolve();
	} else {
		var promises = [];
		missions.forEach(function(mission) {
			promises.push(addNewVideoToMissions(videoObj, mission));
		});

		return Promise.all(promises);
	}
}

function addNewVideoToMissions(videoObj, missionObj) {
	return MissionData.deleteMissionVideoCompartment(missionObj, videoObj)
		.then(() => MissionData.addNewVideoCompartment(missionObj, videoObj))
		.then(() => MissionData.setBoundingPolygon(missionObj))
		.then(() => MissionData.updateMetadataMission(missionObj, videoObj));
}
