const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantStats,
} = require("../RestaurantController/RestaurantProfileController");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "..", "uploads", "branch");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created upload directory:", uploadDir);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Routes
router.get("/getAllRestaurants", getAllRestaurants);
router.get("/stats", getRestaurantStats);
router.get("/getRestaurantById/:id", getRestaurantById);
router.post("/createRestaurant", upload.single("image"), createRestaurant);
router.put("/updateRestaurant/:id", upload.single("image"), updateRestaurant);
router.delete("/deleteRestaurant/:id", deleteRestaurant);

module.exports = router;

