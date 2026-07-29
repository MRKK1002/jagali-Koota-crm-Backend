const express = require("express")
const router = express.Router()

router.get("/", (req, res) => {
  res.json({ message: "Work orders endpoint working!" })
})

router.get("/stats", (req, res) => {
  res.json({ message: "Work orders stats endpoint working!" })
})

router.post("/", (req, res) => {
  // You can add logic to handle the posted data here
  res.json({ message: "Work order created (dummy response)" })
})

module.exports = router
