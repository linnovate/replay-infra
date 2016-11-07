var Schema = require('mongoose').Schema;

var ReceivingMethod = new Schema({
	standard: { type: String, enum: ['VideoStandard', 'stanag'], required: true },
	version: { type: String, enum: ['0.9', '1.0', '4609'], required: true }
});

module.exports = {
	type: ReceivingMethod,
	validate: {
		validator: validateReceivingMethod
	}
};

// enforce specific standard-version combinations
function validateReceivingMethod(obj) {
	if ((obj.standard === 'VideoStandard' && (obj.version === '1.0' || obj.version === '0.9')) ||
		(obj.standard === 'stanag' && obj.version === '4609')) {
		return true;
	}

	return false;
}
