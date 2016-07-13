var express = require('express');

var mainRoutine = require('./mainRoutine');

var app = express();

var index = parseInt(process.env.INDEX, 10);

if (isNaN(index)) {
	throw new Error('Process index specified is not a number!');
} else {
	app.listen(3000 + index, mainRoutine);
}
