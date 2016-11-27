var Promise = require('bluebird');
var MissionData = require('./mission-data');

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
		console.log('no videos found for mission ', missionObj.missionName);
		Promise.resolve();
	} else {
		var promises = [];
		console.log('videos: ', videos);
		videos.forEach(function(video) {
			promises.push(MissionData.addNewVideoCompartment(missionObj, video));
		});

		return Promise.all(promises)
			.then(() => MissionData.setBoundingPolygon(missionObj));
	}
}

function attachNewVideoToMissions(videoObj, missions) {
	if (missions.length === 0) {
		console.log('no missions found for video ', videoObj._id);
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
	return MissionData.addNewVideoCompartment(missionObj, videoObj)
		.then(function() {
			return MissionData.setBoundingPolygon(missionObj);
		});
}
