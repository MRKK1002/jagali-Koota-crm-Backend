const express = require("express")
const router = express.Router()
const {
  getConstructionInvoiceSettings,
  updateConstructionInvoiceSettings,
  getConstructionInvoiceTemplates,
  getConstructionInvoiceTemplate,
  createConstructionInvoiceTemplate,
  updateConstructionInvoiceTemplate,
  activateConstructionInvoiceTemplate,
  deleteConstructionInvoiceTemplate,
  getActiveConstructionInvoiceTemplate,
} = require("../controller/constructionSettingsController")

// Construction Invoice Settings Routes
// @route   GET /api/construction/sales/invoice-settings
router.get("/invoice-settings", getConstructionInvoiceSettings)

// @route   POST /api/construction/sales/invoice-settings
router.post("/invoice-settings", updateConstructionInvoiceSettings)

// Construction Invoice Templates Routes
// @route   GET /api/construction/sales/invoice-templates
router.get("/invoice-templates", getConstructionInvoiceTemplates)

// @route   GET /api/construction/sales/invoice-templates/active
router.get("/invoice-templates/active", getActiveConstructionInvoiceTemplate)

// @route   GET /api/construction/sales/invoice-templates/:id
router.get("/invoice-templates/:id", getConstructionInvoiceTemplate)

// @route   POST /api/construction/sales/invoice-templates
router.post("/invoice-templates", createConstructionInvoiceTemplate)

// @route   PUT /api/construction/sales/invoice-templates/:id
router.put("/invoice-templates/:id", updateConstructionInvoiceTemplate)

// @route   PATCH /api/construction/sales/invoice-templates/:id/activate
router.patch("/invoice-templates/:id/activate", activateConstructionInvoiceTemplate)

// @route   DELETE /api/construction/sales/invoice-templates/:id
router.delete("/invoice-templates/:id", deleteConstructionInvoiceTemplate)

module.exports = router
