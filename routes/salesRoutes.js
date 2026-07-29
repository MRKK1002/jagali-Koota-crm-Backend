const express = require("express");
const router = express.Router();
const salesController = require("../controller/salesController");

// Lead Routes
router.post("/lead", salesController.createLead);
router.get("/lead", salesController.getLeads);
router.get("/lead/:id", salesController.getLeadById);
router.put("/lead/:id", salesController.updateLead);
router.delete("/lead/:id", salesController.deleteLead);

// Opportunity Routes
router.post("/opportunities", salesController.createOpportunity);
router.get("/opportunities", salesController.getOpportunities);
router.get("/opportunities/:id", salesController.getOpportunityById);
router.put("/opportunities/:id", salesController.updateOpportunity);
router.delete("/opportunities/:id", salesController.deleteOpportunity);

// Quotation Routes
router.post("/quotation", salesController.createQuotation);
router.get("/quotation", salesController.getQuotations);
router.get("/quotation/:id", salesController.getQuotationById);
router.put("/quotation/:id", salesController.updateQuotation);
router.delete("/quotation/:id", salesController.deleteQuotation);

// Sales Order Routes
router.post("/salesOrder", salesController.createSalesOrder);
router.get("/salesOrder", salesController.getSalesOrders);
router.get("/salesOrder/:id", salesController.getSalesOrderById);
router.put("/salesOrder/:id", salesController.updateSalesOrder);
router.delete("/salesOrder/:id", salesController.deleteSalesOrder);

// Delivery Routes
router.post("/delivery", salesController.createDelivery);
router.get("/delivery", salesController.getDeliveries);
router.get("/delivery/:id", salesController.getDeliveryById);
router.put("/delivery/:id", salesController.updateDelivery);
router.delete("/delivery/:id", salesController.deleteDelivery);

// Invoice Routes
router.post("/invoice", salesController.createInvoice);
router.get("/invoice", salesController.getInvoices);
router.get("/invoice/:id", salesController.getInvoiceById);
router.put("/invoice/:id", salesController.updateInvoice);
router.delete("/invoice/:id", salesController.deleteInvoice);

// Payment Routes
router.post("/payment", salesController.createPayment);
router.get("/payment", salesController.getPayments);
router.get("/payment/:id", salesController.getPaymentById);
router.put("/payment/:id", salesController.updatePayment);
router.delete("/payment/:id", salesController.deletePayment);

// Dropdown Data Routes
router.get("/customers", salesController.getCustomers);
router.get("/vendors", salesController.getVendors);
router.get("/projects", salesController.getProjects);
router.get("/materials", salesController.getMaterials);

module.exports = router;
