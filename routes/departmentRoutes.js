// routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const departmentController = require('../controller/departmentController');

// Department routes
router.get('/', departmentController.getAllDepartments);
router.get('/stats', departmentController.getDepartmentStats);
router.get('/:id', departmentController.getDepartmentById);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;