var express = require('express');
var router = express.Router();

var ProcessingController = require('../controllers/ProcessingController')

router.get('/start', ProcessingController.start);

module.exports = router;

