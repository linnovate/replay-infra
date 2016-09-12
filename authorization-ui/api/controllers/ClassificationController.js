var classification = require('./replay-schemas/Classification');

module.exports = {

	create: function(req, res) {
		var classificationObj = {
			missionName: req.param('missionName'),
			karonName: req.param('karonName'),
			source: req.param('source'),
			startTime: req.param('start_time'),
			endTime: req.param('end_time'),
			destination: req.param('destination')
		};
		if (validateInput(classificationObj)) {
			var classObj = new classification();
			classObj.missionName = classificationObj.missionName;
			classObj.karonName = classificationObj.karonName;
			classObj.source = classificationObj.source;
			classObj.startTime = new Date(classificationObj.startTime);
			classObj.endTime = new Date(classificationObj.endTime);
			classObj.destination = classificationObj.destination;
			classObj.videoStatus = 'new';

			classObj.save(function classificationCreated(err, classification) {
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
		var classificationObj = {
			missionName: req.param('missionName'),
			karonName: req.param('karonName'),
			source: req.param('source'),
			startTime: req.param('start_time'),
			endTime: req.param('end_time'),
			destination: req.param('destination')
		};

		if (req.param('videoStatus') !== undefined) {
			classificationObj.videoStatus = req.param('videoStatus');
		} else {
			classificationObj.videoStatus = 'updated';
		}

		if (validateInput(classificationObj)) {
			classification.findOneAndUpdate({_id: req.param('id')}, classificationObj, function(err, doc) {
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
		classification.findOneAndUpdate({_id: req.param('id')}, { videoStatus: 'deleted' }, function(err, doc) {
			if (err) {
				res.end(err);
			} else {
				res.ok();
			}
		});
	},

	findOne: function(req, res) {
		classification.findOne({ $and: [{_id: req.param('id')}, {
			videoStatus: { $in: ['new', 'updated', 'handled'] }}]},
			function foundClassification(err, classificationObj) {
				if (err) {
					res.end(err);
				}

				res.json(classificationObj);
			});
	},

	find: function(req, res) {
		classification.find({videoStatus: { $in: ['new', 'updated', 'handled']}}, function foundClassification(err, classificationObj) {
			if (err) {
				res.end(err);
			}

			res.json(classificationObj);
			return true;
		});
	},

	findClassification: function(req, res) {
		var fromTime = checkDate(req.param('starttime'),-5000);
		var toTime = checkDate(req.param('endtime'),5000);
		console.log('startTime: ' + fromTime);
		console.log('toTime: ' + toTime);
		classification.find({ $and: [{
			endTime: { $gte: fromTime }}, {
				endTime: { $lte: toTime}}, {
					videoStatus: { $in: ['new', 'updated', 'handled']}}
			]},
			function foundClassification(err, classificationObj) {
				if (err) {
					res.json(err);
				} else {
					res.json(classificationObj);
				}
				return true;
			});
	}
};

function checkDate(param, defaultDifference) {
	if(param == undefined || param.length == 0) {
		var newDate = new Date();
		newDate.setDate(newDate.getDate()+defaultDifference);
		return newDate;
	}

	return new Date(param);
}

function validateInput(classificationObj) {
	if (classificationObj.missionName === undefined || classificationObj.missionName.length === 0 ||
		classificationObj.source === undefined || classificationObj.source.length === 0 ||
		classificationObj.destination === undefined || classificationObj.destination.length === 0 ||
		classificationObj.karonName === undefined || classificationObj.karonName.length === 0 ||
		new Date(classificationObj.startTime).toString() == 'Invalid Date' ||
		new Date(classificationObj.endTime).toString() == 'Invalid Date')
	{
		return false;
	}
	return true;
}
