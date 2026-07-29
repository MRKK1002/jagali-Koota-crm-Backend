const express = require("express")
const router = express.Router()
const quotationController = require("../controller/quotationController")

router.get("/", quotationController.getAllQuotations)
router.post("/", quotationController.createQuotation)
router.get("/:id", quotationController.getQuotationById)
router.put("/:id", quotationController.updateQuotation)
router.delete("/:id", quotationController.deleteQuotation)

// Additional routes for quotation workflow
router.put("/:id/submit", quotationController.submitQuotation)
router.post("/comparison", quotationController.createQuotationComparison)
router.get("/comparison/all", quotationController.getAllComparisons)
router.put("/comparison/:id/select", quotationController.selectQuotation)
router.put("/comparison/:id/approve-reject", quotationController.approveRejectComparison)

module.exports = router
