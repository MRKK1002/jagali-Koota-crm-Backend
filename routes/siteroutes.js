const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const siteController = require('../controller/siteController');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads', 'fixed-assets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for invoice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `invoice-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDF files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Use the correct function names from the new siteController
router.get('/', siteController.getAllSites);
router.post('/', siteController.createSite);
router.get('/:id', siteController.getSiteById);
router.put('/:id', siteController.updateSite);
router.delete('/:id', siteController.deleteSite);

// Fixed Assets routes for a site
router.post('/:id/fixed-assets', upload.single('invoice'), siteController.addFixedAsset);
router.get('/:id/fixed-assets', siteController.getFixedAssets);
router.put('/:id/fixed-assets/:assetIndex', upload.single('invoice'), siteController.updateFixedAsset);
router.delete('/:id/fixed-assets/:assetIndex', siteController.deleteFixedAsset);
router.get('/:id/fixed-assets/summary', siteController.getFixedAssetsSummary);

module.exports = router;
