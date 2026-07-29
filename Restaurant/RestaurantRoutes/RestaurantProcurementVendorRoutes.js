const express = require("express")
const ProcurementVendorController = require("../controller/procurementVendorController")
const authMiddleware = require("../middleware/authMiddleware")
const validateRequest = require("../middleware/validateRequest")
const { body, param } = require("express-validator")

const router = express.Router()

// Validation rules
const createVendorValidation = [
  body("name")
    .notEmpty()
    .withMessage("Vendor name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Vendor name must be between 2 and 100 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("phone")
    .matches(/^\d{10,15}$/)
    .withMessage("Phone number must be 10-15 digits"),
  body("taxId").optional().isLength({ max: 20 }).withMessage("Tax ID cannot exceed 20 characters"),
  body("paymentTerms")
    .optional()
    .isIn(["NET_15", "NET_30", "NET_45", "NET_60", "IMMEDIATE"])
    .withMessage("Invalid payment terms"),
  body("status").optional().isIn(["active", "inactive", "suspended"]).withMessage("Invalid status"),
]

const updateVendorValidation = [
  param("id").isMongoId().withMessage("Invalid vendor ID"),
  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Vendor name must be between 2 and 100 characters"),
  body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("phone")
    .optional()
    .matches(/^\d{10,15}$/)
    .withMessage("Phone number must be 10-15 digits"),
  body("paymentTerms")
    .optional()
    .isIn(["NET_15", "NET_30", "NET_45", "NET_60", "IMMEDIATE"])
    .withMessage("Invalid payment terms"),
  body("status").optional().isIn(["active", "inactive", "suspended"]).withMessage("Invalid status"),
]

// Routes without authentication middleware
router.get("/", ProcurementVendorController.getAllVendors)
router.post("/", createVendorValidation, validateRequest, ProcurementVendorController.createVendor)
router.put("/:id", updateVendorValidation, validateRequest, ProcurementVendorController.updateVendor)
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid vendor ID")],
  validateRequest,
  ProcurementVendorController.deleteVendor,
)

module.exports = router
