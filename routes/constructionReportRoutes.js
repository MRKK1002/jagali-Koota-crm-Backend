const express = require("express")
const router = express.Router()
const {
  generateConstructionGSTReport,
  generateConstructionCustomReport,
} = require("../controller/constructionReportController")

// @route   POST /api/construction/sales/reports/gst
router.post("/gst", generateConstructionGSTReport)

// @route   POST /api/construction/sales/reports/custom
router.post("/custom", generateConstructionCustomReport)

module.exports = router
