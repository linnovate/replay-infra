var source = require('./replay-schemas/Source');

module.exports = {

	getAllSources: function(req, res) {
		source.find(function foundSources(err, sources) {
			if (err) {
				console.log(err);
				return err;
			}
			return res.send(JSON.stringify(sources));
		});
	}
};
