var Promise = require('bluebird');
var MissionHandler = require('./services/handle-mission');
var host = process.env.MONGO_HOST || 'localhost';
var port = process.env.MONGO_PORT || 27017;
var database = process.env.MONGO_DATABASE || 'replay_dev';
var connectMongo = require('replay-schemas/connectMongo');
var ObjectId = require('mongoose').Types.ObjectId;

connectMongo(host, port, database)
	.catch(function(err) {
		console.log('An error occured in bootstrap.');
		console.log(err);
	});

//var params = { type: 'mission', id: new ObjectId('5836f9059fbd41175d1f8a41'), status: 'delete' };
var params = { type: 'video', id: new ObjectId('57b576ae3a70e1cf65b0b829'), status: 'delete' };

attachVideoToMission(params);

function attachVideoToMission(params) {
	console.log('attach video to mission...');

	switch (params.type) {
		case 'mission':
			return handleMission(params);
		case 'video':
			return handleVideo(params);
		default:
			return Promise.reject(new Error('invalid object type'));
	}
}

function handleVideo(params) {
	return MissionHandler.handleNewVideo(params.id);
}

function handleMission(params) {
	console.log(params);
	switch (params.status) {
		case 'new':
			return MissionHandler.handleNewMission(params.id);
		case 'update':
			return MissionHandler.handleUpdatedMission(params.id);
		case 'delete':
			return MissionHandler.handleDeletedMission(params.id);
		default:
			return Promise.reject(new Error('invalid object status'));
	}
}
