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
module.exports = StreamListener;

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

			// check params
			if (!params || !params.port || !params.ip) {
				reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : Some of the parameters doesn\'t exist');
			} else {
				_port = params.port;

				// check Ip in params
				if (params.ip.toLowerCase() === 'localhost') {
					_ip = LOCALHOST;
				} else if (typeof params.ip === 'string' && params.ip.match(IP_FORMAT)) {
					_ip = params.ip;
				} else {
					return reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : Some of the parameters doesn\'t vaildate');
				}

				console.log('finish validate the parameters');

				// create socket server
				_server = dgram.createSocket({ type: 'udp4', reuseAddr: true });

				// function that called after the binding.
				var afterBind = function(err) {
					if (err) {
						bindingAttemptsCounts++;
						console.log('try binding no', bindingAttemptsCounts, 'failed...\n', err);
						if (bindingAttemptsCounts === MAX_BINDING_TRIES) {
							_server.close();
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
				_server.on('message', (msg, rinfo) => {
					console.log(SERVICE_NAME, 'Stop listening, Data Was detected at ', _ip, ':', _port, ' !');
					// close the server so that the port will be open for the ffmpeg process to recording
					_server.close();
					// emmit an event so it could go next processing
					event.emit('StreamingData');
				});

				_server.on('listening', () => {
					afterBind();
				});

				// when unexcepted error eccured.
				_server.on('error', (err) => {
					if (finishedBind) {
						event.emit('unexceptedError_StreamListener', SERVICE_NAME + ' Unexcepted Error eccured while trying listen to the address ' +
							_ip + ':' + _port + ' : ' + err);
						_server.close();
					} else {
						setTimeout(function() {
							afterBind(err);
						}, TIME_TO_WAIT_AFTER_FAILED);
					}
				});
			}
		});

		return promise;
	};
	return {
		startListen: startListen
	};
}
