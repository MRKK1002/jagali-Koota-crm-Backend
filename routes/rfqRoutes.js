const express = require('express');
const router = express.Router();
const rfqController = require('../controller/rfqController');

router.post('/', rfqController.createRFQ);

module.exports = router;