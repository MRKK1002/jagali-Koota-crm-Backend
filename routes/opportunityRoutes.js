const express = require("express")
const router = express.Router()
const opportunityController = require("../controller/opportunityController")

// Create
router.post("/", opportunityController.createOpportunity)

// Read
router.get("/", opportunityController.getOpportunities)
router.get("/:id", opportunityController.getOpportunityById)

// Update
router.put("/:id", opportunityController.updateOpportunity)

// Delete
router.delete("/:id", opportunityController.deleteOpportunity)

module.exports = router
