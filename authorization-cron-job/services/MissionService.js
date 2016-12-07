var Promise = require('bluebird');
var JobDataService = require('./JobDataService');

module.exports = {
	handleNewMissions: function() {
		JobDataService.getMissionsByStatus('new')
			.then(function(missions) {
				missions.forEach(function(curMission) {
					JobDataService.getMissionVideos(curMission)
						.then(function(videos) {
							return setVideoCompartment(curMission, videos);
						})
						.catch(function(err) {
							if (err) {
								console.log(err);
							}
						});
				});
			})
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});
	},

	handleDeletedMissions: function() {
		JobDataService.getMissionsByStatus('deleted')
			.then(function(missions) {
				missions.forEach(function(curMission) {
					JobDataService.removeVideoCompartment(curMission)
						.then(() => JobDataService.setMissionStatus(curMission, 'handledDeleted'))
						.catch(function(err) {
							if (err) {
								console.log(err);
							}
						});
				});
			})
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});
	},

	handleUpdatedMissions: function() {
		JobDataService.getMissionsByStatus('updated')
			.then(function(missions) {
				missions.forEach(function(mission) {
					JobDataService.removeVideoCompartment(mission)
						.then(function() {
							return JobDataService.getMissionVideos(mission);
						})
						.then(function(videos) {
							return setVideoCompartment(mission, videos);
						})
						.catch(function(err) {
							if (err) {
								console.log(err);
							}
						});
				});
			})
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});
	},

	handleNewVideo: function(video) {
		return JobDataService.getVideoMissions(video)
			.then(function(missions) {
				return attachNewVideoToMissions(video, missions);
			})
			.catch(function(err) {
				if (err) {
					console.log(err);
				}
			});
	}
};

function setVideoCompartment(missionObj, videos) {
	var promises = [];
	videos.forEach(function(video) {
		promises.push(JobDataService.addNewVideoCompartment(missionObj, video));
	});

	return Promise.all(promises)
		.then(() => JobDataService.setHandledStatus(missionObj, 'handled'));
}

function attachNewVideoToMissions(videoObj, missions) {
	var promises = [];
	missions.forEach(function(mission) {
		promises.push(addNewVideoToMissions(videoObj, mission));
	});

	return Promise.all(promises);
}

function addNewVideoToMissions(videoObj, missionObj) {
	return JobDataService.addNewVideoCompartment(missionObj, videoObj)
		.then(function() {
			return JobDataService.setHandledStatus(missionObj, 'handled');
		});
}
