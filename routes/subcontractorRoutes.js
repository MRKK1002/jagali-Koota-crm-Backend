const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getAllSubcontractors,
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractor,
  getSubcontractorById,
  assignSite,
  removeSiteAssignment,
} = require("../controller/subcontractorController");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "subcontractors");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `subcontractor-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Configure multer for multiple file fields
const uploadFields = upload.fields([
  { name: "documents", maxCount: 5 },
  { name: "agreementDocument", maxCount: 1 },
  { name: "aadharCardDocument", maxCount: 1 },
  { name: "panCardDocument", maxCount: 1 },
  { name: "passbookDocument", maxCount: 1 },
]);

// Routes
router.get("/", getAllSubcontractors);
router.post("/", uploadFields, createSubcontractor);
router.get("/:id", getSubcontractorById);
router.put("/:id", uploadFields, updateSubcontractor);
router.delete("/:id", deleteSubcontractor);
router.post("/:id/assign-site", assignSite);
router.post("/:id/remove-site", removeSiteAssignment);

module.exports = router;
