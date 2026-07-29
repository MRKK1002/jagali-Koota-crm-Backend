const ProcurementVendor = require("../model/ProcurementVendor")
const ProcurementInvoice = require("../model/ProcurementInvoice")
const ProcurementPayment = require("../model/ProcurementPayment")
const mongoose = require("mongoose")

class ProcurementVendorController {
  // Get all vendors with filtering and pagination
  static async getAllVendors(req, res) {
    try {
      const { page = 1, limit = 10, status, search, sortBy = "name", sortOrder = "asc" } = req.query

      // Build filter object
      const filter = {}

      if (status) filter.status = status

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ]
      }

      // Calculate pagination
      const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
      const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 }

      // Execute query
      const vendors = await ProcurementVendor.find(filter)
        .populate("createdBy", "name email")
        .sort(sortOptions)
        .skip(skip)
        .limit(Number.parseInt(limit))

      const total = await ProcurementVendor.countDocuments(filter)

      res.status(200).json({
        success: true,
        data: {
          vendors,
          pagination: {
            currentPage: Number.parseInt(page),
            totalPages: Math.ceil(total / Number.parseInt(limit)),
            totalItems: total,
            itemsPerPage: Number.parseInt(limit),
          },
        },
      })
    } catch (error) {
      console.error("Get procurement vendors error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch procurement vendors",
        error: error.message,
      })
    }
  }

  // Create new vendor
  static async createVendor(req, res) {
    try {
      const { name, email, phone, address, taxId, paymentTerms, status } = req.body

      // Validate required fields
      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: name, email, phone",
        })
      }

      // Check if vendor with email already exists
      const existingVendor = await ProcurementVendor.findOne({ email })
      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: "Vendor with this email already exists",
        })
      }

      // Create vendor (without createdBy field)
      const vendor = new ProcurementVendor({
        name,
        email: email.toLowerCase(),
        phone,
        address,
        taxId,
        paymentTerms,
        status,
      })

      await vendor.save()

      res.status(201).json({
        success: true,
        message: "Procurement vendor created successfully",
        data: vendor,
      })
    } catch (error) {
      console.error("Create procurement vendor error:", error)

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        return res.status(400).json({
          success: false,
          message: `Vendor with this ${field} already exists`,
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to create procurement vendor",
        error: error.message,
      })
    }
  }

  // Update vendor
  static async updateVendor(req, res) {
    try {
      const { id } = req.params
      const updates = req.body

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID",
        })
      }

      // Find existing vendor
      const existingVendor = await ProcurementVendor.findById(id)
      if (!existingVendor) {
        return res.status(404).json({
          success: false,
          message: "Procurement vendor not found",
        })
      }

      // If updating email, check for duplicates
      if (updates.email && updates.email !== existingVendor.email) {
        const emailExists = await ProcurementVendor.findOne({
          email: updates.email.toLowerCase(),
          _id: { $ne: id },
        })

        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: "Email already exists for another vendor",
          })
        }

        updates.email = updates.email.toLowerCase()
      }

      // Update vendor
      const updatedVendor = await ProcurementVendor.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true },
      ).populate("createdBy", "name email")

      res.status(200).json({
        success: true,
        message: "Procurement vendor updated successfully",
        data: updatedVendor,
      })
    } catch (error) {
      console.error("Update procurement vendor error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update procurement vendor",
        error: error.message,
      })
    }
  }

  // Delete vendor
  static async deleteVendor(req, res) {
    try {
      const { id } = req.params

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID",
        })
      }

      const vendor = await ProcurementVendor.findById(id)
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Procurement vendor not found",
        })
      }

      // Check if vendor has invoices
      const hasInvoices = await ProcurementInvoice.findOne({ vendor: id })
      if (hasInvoices) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete vendor with existing invoices. Set status to inactive instead.",
        })
      }

      await ProcurementVendor.findByIdAndDelete(id)

      res.status(200).json({
        success: true,
        message: "Procurement vendor deleted successfully",
      })
    } catch (error) {
      console.error("Delete procurement vendor error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete procurement vendor",
        error: error.message,
      })
    }
  }
}

module.exports = ProcurementVendorController
