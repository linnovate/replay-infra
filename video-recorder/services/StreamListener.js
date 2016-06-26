/***********************************************************************************/
/*                                                                                 */
/*        Service for the stream listener.                                         */
/*        listen to the port until some data will stream,                          */
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
	TIME_TO_WAIT_AFTER_FAILED = 3000;

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
			const METHOD_NAME = 'StartListen';
			var bindingAttemptsCounts = 0;
			console.log(SERVICE_NAME, METHOD_NAME, ' start running...\n params: ', JSON.stringify(params));

			// check Port in params
			if (!params || !params.Port) {
				reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : There Is no Port To listen');
			} else {
				_port = params.Port;

				// check Ip in params
				_ip = (params.Ip && typeof params.Ip === 'string' && params.Ip.split('.').length === 4) ? params.Ip : LOCALHOST;

				// create socket server
				_server = dgram.createSocket({ type: 'udp4', reuseAddr: true });

				// function that called after the bind complete.
				var afterBind = function() {
					// check if the IP is not 0.0.0.0
					if (_ip !== LOCALHOST) {
						_server.addMembership(_ip);
					}
					console.log(SERVICE_NAME, 'Binding To : ', _ip, ':', _port, ' succeed');
					return resolve({ ip: _ip, port: _port, numOfAttempts: bindingAttemptsCounts });
				};

				// bind to the address.
				var bindToTheAddress = function() {
					try {
						_server.bind({ port: _port, address: _ip, exclusive: false }, afterBind);
					} catch (err) {
						console.log('try binding no', bindingAttemptsCounts, 'failed...\n', err);
						throw new Error(err);
					}
				};

				var tryBinding = function() {
					var bindFailed = function() {
						console.log('bindingAttemptsCounts', bindingAttemptsCounts);
						bindingAttemptsCounts++;
						if (bindingAttemptsCounts === MAX_BINDING_TRIES) {
							return reject(SERVICE_NAME + ' Error on ' + METHOD_NAME + ' : Binding to source failed');
						}
						tryBinding();
					};
					try {
						bindToTheAddress();
					} catch (err) {
						setTimeout(bindFailed, TIME_TO_WAIT_AFTER_FAILED);
					}
				};

				tryBinding();

				// on event of data flow
				_server.on('message', (msg, rinfo) => {
					console.log(SERVICE_NAME, 'Stop listening, Data Was detected at ', _ip, ':', _port, ' !');
					// close the server so that the port will be open for the ffmpeg process to recording
					_server.close();
					// emmit an event so it could go next processing
					event.emit('StreamingData');
				});

				// when unexcepted error eccured.
				_server.on('error', (err) => {
					event.emit('unexceptedError_StreamListener', SERVICE_NAME + ' Unexcepted Error eccured while trying listen to the address ' +
						_ip + ':' + _port + ' : ' + err);
					_server.close();
				});
			}
		});

		return promise;
	};
	return {
		startListen: startListen
	};
}
