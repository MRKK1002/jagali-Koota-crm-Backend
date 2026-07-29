const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createTable, getTables, getTableById, updateTable, deleteTable } = require('../controller/tableController');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/table');
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