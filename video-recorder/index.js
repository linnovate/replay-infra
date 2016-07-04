var express = require('express');

var	mainRoutine = require('./mainRoutine');

var	app = express();

var index = parseInt(process.env.INDEX);

if(!isNaN(index)){
	app.listen(3000 + index, mainRoutine);	
}
else{
	throw new Error('Process index specified is not a number!');
}

