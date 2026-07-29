const cloudinary = require('../config/cloudinary');

// @desc    Upload image
// @route   POST /api/upload/image
// @access  Private
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const result = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
      folder: 'employee_uploads'
    });

    res.status(200).json({
      success: true,
      image: {
        public_id: result.public_id,
        url: result.secure_url
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};