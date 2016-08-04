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
var event = require('./EventEmitterSingleton');

// Defiend consts.
const SERVICE_NAME = '#StreamListener#',
	LOCALHOST = '0.0.0.0',
	MAX_BINDING_TRIES = 3,
	TIME_TO_WAIT_AFTER_FAILED = 3000,
	IP_FORMAT = new RegExp('^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.' +
		'(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$');

// export our service.
module.exports = new StreamListener();

// Stream Listener Service.
function StreamListener() {
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

	// function that called after the binding.
	function _afterBind(err) {
		console.log('afterbind start');
		const METHOD_NAME = 'StartListen';
		if (err) {
			_bindingAttemptsCounts++;
			console.log('try binding no', _bindingAttemptsCounts, 'failed...\n' + err);
			if (_bindingAttemptsCounts === MAX_BINDING_TRIES) {
				_closeServer();
				return Promise.reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : Binding to source failed');
			}
			_bindToTheAddress()
				.then(function(res) {
					console.log('bind to address resolved');
					return Promise.resolve(res);
				})
				.catch(function(err) {
					console.log('bind to address rejected');
					return Promise.reject(err);
				});
		} else {
			// check if the ip is not 0.0.0.0
			if (_ip !== LOCALHOST) {
				_server.addMembership(_ip);
			}
			console.log(SERVICE_NAME, 'Binding To : ', _ip, ':', _port, ' succeed');
			_finishedBind = true;
			return Promise.resolve({ ip: _ip, port: _port, numOfAttempts: _bindingAttemptsCounts });
		}
	}

	// bind to the address.
	function _bindToTheAddress() {
		try {
			_server.bind({ port: _port, address: _ip, exclusive: false });
			return Promise.resolve();
		} catch (err) {
			console.log('bind catch');
			setTimeout(function() {
				_afterBind(err)
					.then(function(res) {
						console.log('afterbind resolved');
						return Promise.resolve(res);
					})
					.catch(function(err) {
						console.log('afterbind reject');
						return Promise.reject(err);
					});
			}, TIME_TO_WAIT_AFTER_FAILED);
		}
	}

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

	function _handleMessageEvent() {
		console.log(SERVICE_NAME, 'Stop listening, Data Was detected at ', _ip, ':', _port, ' !');
		// close the server so that the port will be open for the ffmpeg process to recording
		_closeServer();
		// emit an event so it could go next processing
		event.emit('StreamingData');
	}

	function _handleListeningEvent() {
		_afterBind();
	}

	function _handleErrorEvent(err) {
		if (_finishedBind) {
			event.emit('unexceptedError_StreamListener', SERVICE_NAME + ' Unexcepted Error eccured while trying listen to the address ' +
				_ip + ':' + _port + ' : ' + err);
			_closeServer();
		} else {
			setTimeout(function() {
				_afterBind(err);
			}, TIME_TO_WAIT_AFTER_FAILED);
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
		// on event of data flow
		_server.on('message', _handleMessageEvent);
		// when start liten
		_server.on('listening', _handleListeningEvent);
		// when unexcepted error eccured.
		_server.on('error', _handleErrorEvent);
	}

	var startListen = function(params) {
		const METHOD_NAME = 'StartListen';
		_finishedBind = false;
		_bindingAttemptsCounts = 0;
		console.log(SERVICE_NAME, METHOD_NAME, ' start running...\n params: ', JSON.stringify(params));
		var promise = new Promise(function(resolve, reject) {
			// check params
			_handleParamsValidation(params)
				.then(function(ip) {
					_initProperties(ip, params.port);
				})
				.then(function() {
					console.log('first bind');
					return _bindToTheAddress();
				})
				.then(function(res) {
					return resolve(res);
				})
				.catch(function(err) {
					return reject(err);
				});
		});
		return promise;
	};
	return {
		startListen: startListen
	};
}
