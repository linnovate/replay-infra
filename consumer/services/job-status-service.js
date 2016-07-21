var JobStatus = require('replay-schemas/JobStatus');

// find a JobStatus with such id or create one if not exists.
module.exports.findOrCreateJobStatus = function(transactionId) {
	// upsert: create if not exist; new: return updated value
	return JobStatus.findByIdAndUpdate({ _id: transactionId }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
};

module.exports.findJobStatus = function(transactionId) {
	return JobStatus.findById(transactionId);
};

module.exports.updateJobStatus = function(transactionId, jobStatusTag) {
	// addToSet: add to array list as set (e.g. no duplicates);
	return JobStatus.findOneAndUpdate({ _id: transactionId }, { $addToSet: { statuses: jobStatusTag } });
};
