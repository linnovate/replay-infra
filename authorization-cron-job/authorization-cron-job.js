var MissionService = require('./services/MissionService');
var cron = require('node-cron');
var util = require('util');
var connectMongo = require('replay-schemas/connectMongo');

var host = process.env.MONGO_HOST || 'localhost';
var port = process.env.MONGO_PORT || 27017;
var database = process.env.MONGO_DATABASE || 'replay_dev';

connectMongo(host, port, database)
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
var _cronScheduleFormat = '*/%s * * * * *';
var INTERVAL = process.env.SET_AUTH_INTERVAL || 60;

cron.schedule(util.format(_cronScheduleFormat, INTERVAL), function() {
	console.log('start ', Date());

	MissionService.handleDeletedMissions();
	MissionService.handleUpdatedMissions();
	MissionService.handleNewMissions();
});
