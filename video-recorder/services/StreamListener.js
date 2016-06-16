/***********************************************************************************/
/*                                                                                 */
/*        Service for the stream listener.                                         */
/*        Will listen to the port until some data will stream,                     */
/*        and after that will emit 'StreamingData' event and stop listen.          */
/*                                                                                 */
/***********************************************************************************/

// require packege needed.
var event = require('./EventEmitterSingleton'),
    dgram = require('dgram');

// Defiend the Service name.
const SERVICE_NAME = '#StreamListener#',
    LOCALHOST = '0.0.0.0';

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
    /*  Function That Start listen to address and wait until there is some data flow.  */
    /*  Should get an object with Ip and Port.                                         */
    /*                                                                                 */
    /***********************************************************************************/
    var startListen = function(params) {
        var promise = new Promise(function(resolve, reject) {

            const METHOD_NAME = 'StartListen';
            console.log(SERVICE_NAME, METHOD_NAME, ' start running...\n params: ', JSON.stringify(params));

            // check Port in params
            if (!params || !params.Port) {
                event.emit('unexceptedError', SERVICE_NAME + 'Error on ' + METHOD_NAME + ' : There Is no Port To listen');
                return reject(SERVICE_NAME + 'Error on ' + METHOD_NAME + ' : There Is no Port To listen');
            } else {
                _port = params.Port;

                // check Ip in params
                _ip = (params.Ip && typeof(params.Ip) === 'string' && params.Ip.split('.').length == 4) ? params.Ip : LOCALHOST;

                // create socket server
                _server = dgram.createSocket({ type: 'udp4', reuseAddr: true });

                try {
                    // binding the server to listen to the address that given
                    _server.bind({ port: _port, address: _ip, exclusive: false }, () => {
                        // check if the IP is not 0.0.0.0
                        if (_ip != LOCALHOST) {
                            _server.addMembership(_ip);
                        }
                        console.log(SERVICE_NAME, 'Binding To : ', _ip, ':', _port, ' succeed');
                        return resolve({ ip: _ip, port: _port });
                    });
                } catch (err) {
                    console.log(SERVICE_NAME, ' ERROR:', err);
                    event.emit('unexceptedError', SERVICE_NAME + 'Error on ' + METHOD_NAME + ' : ' + err);
                    return reject(SERVICE_NAME + 'Error on ' + METHOD_NAME + ' : There Is no Port To listen');
                }
            }

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
                event.emit('unexceptedError', SERVICE_NAME + ' Unexcepted Error eccured while trying listen to the address ' + _ip + ':' + _port + ' : ' + err);
                _server.close();
            });
        });

        return promise;
    };

    return {
        StartListen: startListen
    };
};
