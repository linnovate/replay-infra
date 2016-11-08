var Mission = require('replay-schemas/Mission');
var parser = require('jsontoxml');
var xml2js = require('xml2js');
var Promise = require('bluebird');
var http = require('http');

module.exports = {

	create: function(req, res) {
		var missionObj = {
			missionName: req.param('missionName'),
			sourceId: req.param('sourceId'),
			startTime: req.param('start_time'),
			endTime: req.param('end_time'),
			destination: req.param('destination')
		};

		if (validateInput(missionObj)) {
			var MissionObj = new Mission();
			MissionObj.missionName = missionObj.missionName;
			MissionObj.sourceId = missionObj.sourceId;
			MissionObj.startTime = new Date(missionObj.startTime);
			MissionObj.endTime = new Date(missionObj.endTime);
			MissionObj.destination = missionObj.destination;
			MissionObj.videoStatus = 'new';

			MissionObj.save(function MissionCreated(err, Mission) {
				if (err) {
					console.log(err);
					res.end(err);
				} else {
					res.ok();
				}
			});
		} else {
			res.end('invalid parameters');
		}
	},

	update: function(req, res) {
		var MissionObj = {
			missionName: req.param('missionName'),
			sourceId: req.param('sourceId'),
			startTime: req.param('start_time'),
			endTime: req.param('end_time'),
			destination: req.param('destination')
		};

		/*if (req.param('videoStatus') !== undefined) {
			MissionObj.videoStatus = req.param('videoStatus');
		} else {
			MissionObj.videoStatus = 'updated';
		}
		*/
		if (validateInput(MissionObj)) {
			Mission.findOneAndUpdate({ _id: req.param('id') }, MissionObj, function(err, doc) {
				if (err) {
					res.end(err);
				} else {
					res.ok();
				}
			});
		} else {
			res.end('invalid parameters');
		}
	},

	destroy: function(req, res) {
		Mission.findOneAndUpdate({ _id: req.param('id') }, { videoStatus: 'deleted' }, function(err, doc) {
			if (err) {
				res.end(err);
			} else {
				res.ok();
			}
		});
	},

	findOne: function(req, res) {
		Mission.findOne({
			$and: [{ _id: req.param('id') }, {
				videoStatus: { $in: ['new', 'updated', 'handled'] }
			}]
		},
		function foundMission(err, MissionObj) {
			if (err) {
				res.end(err);
			}
			res.json(MissionObj);
		});
	},

	find: function(req, res) {
		Mission.find({ videoStatus: { $in: ['new', 'updated', 'handled'] } }, function foundMission(err, MissionObj) {
			if (err) {
				res.end(err);
			}

			res.json(MissionObj);
			return true;
		});
	},

	findMission: function(req, res) {
		var fromTime = checkDate(req.param('starttime'), -5000);
		var toTime = checkDate(req.param('endtime'), 5000);
		console.log('startTime: ' + fromTime);
		console.log('toTime: ' + toTime);
		Mission.find({
			$and: [{
				endTime: { $gte: fromTime }
			}, {
				endTime: { $lte: toTime }
			}, {
				videoStatus: { $in: ['new', 'updated', 'handled'] }
			}]
		},
		function foundMission(err, MissionObj) {
			if (err) {
				res.json(err);
			} else {
				res.json(MissionObj);
			}
			return true;
		});
	},

	findCompartment: function(req, res) {
		var time = checkDate(req.param('time'), 0);
		res.setHeader('Content-Type', 'text/xml');

		Mission.find({
			$and: [{
				'VideoCompartment.startTime': { $lte: time }
			}, {
				'VideoCompartment.endTime': { $gte: time }
			}]
		}).select('source startTime endTime').exec(
			function foundCompartments(err, compartmentObj) {

				if (err) {
					res.send(parser(err));
				} else {
					console.log(compartmentObj);
					res.send(parser(JSON.stringify(compartmentObj)));
				}
			}
		);
	},

	generateCompartmentCondition: function(req, res) {
		getUserPermissions(req.userCode)
			.then(parseXml)
			.then(buildQuery).then(function(query) {
				res.send(query);
			});
	}
};

function checkDate(param, defaultDifference) {
	if (param === undefined || param.length === 0) {
		var newDate = new Date();
		newDate.setDate(newDate.getDate() + defaultDifference);
		return newDate;
	}

	return new Date(param);
}

function validateInput(MissionObj) {
	if (MissionObj.missionName === undefined || MissionObj.missionName.length === 0 ||
		MissionObj.destination === undefined || MissionObj.destination.length === 0 ||
		new Date(MissionObj.startTime).toString() === 'Invalid Date' ||
		new Date(MissionObj.endTime).toString() === 'Invalid Date') {
		return false;
	}
	return true;
}

function buildQuery(permissions) {
	return new Promise(function(resolve, reject) {
		try {
			var query = { $or: [] };
			for (var i = 0; i < permissions.length; i++) {
				query.$or.push({
					destination: permissions[i].id[0]
				});
				if (i === permissions.length - 1) {
					console.log('query: ' + JSON.stringify(query));
					resolve(query);
					break;
				}
			}
		} catch (err) {
			reject(err);
		}
	});
}
/*
function validateGreaterThanStartTime(obj) {
	if (obj.startTime <= obj.endTime) {
		return false;
	}

	return true;
}
*/
function getUserPermissions(userCode) {
	var promiseRequest = Promise.method(function(options) {
		return new Promise(function(resolve, reject) {
			var request = http.request(options, function(response) {
				// Bundle the result
				response.setEncoding('utf8');
				var responseString = '';

				response.on('data', function(data) {
					responseString += data;
				});

				response.on('end', function() {
					resolve(responseString);
				});
			});

			// Handle errors
			request.on('error', function(error) {
				console.log('Problem with request:', error.message);
				reject(error);
			});

			request.end();
		});
	});

	return promiseRequest({
		host: process.env.COMPARTMENT_HOST || 'localhost', //
		port: process.env.COMPARTMENT_PORT || 1337, //
		path: '/compartment/getCompartment111',
		method: 'GET'
	});
}

function parseXml(data) {
	return new Promise(function(resolve, reject) {
		var parser = new xml2js.Parser();
		parser.parseString(data, function(err, result) {
			if (result === undefined || err) {
				reject(err);
			} else {
				console.log(result);
				var permissions = result.permissions.allow[0].userPermission;
				resolve(permissions);
			}
		});
	});
}
