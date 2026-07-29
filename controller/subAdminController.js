

const bcrypt = require("bcryptjs")
const SubAdmin = require("../model/SubAdmin")

// Create SubAdmin (User)
exports.createSubAdmin = async (req, res) => {
  try {
    const { username, name, email, password, role, permissions, type, status } = req.body
    
    // Validation
    if (!username || !email || !password || !type) {
      return res.status(400).json({ message: "Username, email, password, and type are required" })
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" })
    }

    // Check if email already exists
    const existing = await SubAdmin.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: "Email already exists" })
    }

    // Check if username already exists
    const existingUsername = await SubAdmin.findOne({ username })
    if (existingUsername) {
      return res.status(409).json({ message: "Username already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Create new user
    const newSubAdmin = new SubAdmin({
      username,
      name: name || username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "hr",
      permissions: permissions || {}, // permissions is already an object from frontend
      type,
      status: status || "active",
    })
    
    await newSubAdmin.save()
    
    // Return user without password
    const userResponse = newSubAdmin.toObject()
    delete userResponse.password
    
    res.status(201).json({ 
      message: "User created successfully", 
      data: userResponse 
    })
  } catch (err) {
    console.error("Create user error:", err)
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// ✅ Get all SubAdmins with pagination
exports.getSubAdmins = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    
    // Get type from query parameter (e.g., ?type=construction)
    const { type } = req.query
    
    // Build filter - if type is provided, filter by type
    const filter = type ? { type } : {}
    
    const total = await SubAdmin.countDocuments(filter)
    const subAdmins = await SubAdmin.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
    
    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      data: subAdmins,
    })
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Get one SubAdmin by ID
exports.getSubAdminById = async (req, res) => {
  try {
    const subAdmin = await SubAdmin.findById(req.params.id).select("-password")
    if (!subAdmin) return res.status(404).json({ message: "SubAdmin not found" })
    res.status(200).json(subAdmin)
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Update SubAdmin (User)
exports.updateSubAdmin = async (req, res) => {
  try {
    const { username, name, email, password, role, permissions, type, status } = req.body
    const updateData = {}
    
    // Update fields if provided
    if (username) updateData.username = username
    if (name) updateData.name = name
    if (email) {
      // Check if email is being changed and if it already exists
      const existing = await SubAdmin.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      })
      if (existing) {
        return res.status(409).json({ message: "Email already exists" })
      }
      updateData.email = email.toLowerCase()
    }
    if (role) updateData.role = role
    if (permissions) updateData.permissions = permissions
    if (type) updateData.type = type
    if (status) updateData.status = status
    
    // Hash password if provided
    if (password && password !== "") {
      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" })
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }
    
    const updated = await SubAdmin.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select("-password")
    
    if (!updated) {
      return res.status(404).json({ message: "User not found" })
    }
    
    res.status(200).json({ 
      message: "User updated successfully", 
      data: updated 
    })
  } catch (err) {
    console.error("Update user error:", err)
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Update user permissions only
exports.updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body
    
    if (!permissions) {
      return res.status(400).json({ message: "Permissions are required" })
    }
    
    const updated = await SubAdmin.findByIdAndUpdate(
      req.params.id,
      { permissions },
      { new: true, runValidators: true }
    ).select("-password")
    
    if (!updated) {
      return res.status(404).json({ message: "User not found" })
    }
    
    res.status(200).json({ 
      message: "Permissions updated successfully", 
      data: updated 
    })
  } catch (err) {
    console.error("Update permissions error:", err)
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}

// Delete SubAdmin
exports.deleteSubAdmin = async (req, res) => {
  try {
    await SubAdmin.findByIdAndDelete(req.params.id)
    res.status(200).json({ message: "SubAdmin deleted" })
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message })
  }
}
