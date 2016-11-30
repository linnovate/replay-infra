var mainRoutine = require('./MainRoutine');

var index = parseInt(process.env.INDEX, 10);

if (isNaN(index)) {
	throw new Error('Process index specified is not a number!');
} else {
	mainRoutine.begin();
}
