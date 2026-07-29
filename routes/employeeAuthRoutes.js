const express = require("express");
const router = express.Router();
const employeeAuthController = require("../controller/employeeAuthController");

// Register employee for mobile app (HR Admin)
router.post("/register", employeeAuthController.registerEmployee);

// Employee login for mobile app
router.post("/login", employeeAuthController.loginEmployee);

// Get all registered employees (HR Admin)
router.get("/registered", employeeAuthController.getRegisteredEmployees);

// Update employee credentials (HR Admin)
router.put("/:id", employeeAuthController.updateEmployeeCredentials);

// Delete employee registration (HR Admin)
router.delete("/:id", employeeAuthController.deleteEmployeeRegistration);

// Get employee profile by employeeId (Mobile App)
router.get("/profile/:employeeId", employeeAuthController.getEmployeeProfile);

module.exports = router;
