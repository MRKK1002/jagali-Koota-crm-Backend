const express = require('express');
const router = express.Router();
const holidayController = require('../controller/holidayController');

// Create new holiday
router.post('/', holidayController.createHoliday);

// Get all holidays (supports filters: ?type=&region=&branch=)
router.get('/', holidayController.getHolidays);

// Update holiday
router.put('/:id', holidayController.updateHoliday);

// Delete holiday
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;
