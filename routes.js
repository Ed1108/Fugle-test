const express = require('express');
const expressWs = require('express-ws');
const dataController = require('./dataController');
const iexController = require('./iexController');
const router = express.Router();
expressWs(router);

router.get('/data', dataController.getData);
router.ws('/last', iexController.handleLastWS);
router.ws('/quote', iexController.handleQuoteWS);


module.exports = router;