const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getAllPieceWorks,
  createPieceWork,
  updatePieceWork,
  updatePieceWorkStatus,
  deletePieceWork,
  getPieceWorkById,
  addPayment,
  getPaymentHistory,
} = require("../controller/pieceWorkController");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "piece-works");
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
    cb(null, `piece-work-${uniqueSuffix}${path.extname(file.originalname)}`);
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
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Routes
router.get("/", getAllPieceWorks);
router.post("/", upload.fields([{ name: "pieceWorkPdf", maxCount: 1 }]), createPieceWork);
router.get("/:id", getPieceWorkById);
router.put("/:id", updatePieceWork);
router.patch("/:id/status", updatePieceWorkStatus);
router.delete("/:id", deletePieceWork);

// Payment routes
router.post("/:id/payment", addPayment);
router.get("/:id/payments", getPaymentHistory);

module.exports = router;
