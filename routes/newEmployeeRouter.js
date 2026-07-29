const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
// const { protect, authorize } = require('../middleware/auth');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  createEmployeeWithImage,
  updateEmployeeWithImage
} = require('../controllers/newEmployeeController');

const router = express.Router();



router.route('/')
  .get(asyncHandler(getEmployees))
  .post(asyncHandler(createEmployee));

router.route('/:id')
  .get(asyncHandler(getEmployee))
  .put(asyncHandler(updateEmployee))
  .delete(authorize('admin'), asyncHandler(deleteEmployee));

router.post('/with-image', asyncHandler(createEmployeeWithImage));
router.put('/:id/with-image', asyncHandler(updateEmployeeWithImage));

module.exports = router;