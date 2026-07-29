const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getAllRABills,
  uploadRABill,
  deleteRABill,
  getRABillById,
  updateRABillBillingStatus,
} = require("../controller/raBillController");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "ra-bills");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `ra-bill-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes
router.get("/", getAllRABills);
router.post("/upload", upload.single("raBillPdf"), uploadRABill);
router.patch("/:id/billing-status", updateRABillBillingStatus);
router.get("/:id", getRABillById);
router.delete("/:id", deleteRABill);

module.exports = router;
