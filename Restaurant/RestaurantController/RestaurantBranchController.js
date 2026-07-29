const Branch = require("../RestautantModel/RestaurantBranch")
const RestaurantProfile = require("../RestautantModel/RestaurantProfileModel")
const asyncHandler = require("express-async-handler")
const mongoose = require("mongoose")
const fs = require("fs")
const path = require("path")

// Ensure upload directory exists
const ensureUploadDir = () => {
  // __dirname is Restaurant/RestaurantController/, so go up 2 levels to crm_backend, then into uploads/branch
  const uploadDir = path.join(__dirname, "../../uploads/branch")
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
    console.log("Created upload directory:", uploadDir)
  }
}

// Helper function to check MongoDB connection
const checkConnection = () => {
  const readyState = mongoose.connection.readyState
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (readyState !== 1) {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
    throw new Error(`Database connection unavailable (state: ${states[readyState]}). Please check your MongoDB connection.`)
  }
}

const createBranch = asyncHandler(async (req, res) => {
  try {
    // Check MongoDB connection before proceeding
    checkConnection()
    
    console.log("Request body:", req.body)
    console.log("Request file:", req.file)

    // Ensure upload directory exists
    ensureUploadDir()

    if (!req.body) {
      res.status(400)
      throw new Error("Request body is missing")
    }

    const { name, gstNumber, address, contact, openingHours, _id, image: existingImage } = req.body
    
    // If _id is provided (sync from primary backend), use the existing image path from primary
    // Otherwise, process the uploaded file
    let image = existingImage || null;
    
    if (!image && req.file) {
      // Only process file upload if no existing image path is provided
      const filePath = req.file.path
      const uploadsIndex = filePath.indexOf('uploads')
      image = uploadsIndex !== -1 ? filePath.substring(uploadsIndex) : `uploads/branch/${req.file.filename}`
      // Normalize path separators to forward slashes
      image = image.replace(/\\/g, '/')
      console.log("Stored image path:", image)
    } else if (image) {
      console.log("Using existing image path from primary backend:", image)
    }

    if (!name || !address) {
      res.status(400)
      throw new Error("Name and address are required")
    }

    // Create branch data object
    const branchData = { name, gstNumber, address, image };
    
    // Parse contact and openingHours if they're JSON strings
    if (contact) {
      branchData.contact = typeof contact === 'string' ? JSON.parse(contact) : contact;
    }
    if (openingHours) {
      branchData.openingHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    }
    
    // If _id is provided (from dual backend sync), use it
    if (_id) {
      branchData._id = _id;
      console.log("Using provided _id for sync:", _id);
    }

    const branch = new Branch(branchData)
    const createdBranch = await branch.save()

    console.log("Branch created successfully:", createdBranch)
    res.status(201).json(createdBranch)
  } catch (error) {
    console.error("Error in createBranch:", error)
    const statusCode = error.message.includes('connection') ? 503 : 500
    res.status(statusCode).json({
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

const getBranches = asyncHandler(async (req, res) => {
  try {
    // Check MongoDB connection before proceeding
    checkConnection()
    
    const branches = await Branch.find({})
    res.json(branches)
  } catch (error) {
    console.error("Error in getBranches:", error)
    const statusCode = error.message.includes('connection') ? 503 : 500
    res.status(statusCode).json({ message: error.message })
  }
})

const getBranchById = asyncHandler(async (req, res) => {
  try {
    // Check MongoDB connection before proceeding
    checkConnection()
    
    const branch = await Branch.findById(req.params.id)

    if (branch) {
      res.json(branch)
    } else {
      res.status(404)
      throw new Error("Branch not found")
    }
  } catch (error) {
    console.error("Error in getBranchById:", error)
    const statusCode = error.message.includes('connection') ? 503 : 500
    res.status(statusCode).json({ message: error.message })
  }
})

const updateBranch = asyncHandler(async (req, res) => {
  try {
    // Check MongoDB connection before proceeding
    checkConnection()
    
    console.log("Update request body:", req.body)
    console.log("Update request file:", req.file)

    // Ensure upload directory exists
    ensureUploadDir()

    if (!req.body) {
      res.status(400)
      throw new Error("Request body is missing")
    }

    const { name, address, gstNumber, contact, openingHours } = req.body
    const updateData = { name, address, gstNumber }
    
    // Parse contact and openingHours if they're JSON strings
    if (contact) {
      updateData.contact = typeof contact === 'string' ? JSON.parse(contact) : contact;
    }
    if (openingHours) {
      updateData.openingHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key])

    // Store old image path before update if new image is being uploaded
    let oldImagePath = null
    if (req.file) {
      // First, get the old image path before updating
      const existingBranch = await Branch.findById(req.params.id).select('image').lean()
      if (existingBranch && existingBranch.image) {
        oldImagePath = path.join(__dirname, "../../", existingBranch.image)
      }

      // Convert absolute path to relative path for storage
      const filePath = req.file.path
      const uploadsIndex = filePath.indexOf('uploads')
      updateData.image = uploadsIndex !== -1 ? filePath.substring(uploadsIndex) : `uploads/branch/${req.file.filename}`
      // Normalize path separators to forward slashes
      updateData.image = updateData.image.replace(/\\/g, '/')
      console.log("Stored image path:", updateData.image)
    }

    // Update the branch
    const updatedBranch = await Branch.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })

    if (!updatedBranch) {
      res.status(404)
      throw new Error("Branch not found")
    }

    // Delete old image asynchronously after successful update (non-blocking)
    if (oldImagePath) {
      fs.unlink(oldImagePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error("Error deleting old image:", err)
        } else if (!err) {
          console.log("Old image deleted successfully")
        }
      })
    }

    // Also update RestaurantProfile model for WaveCRM compatibility
    try {
      const restaurantUpdateData = {
        branchName: updatedBranch.name,
        restaurantName: updatedBranch.name,
        gstNumber: updatedBranch.gstNumber,
        image: updatedBranch.image,
      };
      
      // Parse address if it's a string
      if (typeof updatedBranch.address === 'string') {
        const parts = updatedBranch.address.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          restaurantUpdateData.address = {
            street: parts.slice(0, -3).join(', '),
            city: parts[parts.length - 3] || "",
            state: parts[parts.length - 2] || "",
            country: parts[parts.length - 1] || ""
          };
        } else {
          restaurantUpdateData.address = {
            street: updatedBranch.address,
            city: "",
            state: "",
            country: ""
          };
        }
      }
      
      if (updatedBranch.contact) {
        restaurantUpdateData.contact = updatedBranch.contact;
      }
      if (updatedBranch.openingHours) {
        restaurantUpdateData.openingHours = updatedBranch.openingHours;
      }
      
      await RestaurantProfile.findByIdAndUpdate(req.params.id, restaurantUpdateData, {
        new: true,
        runValidators: true,
      });
      console.log("✅ Also updated RestaurantProfile model");
    } catch (syncError) {
      console.warn("⚠️ Failed to sync with RestaurantProfile:", syncError.message);
      // Continue even if sync fails
    }

    console.log("Branch updated successfully:", updatedBranch)
    res.json(updatedBranch)
  } catch (error) {
    console.error("Error in updateBranch:", error)
    const statusCode = error.message.includes('connection') ? 503 : 500
    res.status(statusCode).json({
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

const deleteBranch = asyncHandler(async (req, res) => {
  try {
    // Check MongoDB connection before proceeding
    checkConnection()
    
    const branch = await Branch.findById(req.params.id)

    if (!branch) {
      res.status(404)
      throw new Error("Branch not found")
    }

    // Delete the associated image file
    if (branch.image) {
      const imagePath = path.join(__dirname, "../../", branch.image)
      fs.unlink(imagePath, (err) => {
        if (err && err.code !== 'ENOENT') console.error("Error deleting image:", err)
        else if (!err) console.log("Image deleted successfully")
      })
    }

    await Branch.deleteOne({ _id: req.params.id })
    
    // Also delete from RestaurantProfile model for WaveCRM compatibility
    try {
      await RestaurantProfile.deleteOne({ _id: req.params.id });
      console.log("✅ Also deleted from RestaurantProfile model");
    } catch (syncError) {
      console.warn("⚠️ Failed to delete from RestaurantProfile:", syncError.message);
      // Continue even if sync fails
    }
    
    res.json({ message: "Branch removed successfully" })
  } catch (error) {
    console.error("Error in deleteBranch:", error)
    const statusCode = error.message.includes('connection') ? 503 : 500
    res.status(statusCode).json({ message: error.message })
  }
})

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
}
