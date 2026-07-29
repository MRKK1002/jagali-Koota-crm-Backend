const express = require("express")
const router = express.Router()
const distributionController = require("../controller/distributionController")

// Create a new distribution
router.post("/", distributionController.createDistribution)

// Get all distributions
router.get("/", distributionController.getAllDistributions)

// Get distribution by ID
router.get("/:id", distributionController.getDistributionById)

// Cancel a distribution
router.put("/:id/cancel", distributionController.cancelDistribution)

// Get distribution summary/statistics
router.get("/summary/stats", distributionController.getDistributionSummary)

module.exports = router













