var MissionService = require('./services/MissionService');
var cron = require('node-cron');
var util = require('util');
var connectMongo = require('replay-schemas/connectMongo');

connectMongo()
		.catch(function(err) {
			console.log('An error occured in bootstrap.');
			console.log(err);
		});

/*
 # ┌────────────── second (optional)
 # │ ┌──────────── minute
 # │ │ ┌────────── hour
 # │ │ │ ┌──────── day of month
 # │ │ │ │ ┌────── month
 # │ │ │ │ │ ┌──── day of week
 # │ │ │ │ │ │
 # │ │ │ │ │ │
 # * * * * * *
*/
var _cronScheduleFormat = '*/%s * * * *';
var INTERVAL = process.env.SET_AUTH_INTERVAL || 1;

cron.schedule(util.format(_cronScheduleFormat, INTERVAL), function() {
	console.log('start ', Date());

	MissionService.handleDeletedMissions();
	MissionService.handleUpdatedMissions();
	MissionService.handleNewMissions();
});
