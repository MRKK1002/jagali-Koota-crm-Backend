const express = require("express");
const router = express.Router();
const taxController = require("../controller/taxController");

// Tax Configuration routes
router.post("/tax-config", taxController.createTaxConfiguration);
router.get("/tax-config", taxController.getAllTaxConfigurations);
router.get("/tax-config/:id", taxController.getTaxConfigurationById);
router.put("/tax-config/:id", taxController.updateTaxConfiguration);
router.delete("/tax-config/:id", taxController.deleteTaxConfiguration);

// GST specific routes
router.get("/tax-config/gst/rates/:businessType", taxController.getGSTRates);
router.post("/tax-config/gst/calculate", taxController.calculateGST);

// TDS specific routes
router.get("/tax-config/tds/sections/:businessType", taxController.getTDSSections);
router.post("/tax-config/tds/calculate", taxController.calculateTDS);

// Tax reports
router.get("/tax-reports/gstr1/:businessType", taxController.getGSTR1Report);
router.get("/tax-reports/gstr3b/:businessType", taxController.getGSTR3BReport);
router.get("/tax-reports/tds-summary/:businessType", taxController.getTDSSummary);

// Initialize default tax configurations
router.post("/tax-config/initialize", taxController.initializeTaxConfigurations);

module.exports = router;


