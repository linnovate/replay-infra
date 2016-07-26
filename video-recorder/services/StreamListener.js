/***********************************************************************************/
/*                                                                                 */
/*        Service for the stream listener.                                         */
/*        listen to the Port until some data will stream,                          */
/*        and then 'StreamingData' event is emiting.                               */
/*                                                                                 */
/***********************************************************************************/

// require packege needed.
var dgram = require('dgram');
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
		_server;

	/***********************************************************************************/
	/*                                                                                 */
	/*  Function That Start listen to address until there is some data flow.           */
	/*  Get an object with Ip and Port.                                                */
	/*  Return promise, in reject return error,                                        */
	/*  in resolve return object with ip,port and numbers of trying binding            */
	/*                                                                                 */
	/***********************************************************************************/
	var startListen = function(params) {
		var promise = new Promise(function(resolve, reject) {
			var bindToTheAddress;
			var finishedBind = false;
			const METHOD_NAME = 'StartListen';
			var bindingAttemptsCounts = 0;
			console.log(SERVICE_NAME, METHOD_NAME, ' start running...\n params: ', JSON.stringify(params));

			var _closeServer = function() {
				try {
					_server.close();
				} catch (err) {
					console.log('server is already closed');
				}
			};

			function _isParamsValid(params){
				return (!params || !params.port || !params.ip);
			}

			function _isIpValid(ip){
				return (typeof params.ip === 'string' && params.ip.match(IP_FORMAT));
			}

			// check params
			if (_isParamsValid(params)) {
				reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : Some of the parameters doesn\'t exist');
			} else {
				_port = params.port;

				// check Ip in params
				if (params.ip.toLowerCase() === 'localhost') {
					_ip = LOCALHOST;
				} else if (_isIpValid(params.ip)) {
					_ip = params.ip;
				} else {
					return reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : Some of the parameters doesn\'t vaildate');
				}

				console.log('finish validate the parameters');

				// create socket server
				if (_server) {
					_closeServer();
				}
				_server = dgram.createSocket({ type: 'udp4', reuseAddr: true });

				// function that called after the binding.
				var afterBind = function(err) {
					if (err) {
						bindingAttemptsCounts++;
						console.log('try binding no', bindingAttemptsCounts, 'failed...\n' + err);
						if (bindingAttemptsCounts === MAX_BINDING_TRIES) {
							_closeServer();
							return reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : Binding to source failed');
						}
						bindToTheAddress();
					} else {
						// check if the ip is not 0.0.0.0
						if (_ip !== LOCALHOST) {
							_server.addMembership(_ip);
						}
						console.log(SERVICE_NAME, 'Binding To : ', _ip, ':', _port, ' succeed');
						finishedBind = true;
						return resolve({ ip: _ip, port: _port, numOfAttempts: bindingAttemptsCounts });
					}
				};
				// bind to the address.
				bindToTheAddress = function() {
					try {
						_server.bind({ port: _port, address: _ip, exclusive: false });
					} catch (err) {
						setTimeout(function() {
							afterBind(err);
						}, TIME_TO_WAIT_AFTER_FAILED);
					}
				};

				bindToTheAddress();

				// on event of data flow
				_server.on('message', _handleMessageEvent);

				// when start liten
				_server.on('listening', _handleListeningEvent);

				// when unexcepted error eccured.
				_server.on('error', _handleErrorEvent);

				function _handleMessageEvent() {
					console.log(SERVICE_NAME, 'Stop listening, Data Was detected at ', _ip, ':', _port, ' !');
					// close the server so that the port will be open for the ffmpeg process to recording
					_closeServer();
					// emit an event so it could go next processing
					event.emit('StreamingData');
				}

				function _handleListeningEvent() {
					afterBind();
				}

				function _handleErrorEvent(err) {
					if (finishedBind) {
						event.emit('unexceptedError_StreamListener', SERVICE_NAME + ' Unexcepted Error eccured while trying listen to the address ' +
							_ip + ':' + _port + ' : ' + err);
						_closeServer();
					} else {
						setTimeout(function() {
							afterBind(err);
						}, TIME_TO_WAIT_AFTER_FAILED);
					}
				}
			}
		});

		return promise;
	};
	return {
		startListen: startListen
	};
}
