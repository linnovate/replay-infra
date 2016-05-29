
/*
	This Service is only for the event managment.
*/

var events = require('events');
const evenrEmitter = new events.EventEmitter();


module.exports = evenrEmitter;