const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createTable, getTables, getTableById, updateTable, deleteTable } = require('../RestaurantController/RestaurantTableController');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to crm_backend/uploads/table (relative to server.js location)
    // __dirname is Restaurant/RestaurantRoutes/, so go up 2 levels to crm_backend, then into uploads/table
    const uploadPath = path.join(__dirname, '../../uploads/table');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    console.log("Multer saving file to:", uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Routes
router.route('/')
  .post(upload.single('image'), createTable)
  .get(getTables);

router.route('/:id')
  .get(getTableById)
  .put(upload.single('image'), updateTable)
  .delete(deleteTable);

module.exports = router;