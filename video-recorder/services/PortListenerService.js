/*
    This Service is for the port listener.
    It will listen to the port until some data will stream, after that it will emit event and stop listening.
*/

// require packege needed.
var event = require('./EventService'),
    dgram = require('dgram');


// Defiend the Service name.
const SERVICENAME = 'PortListenerService',
    LOCALHOST = '0.0.0.0';

// Function That Start listen to address and wait until there is some data flow.
// It should get an object with Ip and Port.
exports.StartListenToPort = (params) => {

    // define the method name.
    const METHODNAME = 'StartListenToPort';

    console.log(SERVICENAME, '.', METHODNAME, ' start running...\n params: ',JSON.stringify(params));

    // init variables.
    var PortToListen,
        IpToListen,
        server = dgram.createSocket('udp4');

    // Check if there is port to listen to, if there isn't port it will emmit error.
    if (!params.Port) {

        event.emit('error', 'Error on ', SERVICENAME, '.', METHODNAME, ' : There Is no Port To listen');
        return;

    } else {

        PortToListen = params.Port;

        // Check if there is some ip to listen to, if there isn't ip it will listen to localhost.
        if (!params.Ip) {

            IpToListen = LOCALHOST;

        } else {

            IpToListen = params.Ip;

        }

        // binding the server to listen to the address that given.
        server.bind({ port: PortToListen, address: IpToListen, exclusive: false }, () => {

            // Check if the port is not 0.0.0.0
            if (IpToListen != LOCALHOST) server.addMembership(IpToListen);

            console.log('Binding To : ', IpToListen, ':', PortToListen, ' succeed');

        });

    }


    // When there is some data flow.
    server.on('message', (msg, rinfo) => {

        console.log('Data Was detected at ', IpToListen, ':', PortToListen, ' !');

        // Close the server so that the port will be open for the ffmpeg process to recording.
        server.close();

        // emmit an event so it could go next processing
        event.emit('StreamingData');

    });

    // when unexcepted error eccured.
    server.on('error', (err) => {

        event.emit('error', 'Unexcepted Error eccured while trying listen to the address ' + IpToListen + ':' + PortToListen + ' at ' + SERVICENAME + ' : ' + err);

    });

};
