const express = require("express")
const router = express.Router()
const {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  approveReport,
  upload,
} = require("../controller/dailyReportController")

// Routes
router.get("/", getAllReports)
router.get("/:id", getReportById)
router.post("/", upload.array("media", 10), createReport)
router.patch("/:id", upload.array("media", 10), updateReport)
router.put("/:id", upload.array("media", 10), updateReport)
router.patch("/:id/approve", approveReport)
router.delete("/:id", deleteReport)

module.exports = router
