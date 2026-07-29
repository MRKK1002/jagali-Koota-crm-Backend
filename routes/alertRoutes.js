const express = require("express")
const router = express.Router()
const {
  getAllAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  resolveAlert,
  acknowledgeAlert,
  deleteAlert,
  getAlertStats,
} = require("../controller/alertController")

// Routes
router.get("/", getAllAlerts)
router.get("/stats", getAlertStats)
router.get("/:id", getAlertById)
router.post("/", createAlert)
router.patch("/:id", updateAlert)
router.put("/:id", updateAlert)
router.patch("/:id/resolve", resolveAlert)
router.patch("/:id/acknowledge", acknowledgeAlert)
router.delete("/:id", deleteAlert)

module.exports = router
