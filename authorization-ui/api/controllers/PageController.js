var moment = require('moment');
var classification = require('./replay-schemas/Classification');

module.exports = {
	index: function(req, res) {
		classification.find({ videoStatus: { $in: ['new', 'updated', 'handled'] }}, function foundClassification(err, classificationObj) {
			if (err) {
				return err;
			}

			res.view({
				midur: classificationObj,
				moment: moment
			});
			return true;
		});
	}
};
