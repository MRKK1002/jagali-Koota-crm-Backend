const express = require('express');
const router = express.Router();
const controller = require('../controller/SafetyController');

router.get('/', controller.getAllIncidents);
router.post('/', controller.createIncident);
router.get('/:id', controller.getIncident);
router.put('/:id', controller.updateIncident);
router.delete('/:id', controller.deleteIncident);

module.exports = router;