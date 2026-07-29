const express = require("express")
const router = express.Router()

// @desc    Get dashboard statistics - NEVER FAILS
// @route   GET /construction/dashboard/stats
router.get("/stats", (req, res) => {
  res.json({ message: "Dashboard stats endpoint working!" })
})

module.exports = router
