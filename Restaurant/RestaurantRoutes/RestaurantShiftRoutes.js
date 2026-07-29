const express = require("express");
const router = express.Router();
const {
  getAllShifts,
  getShiftById,
  getEmployeeShift,
  createShift,
  updateShift,
  deleteShift,
} = require("../RestaurantController/RestaurantShiftController");

// Get all shifts with filtering
router.get("/", getAllShifts);

// Get shift by ID
router.get("/:id", getShiftById);

// Get active shift for an employee
router.get("/employee/:employeeId", getEmployeeShift);

// Create new shift
router.post("/", createShift);

// Update shift
router.put("/:id", updateShift);

// Delete shift
router.delete("/:id", deleteShift);

module.exports = router;
