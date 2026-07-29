const Branch = require("../model/Branch")
const asyncHandler = require("express-async-handler")
const fs = require("fs")
const path = require("path")

// Ensure upload directory exists
const ensureUploadDir = () => {
  const uploadDir = path.join(__dirname, "..", "uploads", "branch")
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
    console.log("Created upload directory:", uploadDir)
  }
}

const createBranch = asyncHandler(async (req, res) => {
  try {
    console.log("Request body:", req.body)
    console.log("Request file:", req.file)

    // Ensure upload directory exists
    ensureUploadDir()

    if (!req.body) {
      res.status(400)
      throw new Error("Request body is missing")
    }

    const { name, address } = req.body
    const image = req.file ? req.file.path : null

    if (!name || !address) {
      res.status(400)
      throw new Error("Name and address are required")
    }

    const branch = new Branch({ name, address, image })
    const createdBranch = await branch.save()

    console.log("Branch created successfully:", createdBranch)
    res.status(201).json(createdBranch)
  } catch (error) {
    console.error("Error in createBranch:", error)
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

const getBranches = asyncHandler(async (req, res) => {
  try {
    const branches = await Branch.find({})
    res.json(branches)
  } catch (error) {
    console.error("Error in getBranches:", error)
    res.status(500).json({ message: error.message })
  }
})

const getBranchById = asyncHandler(async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)

    if (branch) {
      res.json(branch)
    } else {
      res.status(404)
      throw new Error("Branch not found")
    }
  } catch (error) {
    console.error("Error in getBranchById:", error)
    res.status(500).json({ message: error.message })
  }
})

const updateBranch = asyncHandler(async (req, res) => {
  try {
    console.log("Update request body:", req.body)
    console.log("Update request file:", req.file)

    // Ensure upload directory exists
    ensureUploadDir()

    if (!req.body) {
      res.status(400)
      throw new Error("Request body is missing")
    }

    const { name, address } = req.body
    const updateData = { name, address }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key])

    // If a new image is uploaded, update the image path and delete the old image
    if (req.file) {
      updateData.image = req.file.path

      // Find the branch to get the old image path
      const branch = await Branch.findById(req.params.id)
      if (branch && branch.image) {
        const oldImagePath = path.join(__dirname, "..", branch.image)
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Error deleting old image:", err)
          else console.log("Old image deleted successfully")
        })
      }
    }

    const updatedBranch = await Branch.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })

    if (!updatedBranch) {
      res.status(404)
      throw new Error("Branch not found")
    }

    console.log("Branch updated successfully:", updatedBranch)
    res.json(updatedBranch)
  } catch (error) {
    console.error("Error in updateBranch:", error)
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

const deleteBranch = asyncHandler(async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)

    if (!branch) {
      res.status(404)
      throw new Error("Branch not found")
    }

    // Delete the associated image file
    if (branch.image) {
      const imagePath = path.join(__dirname, "..", branch.image)
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Error deleting image:", err)
        else console.log("Image deleted successfully")
      })
    }

    await Branch.deleteOne({ _id: req.params.id })
    res.json({ message: "Branch removed successfully" })
  } catch (error) {
    console.error("Error in deleteBranch:", error)
    res.status(500).json({ message: error.message })
  }
})

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
}
