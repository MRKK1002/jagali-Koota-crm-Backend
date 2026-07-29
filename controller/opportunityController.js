const Opportunity = require("../model/Opportunity")
const mongoose = require("mongoose") // Import mongoose for ObjectId validation

// Create Opportunity
exports.createOpportunity = async (req, res) => {
  try {
    const { customer } = req.body
    // Validate customer ID if it's provided and not empty
    if (customer && !mongoose.Types.ObjectId.isValid(customer)) {
      return res.status(400).json({ success: false, message: "Invalid customer ID format" })
    }

    const opportunity = new Opportunity(req.body)
    await opportunity.save()
    const populated = await Opportunity.findById(opportunity._id).populate("customer", "name email phone")
    res.status(201).json({ success: true, message: "Opportunity created", data: populated })
  } catch (err) {
    console.error("Error creating opportunity:", err)
    res.status(400).json({ success: false, message: err.message })
  }
}

// Get All Opportunities
exports.getOpportunities = async (req, res) => {
  try {
    const opportunities = await Opportunity.find().populate("customer", "name email phone").sort({ createdAt: -1 })
    res.status(200).json({ success: true, data: opportunities })
  } catch (err) {
    console.error("Error fetching opportunities:", err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// Get Opportunity by ID
exports.getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id).populate("customer", "name email phone")
    if (!opportunity) {
      return res.status(404).json({ success: false, message: "Opportunity not found" })
    }
    res.status(200).json({ success: true, data: opportunity })
  } catch (err) {
    console.error("Error fetching opportunity by ID:", err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// Update Opportunity
exports.updateOpportunity = async (req, res) => {
  try {
    const { customer } = req.body
    // Validate customer ID if it's provided and not empty
    if (customer && !mongoose.Types.ObjectId.isValid(customer)) {
      return res.status(400).json({ success: false, message: "Invalid customer ID format" })
    }

    const opportunity = await Opportunity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("customer", "name email phone")
    if (!opportunity) {
      return res.status(404).json({ success: false, message: "Opportunity not found" })
    }
    res.status(200).json({ success: true, message: "Opportunity updated", data: opportunity })
  } catch (err) {
    console.error("Error updating opportunity:", err)
    res.status(400).json({ success: false, message: err.message })
  }
}

// Delete Opportunity
exports.deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndDelete(req.params.id)
    if (!opportunity) {
      return res.status(404).json({ success: false, message: "Opportunity not found" })
    }
    res.status(200).json({ success: true, message: "Opportunity deleted" })
  } catch (err) {
    console.error("Error deleting opportunity:", err)
    res.status(500).json({ success: false, message: err.message })
  }
}
