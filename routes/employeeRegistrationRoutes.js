const express = require("express");
const router = express.Router();
const {
  upload,
  registerEmployeeWithFace,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controller/employeeRegistrationController");

// Test route
router.get("/test", (req, res) => {
  console.log("Test route hit!");
  res.json({ success: true, message: "Employee registration routes working!" });
});

// Add logging middleware
router.use((req, res, next) => {
  console.log(`Employee Registration Route: ${req.method} ${req.path}`);
  next();
});

// Employee registration with face capture
router.post(
  "/register-employee",
  upload.single("faceImage"),
  registerEmployeeWithFace
);

// CRUD operations
router.get("/", getAllEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", upload.single("faceImage"), updateEmployee);
router.delete("/:id", deleteEmployee);

module.exports = router;
