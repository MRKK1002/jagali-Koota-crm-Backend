const express = require('express');
const router = express.Router();
const auditLogController = require('../controller/auditLogController');

router.post('/', auditLogController.createAuditLog);
router.get('/', auditLogController.getAuditLogs);
router.delete('/:id', auditLogController.deleteAuditLog); // Optional

module.exports = router;
