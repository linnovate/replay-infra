var Mission = require('replay-schemas/Mission');
var childProcess = require('child_process');
//var ps = require('ps-node');

var _authorizationCronJobPath = '../set-video-authorization.js';
var connectMongo = require('replay-schemas/connectMongo');

var _process;

module.exports = {
	connectMongo: function() {
		return connectMongo(process.env.MONGO_HOST, process.env.MONGO_PORT, process.env.MONGO_DATABASE)
			.catch(function(err) {
				console.log('An error occured in bootstrap.');
				console.log(err);
			});
	},

	wipeCollections: function() {
		return Mission.remove({});
	},

	liftAuthCronJob: function() {
		_process = childProcess.fork(_authorizationCronJobPath);
		return Promise.resolve();
	},

	killAuthCronJob: function() {
		_process.kill('SIGKILL');
		return Promise.resolve();
	}
};
