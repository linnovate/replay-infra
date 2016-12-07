if (!process.env.STORAGE_PATH) {
	console.error('STORAGE_PATH not found, exit the service...');
	process.exit();
}

console.log('express-producer is up...');
console.log('STORAGE_PATH:' + process.env.STORAGE_PATH);
console.log('PORT:' + process.env.PORT || 3213);
console.log('RABBITMQ_HOST:' + process.env.RABBITMQ_HOST || 'localhost');
console.log('RABBITMQ_PORT:' + process.env.RABBITMQ_PORT || '5672');
console.log('RABBITMQ_USERNAME:' + process.env.RABBITMQ_USERNAME || 'guest');
console.log('RABBITMQ_PASSWORD:' + process.env.RABBITMQ_PASSWORD || 'guest');

var Promise = require('bluebird');
var express = require('express');
var mongoose = require('mongoose');
var fs = Promise.promisifyAll(require('fs-extra'));
var path = require('path');
var rabbit = require('replay-rabbitmq');

const MINUTE = 60000;
const VIDEO_LENGTH = 12;
const SOURCE_ID = '100';
const HARDCODED_FILE_PATH = path.join(__dirname, 'src/Day_Flight_Very_Short.ts');

var messageToSend = {
	sourceId: SOURCE_ID,
	storagePath: process.env.STORAGE_PATH,
	receivingMethod: {
		standard: 'VideoStandard',
		version: '1.0'
	},
	duration: VIDEO_LENGTH,
	sourceType: 'VideoMuxedTelemetry'
};

var app = express();

app.get('/start', function(req, res) {
	var endTime = new Date();
	var startTime = new Date(endTime.getTime() - (VIDEO_LENGTH * MINUTE));
	var fullPath = path.join(process.env.STORAGE_PATH, pathBuilder(startTime, SOURCE_ID));
	messageToSend.videoName = nameBuilder(startTime, SOURCE_ID);
	var fileName = messageToSend.videoName + '.ts';
	messageToSend.transactionId = new mongoose.Types.ObjectId();
	messageToSend.startTime = startTime;
	messageToSend.endTime = endTime;
	fs.mkdirsAsync(fullPath)
		.then(function() {
			return fs.copyAsync(HARDCODED_FILE_PATH, path.join(fullPath, fileName));
		})
		.then(function() {
			messageToSend.fileRelativePath = path.join(pathBuilder(startTime, SOURCE_ID), fileName);
			return rabbit.produce('TransportStreamProcessingQueue', messageToSend);
		})
		.then(function() {
			return res.send('success');
		})
		.catch(function(err) {
			return res.send(err);
		});
});

rabbit.connect(process.env.RABBITMQ_HOST || 'localhost',
		process.env.RABBITMQ_PORT || '5672',
		process.env.RABBITMQ_USERNAME || 'guest',
		process.env.RABBITMQ_PASSWORD || 'guest')
	.then(function() {
		app.listen(process.env.PORT || 3213, function() {
			console.log('service is listening on port: ' + ((process.env.PORT) ? process.env.PORT : 3213));
		});
	})
	.catch(function(err) {
		console.log('could not connect to rabbit...');
		console.error(err);
		console.log('stop the service...');
		process.exit();
	});

// return relative path etc: 100/23-11-2016/100_23-11-2016_17-02-36
function pathBuilder(startTime, sourceId) {
	return path.join(sourceId, getCurrentDate(startTime), nameBuilder(startTime, sourceId));
}

function nameBuilder(startTime, sourceId) {
	return sourceId + '_' + getCurrentDate(startTime) + '_' + getCurrentTime(startTime);
}

// get the current date and return format of dd-mm-yyyy
function getCurrentDate(date) {
	var today = date,
		dd = checkTime(today.getDate()),
		mm = checkTime(today.getMonth() + 1), // January is 0!
		yyyy = today.getFullYear();

	return dd + '-' + mm + '-' + yyyy;
}

// get the current time and return format of hh-MM-ss
function getCurrentTime(date) {
	var today = date,
		h = checkTime(today.getHours()),
		m = checkTime(today.getMinutes()),
		s = checkTime(today.getSeconds());

	return h + '-' + m + '-' + s;
}

// helper method for the getCurrentDate function and for the getCurrentTime function
function checkTime(i) {
	// Check if the num is under 10 to add it 0, e.g : 5 - 05.
	if (i < 10) {
		i = '0' + i;
	}
	return i;
}
