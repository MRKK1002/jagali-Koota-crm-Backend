const express = require('express');
const router = express.Router();
const menuController = require('../controller/menuController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'menu');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Check file extension (.jpg, .jpeg, .jfif, .png, .gif, .webp, .avif)
    // JFIF is a JPEG file format, so we allow .jfif extension
    // AVIF is a modern image format
    const allowedExtensions = /\.(jpeg|jpg|jfif|png|gif|webp|avif)$/i;
    const extname = allowedExtensions.test(path.extname(file.originalname));
    
    // Check mimetype - JPEG files have mimetype "image/jpeg" (not "image/jpg")
    // Allow: image/jpeg, image/png, image/gif, image/webp, image/avif
    const allowedMimeTypes = /^image\/(jpeg|png|gif|webp|avif)$/i;
    const mimetype = allowedMimeTypes.test(file.mimetype);
    
    // Debug logging
    console.log('MenuManagements Backend: File upload check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extname: path.extname(file.originalname),
      extnameMatch: extname,
      mimetypeMatch: mimetype
    });
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error(`Only images (JPEG, PNG, GIF, WEBP, AVIF) are allowed. Received: ${file.mimetype}, extension: ${path.extname(file.originalname)}`));
  },
});

// Middleware to handle Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'File upload error', error: err.message });
  } else if (err) {
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  next();
};

// Menu routes
router.post('/', upload.single('image'), handleMulterError, menuController.createMenuItem);
router.get('/', menuController.getAllMenuItems);
router.get('/:id', menuController.getMenuItemById);
router.put('/:id', upload.single('image'), handleMulterError, menuController.updateMenuItem);
router.delete('/:id', menuController.deleteMenuItem);
router.get('/category/:categoryId', menuController.getMenuItemsByCategory);

module.exports = router;