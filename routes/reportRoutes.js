const express = require("express");
const router = express.Router();
const reportController = require("../controller/reportController");

// routes/reportRoutes.js
router.get("/", reportController.getReports);
router.post("/generate", reportController.generateReport); // सिर्फ generate
router.get("/:id/download", reportController.downloadReport);
router.put("/:id", reportController.editReport);
router.delete("/:id", reportController.deleteReport);
module.exports = router;
