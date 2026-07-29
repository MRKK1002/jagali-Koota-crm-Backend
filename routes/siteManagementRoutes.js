const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const siteController = require("../controller/siteController");
const pmController = require("../controller/projectManagerController");
const supervisorController = require("../controller/siteSupervisorController");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "site-documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for site document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "image/jpeg",
    "image/png",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Site document upload fields
const siteUploadFields = upload.fields([
  { name: "workOrderPdf", maxCount: 1 },
  { name: "boqExcel", maxCount: 1 },
  { name: "fixedAssetInvoice_0", maxCount: 1 },
  { name: "fixedAssetInvoice_1", maxCount: 1 },
  { name: "fixedAssetInvoice_2", maxCount: 1 },
  { name: "fixedAssetInvoice_3", maxCount: 1 },
  { name: "fixedAssetInvoice_4", maxCount: 1 },
  { name: "temporaryAssetInvoice_0", maxCount: 1 },
  { name: "temporaryAssetInvoice_1", maxCount: 1 },
  { name: "temporaryAssetInvoice_2", maxCount: 1 },
  { name: "temporaryAssetInvoice_3", maxCount: 1 },
  { name: "temporaryAssetInvoice_4", maxCount: 1 },
]);

// Site CRUD operations
router.post("/sites", siteUploadFields, siteController.createSite);
router.get("/sites", siteController.getAllSites);
router.get("/sites/:id", siteController.getSiteById);
router.put("/sites/:id", siteUploadFields, siteController.updateSite);
router.delete("/sites/:id", siteController.deleteSite);

// Asset transfer between sites
router.post("/transfer-fixed-asset", siteController.transferFixedAsset);
router.post("/transfer-temporary-asset", siteController.transferTemporaryAsset);

// Site access management
router.post("/sites/assign-pm", siteController.assignProjectManager);
router.get("/sites/access/:employeeId", siteController.getSiteAccessByEmployee);

// Task Management (Project Manager)
router.post("/tasks", pmController.createTask);
router.get("/tasks/site/:siteId", pmController.getTasksBySite);
router.put("/tasks/:id", pmController.updateTask);
router.delete("/tasks/:id", pmController.deleteTask);

// Daily Reports (Project Manager)
router.post("/daily-reports", pmController.createDailyReport);
router.get("/daily-reports/site/:siteId", pmController.getDailyReportsBySite);
router.put("/daily-reports/:id", pmController.updateDailyReport);
router.delete("/daily-reports/:id", pmController.deleteDailyReport);

// Alerts (Project Manager)
router.post("/alerts", pmController.createAlert);
router.get("/alerts/site/:siteId", pmController.getAlertsBySite);
router.put("/alerts/:id", pmController.updateAlert);
router.delete("/alerts/:id", pmController.deleteAlert);

// Site Attendance (Supervisor)
router.post("/site-attendance", supervisorController.markAttendance);
router.get("/site-attendance/site/:siteId", supervisorController.getAttendanceBySite);
router.put("/site-attendance/:id", supervisorController.updateAttendance);

// Site Logs (Supervisor)
router.post("/site-logs", supervisorController.createSiteLog);
router.get("/site-logs/site/:siteId", supervisorController.getSiteLogsBySite);

// Resource Requests (Supervisor)
router.post("/resource-requests", supervisorController.createResourceRequest);
router.get("/resource-requests/site/:siteId", supervisorController.getResourceRequestsBySite);
router.put("/resource-requests/:id", supervisorController.updateResourceRequest);

// Issue Reporting (Supervisor)
router.post("/issues", supervisorController.reportIssue);
router.get("/issues/site/:siteId", supervisorController.getIssuesBySite);
router.put("/issues/:id", supervisorController.updateIssue);

module.exports = router;
