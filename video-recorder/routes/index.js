var express = require('express');
var	app = express();

var ActionController = require('./controllers/ActionController');

app.get('/start', ActionController.start);

app.get('/stop', ActionController.stop);
