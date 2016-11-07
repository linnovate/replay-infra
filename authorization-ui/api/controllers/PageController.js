var moment = require('moment');
var mission = require('./replay-schemas/Mission');

module.exports = {
	index: function(req, res) {
		mission.find({ videoStatus: { $in: ['new', 'updated', 'handled'] }}, function foundClassification(err, MissionObj) {
			if (err) {
				return err;
			}

			res.view({
				midur: MissionObj,
				moment: moment
			});
			return true;
		});
	}
};
