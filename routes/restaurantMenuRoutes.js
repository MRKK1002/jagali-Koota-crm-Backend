const express = require('express');
const router = express.Router();
const restaurantMenuController = require('../controller/restaurantMenuController');
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, GIF) are allowed'));
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

// Restaurant/Darshani menu routes
router.post('/', upload.single('image'), handleMulterError, restaurantMenuController.createRestaurantMenuItem);
router.get('/', restaurantMenuController.getAllRestaurantMenuItems);
router.get('/:id', restaurantMenuController.getRestaurantMenuItemById);
router.put('/:id', upload.single('image'), handleMulterError, restaurantMenuController.updateRestaurantMenuItem);
router.delete('/:id', restaurantMenuController.deleteRestaurantMenuItem);

module.exports = router;