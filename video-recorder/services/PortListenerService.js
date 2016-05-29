/*
    This Service is for the port listener.
    It will listen to the port until some data will stream, after that it will emit event and stop listening.
*/

// require packege needed.
var event = require('./EventService'),
    dgram = require('dgram');

// Define some global vaireble.
var PortToListen,
    IpToListen,
    server = dgram.createSocket('udp4');

// Defiend the const.
const ServiceName = 'PortListenerService';

// Function That Start listen to address and wait until there is some data flow.
// It should get an object with Ip and Port.
module.exports.StartListenToPort = (Params) => {

    // define the method name.
    const MethodName = 'StartListenToPort';

    // Check if there is port to listen to, if there isn't port it will emmit error.
    if (!Params.Port) {

        event.emit('error', 'Error on ', ServiceName, '.', MethodName, ' : There Is no Port To listen');
        return;

    } else {

        PortToListen = Params.Port;

        // Check if there is some ip to listen to, if there isn't ip it will listen to localhost.
        if (!Params.Ip) {

            IpToListen = '0.0.0.0';

        } else {

            IpToListen = Params.Ip;

        }

        // binding the server to listen to the address that given.
        server.bind({ port: PortToListen, address: IpToListen, exclusive: false }, () => {

            // Check if the port is not 0.0.0.0
            if (IpToListen != '0.0.0.0') server.addMembership(IpToListen);

            console.log('Binding To : ', IpToListen, ':', PortToListen, ' succeed');

        });

    }

};

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

    event.emit('error', 'Unexcepted Error eccured while trying listen to the address ' + IpToListen + ':' + PortToListen + ' at ' + ServiceName + ' : ' + err);

});
