/*
    This Service is for the port listener.
    It will listen to the port until some data will stream, after that it will emit event and stop listening.
*/

// require packege needed.
var event = require('./EventService'),
    dgram = require('dgram');

// Defiend the Service name.
const SERVICE_NAME = 'PortListenerService',
    LOCALHOST = '0.0.0.0';

// export our service.
module.exports = PortListener;

// Port Listener Service.
function PortListener() {

    // some private variables.
    var _Ip,
        _Port,
        _Server;

    // Function That Start listen to address and wait until there is some data flow.
    // It should get an object with Ip and Port.
    var StartListenToPort = function(params) {

        // define the method name.
        const METHODNAME = 'StartListenToPort';

        console.log(SERVICE_NAME, '.', METHODNAME, ' start running...\n params: ', JSON.stringify(params));

        // Check if there is port to listen to, if there isn't port it will emmit error.
        if (!params.Port) {

            event.emit('error', 'Error on ' + SERVICE_NAME + '.' + METHODNAME + ' : There Is no Port To listen');
            return;

        } else {

            _Port = params.Port;

            // Check if there is some ip to listen to, if there isn't ip it will listen to localhost.
            if (!params.Ip) {

                _Ip = LOCALHOST;

            } else {

                _Ip = params.Ip;

            }

            _Server = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            try {

                // binding the server to listen to the address that given.
                _Server.bind({ port: _Port, address: _Ip, exclusive: false }, () => {

                    // Check if the port is not 0.0.0.0
                    if (_Ip != LOCALHOST) _Server.addMembership(_Ip);

                    console.log('Binding To : ', _Ip, ':', _Port, ' succeed');

                });
            } catch (err) {
                event.emit('error', 'Error on ' + SERVICE_NAME + '.' + METHODNAME + ' : ' + err);
                return;
            }

        }


        // When there is some data flow.
        _Server.on('message', (msg, rinfo) => {

            console.log('Data Was detected at ', _Ip, ':', _Port, ' !');

            // Close the server so that the port will be open for the ffmpeg process to recording.
            _Server.close();

            // emmit an event so it could go next processing
            event.emit('StreamingData');

        });

        // when unexcepted error eccured.
        _Server.on('error', (err) => {

            event.emit('error', 'Unexcepted Error eccured while trying listen to the address ' + _Ip + ':' + _Port + ' at ' + SERVICE_NAME + ' : ' + err);
            _Server.close();

        });

        return;
    };



    return {
        StartListenToPort: StartListenToPort
    };
};
