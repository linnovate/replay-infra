var express = require('express');

var	mainRoutine = require('./mainRoutine');

var	app = express();

app.listen(3000 + process.env.INDEX, mainRoutine);
