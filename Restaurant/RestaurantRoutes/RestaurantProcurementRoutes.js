const express = require("express")
const procurementInvoiceRoutes = require("./procurementInvoiceRoutes")
const procurementPaymentRoutes = require("./procurementPaymentRoutes")
const procurementVendorRoutes = require("./procurementVendorRoutes")

const router = express.Router()

// Mount sub-routes
router.use("/invoices", procurementInvoiceRoutes)
router.use("/payments", procurementPaymentRoutes)
router.use("/vendors", procurementVendorRoutes)

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Procurement API is running",
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
