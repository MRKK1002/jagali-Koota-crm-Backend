const express = require("express");
const router = express.Router();

// Import all controllers
const purchaseRequestController = require("../controller/purchaseRequestController");
const vendorController = require("../controller/vendorController");
const quotationController = require("../controller/quotationController");
const purchaseOrderController = require("../controller/purchaseOrderController");
const grnController = require("../controller/grnController");
const vendorInvoiceController = require("../controller/vendorInvoiceController");

// ============ PURCHASE REQUEST ROUTES ============
router.get("/requests", purchaseRequestController.getAllPurchaseRequests);
router.get("/requests/:id", purchaseRequestController.getPurchaseRequestById);
router.put("/requests/:id/status", purchaseRequestController.updatePurchaseRequestStatus);
router.delete("/requests/:id", purchaseRequestController.deletePurchaseRequest);

// ============ VENDOR ROUTES ============
router.post("/vendors", vendorController.createVendor);
router.get("/vendors", vendorController.getAllVendors);
router.get("/vendors/:id", vendorController.getVendorById);
router.put("/vendors/:id", vendorController.updateVendor);
router.put("/vendors/:id/status", vendorController.updateVendorStatus);
router.delete("/vendors/:id", vendorController.deleteVendor);

// ============ QUOTATION ROUTES ============
router.post("/quotations", quotationController.createQuotation);
router.get("/quotations", quotationController.getAllQuotations);
router.get("/quotations/:id", quotationController.getQuotationById);
router.put("/quotations/:id", quotationController.updateQuotation);
router.put("/quotations/:id/submit", quotationController.submitQuotation);
router.delete("/quotations/:id", quotationController.deleteQuotation);

// Quotation Comparison
router.post("/quotations/compare", quotationController.createQuotationComparison);
router.get("/quotations/comparisons", quotationController.getAllComparisons);
router.put("/quotations/comparisons/:id/select", quotationController.selectQuotation);
router.put("/quotations/comparisons/:id/approve-reject", quotationController.approveRejectComparison);

// ============ PURCHASE ORDER ROUTES ============
router.post("/purchase-orders", purchaseOrderController.createPurchaseOrder);
router.get("/purchase-orders", purchaseOrderController.getAllPurchaseOrders);
router.get("/purchase-orders/pending-approval", purchaseOrderController.getPendingApprovalPOs);
router.get("/purchase-orders/:id", purchaseOrderController.getPurchaseOrderById);
router.put("/purchase-orders/:id", purchaseOrderController.updatePurchaseOrder);
router.put("/purchase-orders/:id/approve", purchaseOrderController.approvePurchaseOrder);
router.put("/purchase-orders/:id/admin-approve", purchaseOrderController.adminApprovePurchaseOrder);
router.put("/purchase-orders/:id/reject", purchaseOrderController.rejectPurchaseOrder);
router.put("/purchase-orders/:id/close", purchaseOrderController.closePurchaseOrder);
router.put("/purchase-orders/:id/send-to-vendor", purchaseOrderController.sendPOToVendor);
router.put("/purchase-orders/:id/acknowledge", purchaseOrderController.acknowledgePO);
router.put("/purchase-orders/:id/cancel", purchaseOrderController.cancelPurchaseOrder);
router.delete("/purchase-orders/:id", purchaseOrderController.deletePurchaseOrder);

// ============ GRN ROUTES ============
router.post("/grn", grnController.createGRN);
router.get("/grn", grnController.getAllGRNs);
router.get("/grn/:id", grnController.getGRNById);
router.put("/grn/:id", grnController.updateGRN);
router.put("/grn/:id/update-stock", grnController.updateStockFromGRN);
router.delete("/grn/:id", grnController.deleteGRN);

// ============ VENDOR INVOICE ROUTES ============
router.post("/invoices", vendorInvoiceController.createVendorInvoice);
router.get("/invoices", vendorInvoiceController.getAllInvoices);
router.get("/invoices/:id", vendorInvoiceController.getInvoiceById);
router.put("/invoices/:id", vendorInvoiceController.updateInvoice);
router.put("/invoices/:id/record-payment", vendorInvoiceController.recordPayment);
router.put("/invoices/:id/verify", vendorInvoiceController.verifyInvoice);
router.get("/invoices/pending/payments", vendorInvoiceController.getPendingPayments);
router.get("/invoices/overdue/payments", vendorInvoiceController.getOverduePayments);
router.delete("/invoices/:id", vendorInvoiceController.deleteInvoice);

module.exports = router;
