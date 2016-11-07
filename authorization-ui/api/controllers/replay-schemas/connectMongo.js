var mongoose = require('mongoose'),
	Promise = require('bluebird');

mongoose.Promise = Promise;

var keepAliveInSeconds = 60 * 60 * 24 * 30; // 30 days
// initialize options
var _options = {
	server: {
		'socketOptions': {
			keepAlive: keepAliveInSeconds
		},
		'auto_reconnect': true
	},
	replset: {
		socketOptions: {
			keepAlive: keepAliveInSeconds
		}
	}
};

// used to count connection re-try seconds
var _connectRetryInSeconds = 0;
var _isFirstConnection = true;
module.exports = function(_host, _port, _database) {
	var host = _host || 'localhost';
	var port = _port || 27017;
	var database = _database || 'replay_dev';
	var uri = 'mongodb://' + host + ':' + port + '/' + database;

	// connect if not connected
	if (mongoose.connection && mongoose.connection.readyState !== 1) {
		setConnectionListeners(uri, database, host, port);
		// connect to mongo, the empty function is a stub to make it return promise (it's mongoose known bug)
		return mongoose.connect(uri, _options, function() {})
			.then(function() {
				console.log('Connected to mongo.');
				return Promise.resolve();
			});
	}

	return Promise.resolve();
};

function setConnectionListeners(uri, database, host, port) {
	// set event listeners on connection
	var connection = mongoose.connection;

	connection.on('connecting', function() {
		console.log('Connecting to mongo...', 'Database:', database, '. URI:', host + ':' + port + '.');
	});

	connection.on('error', function(error) {
		console.error('Error in mongo connection: ' + error);
		console.log('Disconnecting from mongo...');
		mongoose.disconnect();
	});
	connection.on('connected', function() {
		// do not print to log if this is the first connection
		if (_isFirstConnection) {
			_isFirstConnection = false;
			return;
		}
		console.log('Connected to mongo.');
	});
	connection.once('open', function() {

	});
	connection.on('reconnected', function() {
		console.log('Mongo has reconnected.');
	});
	connection.on('disconnected', function() {
		console.log('Disconnected from mongo.');

		// retry to connect with exponential backoff in order to off-load mongo
		exponentialBackoff(function() {
			mongoose.connect(uri, _options, function(err) {
				if (err) {
					console.log(err);
				}
			});
		});
	});
}

// perform exponential backoff up to 32 seconds (including)
function exponentialBackoff(func) {
	_connectRetryInSeconds = Math.pow(2, _connectRetryInSeconds);
	// do not allow more than half a second of waiting
	if (_connectRetryInSeconds > 32) {
		_connectRetryInSeconds = 1;
	}
	setTimeout(func, _connectRetryInSeconds * 1000);
}
