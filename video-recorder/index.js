var express = require('express'),
    app = express(),
    mainRoutine = require('./mainRoutine');

app.listen(3000 + process.env.INDEX, mainRoutine);
