const express = require("express");
const router = express.Router();
const clientController = require("../controller/constructionClientController");
const projectController = require("../controller/constructionProjectController");
const workOrderController = require("../controller/constructionWorkOrderController");
const invoiceController = require("../controller/constructionSalesInvoiceController");
const paymentController = require("../controller/constructionPaymentController");
const reportController = require("../controller/reportController");
const workerRoutes = require("./constructionWorkerRoutes");
// const auth = require('../middleware/authMiddleware');

// Client Routes
router.get("/client", clientController.getClients);
router.post("/client", clientController.createClient);

// Project Routes
router.get("/construction-Project", projectController.getProjects);
router.get(
  "/construction-Project/:projectId",
  projectController.getProjectById
);
router.post("/construction-Project", projectController.createProject);

// Work Order Routes
router.get("/construction-WorkOrder", workOrderController.getWorkOrders);
router.post("/construction-WorkOrder", workOrderController.createWorkOrder);
router.patch(
  "/work-orders/:id/status",
  workOrderController.updateWorkOrderStatus
);
router.patch(
  "/work-orders/:id/bill",
  workOrderController.markWorkOrderAsBilled
);
router.get("/work-orders/stats", workOrderController.getWorkOrderStats);

// Invoice Routes
router.get("/construction-Invoice", invoiceController.getInvoices);
router.get(
  "/construction-Invoice/outstanding",
  invoiceController.getOutstandingInvoices
);
router.post("/construction-Invoice", invoiceController.createInvoice);

// Payment Routes
router.get("/construction-Payment", paymentController.getPayments);
router.get("/construction-Payment/recent", paymentController.getRecentPayments);
router.post("/construction-Payment", paymentController.createPayment);

// Report Routes
router.post("/construction-Report/gst", reportController.generateGSTReport);
router.post(
  "/construction-Report/custom",
  reportController.generateCustomReport
);

// Worker Routes - Mount all worker-related routes
router.use("/", workerRoutes);

module.exports = router;
