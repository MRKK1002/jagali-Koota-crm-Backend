const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} = require("../RestaurantController/RestaurantBranchController")

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to crm_backend/uploads/branch (relative to server.js location)
    // __dirname is Restaurant/RestaurantRoutes/, so go up 2 levels to crm_backend, then into uploads/branch
    const uploadPath = path.join(__dirname, "../../uploads/branch");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    console.log("Multer saving file to:", uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const fileExtension = path.extname(file.originalname)
    const fileName = file.fieldname + "-" + uniqueSuffix + fileExtension
    cb(null, fileName)
  },
})

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed!"), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Maximum size is 5MB." })
    }
    return res.status(400).json({ message: err.message })
  } else if (err) {
    return res.status(400).json({ message: err.message })
  }
  next()
}

// Routes
router.route("/").post(upload.single("image"), handleMulterError, createBranch).get(getBranches)

router
  .route("/:id")
  .get(getBranchById)
  .put(upload.single("image"), handleMulterError, updateBranch)
  .delete(deleteBranch)

module.exports = router
