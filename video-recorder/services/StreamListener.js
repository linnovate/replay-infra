/***********************************************************************************/
/*                                                                                 */
/*        Service for the stream listener.                                         */
/*        listen to the Port until some data will stream,                          */
/*        and then 'StreamingData' event is emiting.                               */
/*                                                                                 */
/***********************************************************************************/

// require packege needed.
var dgram = require('dgram');
var Promise = require('bluebird');
var event = require('events').EventEmitter,
	util = require('util');

// Defiend consts.
const SERVICE_NAME = '#StreamListener#',
	LOCALHOST = '0.0.0.0',
	MAX_BINDING_TRIES = 3,
	TIME_TO_WAIT_AFTER_FAILED = 1000,
	IP_FORMAT = new RegExp('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.' +
		'(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$');

// Stream Listener Service.
function StreamListener() {
	var self = this;
	// private variables
	var _ip,
		_port,
		_server,
		_finishedBind,
		_bindingAttemptsCounts;

	/***********************************************************************************/
	/*                                                                                 */
	/*  Function That Start listen to address until there is some data flow.           */
	/*  Get an object with Ip and Port.                                                */
	/*  Return promise, in reject return error,                                        */
	/*  in resolve return object with ip,port and numbers of trying binding            */
	/*                                                                                 */
	/***********************************************************************************/
	// closing listening server instance
	function _closeServer() {
		try {
			_server.close();
		} catch (err) {
			console.log('server is already closed');
		}
	}

	// bind to the address.
	function _bindToTheAddress() {
		var bindPromise = new Promise(function(resolve, reject) {
			_server.bind({ port: _port, address: _ip, exclusive: false })
				.on('error', reject)
				.on('listening', resolve);
		});
		return bindPromise;
	}

	// validation for the parameters.
	function _handleParamsValidation(params) {
		var doesParamsExists = (params !== undefined && params.port !== undefined && params.ip !== undefined);
		if (!doesParamsExists) {
			return Promise.reject('error');
		}
		if (typeof params.ip === 'string' && params.ip.toLowerCase() === 'localhost') {
			return Promise.resolve(LOCALHOST);
		}
		if (typeof params.ip === 'string' && params.ip.match(IP_FORMAT)) {
			return Promise.resolve(params.ip);
		}
		return Promise.reject('error');
	}

	// handle the 'message' event, that emit when there is data streaming on the host.
	function _handleMessageEvent() {
		console.log(SERVICE_NAME, 'Stop listening, Data Was detected at ', _ip, ':', _port, ' !');
		// close the server so that the port will be open for the ffmpeg process to recording
		_closeServer();
		// emit an event so it could go next processing
		self.emit('StreamingData');
	}

	// handle unexcepted error on stream listener.
	function _handleErrorEvent(err) {
		if (_finishedBind) {
			self.emit('unexceptedError_StreamListener', SERVICE_NAME + ' Unexcepted Error eccured while trying listen to the address ' +
				_ip + ':' + _port + ' : ' + err);
			_closeServer();
		}
	}

	function _initProperties(ip, port) {
		_ip = ip;
		_port = port;

		console.log('finish validate the parameters');
		// make sure no server instance is open
		if (_server) {
			_closeServer();
		}
		// create socket server
		_server = dgram.createSocket({ type: 'udp4', reuseAddr: true });
		// on event of data flow.
		_server.on('message', _handleMessageEvent);
		// when unexcepted error eccured.
		_server.on('error', _handleErrorEvent);
	}

	// condition for the promise loop.
	var checkMaxTries = function() {
		return _bindingAttemptsCounts < MAX_BINDING_TRIES;
	};

	// perform the binding to the host.
	var tryToBind = function() {
		return _bindToTheAddress()
			.then(function() {
				// check if the ip is not 0.0.0.0
				if (_ip !== LOCALHOST) {
					_server.addMembership(_ip);
				}
				console.log(SERVICE_NAME, 'Binding To : ', _ip, ':', _port, ' succeed');
				_finishedBind = true;
				return Promise.resolve({ ip: _ip, port: _port, numOfAttempts: _bindingAttemptsCounts });
			})
			.catch(function(err) {
				// returning promise to wait little to the next try.
				return new Promise(function(resolve, reject) {
					console.log('could not bind the address, try again...');
					_bindingAttemptsCounts++;
					setTimeout(function() {
						reject(err);
					}, TIME_TO_WAIT_AFTER_FAILED);
				});
			});
	};

	var promiseWhile = function(condition, action) {
		return new Promise(function(resolve, reject) {
			var loop = function() {
				if (condition()) {
					return action()
						.then(resolve)
						.catch(loop);
				}
				reject(new Error('max attempts of binding reached to maximum'));
			};
			process.nextTick(loop);
		});
	};

	self.startListen = function(params) {
		const METHOD_NAME = 'StartListen';
		_finishedBind = false;
		_bindingAttemptsCounts = 0;
		console.log(SERVICE_NAME, METHOD_NAME, ' start running...\n params: ', JSON.stringify(params));
		// check params
		return _handleParamsValidation(params)
			.then(function(ip) {
				_initProperties(ip, params.port);
			})
			.then(function() {
				console.log('first bind');
				return promiseWhile(checkMaxTries, tryToBind);
			})
			.then(function(res) {
				return Promise.resolve(res);
			})
			.catch(function(err) {
				return Promise.reject(err);
			});
	};
}

// Inhertis from the eventEmitter object
util.inherits(StreamListener, event);

// export out service.
module.exports = new StreamListener();
