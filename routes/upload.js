const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
// const { protect } = require('../middleware/auth');
const { uploadImage } = require('../controller/upload');

const router = express.Router();



router.post('/image', asyncHandler(uploadImage));

module.exports = router;