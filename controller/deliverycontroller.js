const Delivery = require("../model/Delivery")
const mongoose = require("mongoose") // Import mongoose for ObjectId validation

// Create a new delivery
exports.createDelivery = async (req, res) => {
  try {
    const { customer } = req.body
    // Validate customer ID if it's provided and not empty
    if (customer && !mongoose.Types.ObjectId.isValid(customer)) {
      return res.status(400).send({ success: false, message: "Invalid customer ID format" })
    }

    const delivery = new Delivery(req.body)
    await delivery.save()
    const populatedDelivery = await Delivery.findById(delivery._id).populate("customer", "name email")
    res.status(201).send({
      success: true,
      message: "Delivery created successfully",
      data: populatedDelivery,
    })
  } catch (error) {
    console.error("Error creating delivery:", error)
    res.status(400).send({ success: false, message: error.message })
  }
}

// Get all deliveries with populated customer info
exports.getDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find().populate("customer", "name email")
    res.status(200).send({ success: true, data: deliveries })
  } catch (error) {
    console.error("Error fetching deliveries:", error)
    res.status(500).send({ success: false, message: error.message })
  }
}

// Get a single delivery by ID
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate("customer", "name email")
    if (!delivery) {
      return res.status(404).send({ success: false, message: "Delivery not found" })
    }
    res.status(200).send({ success: true, data: delivery })
  } catch (error) {
    console.error("Error fetching delivery by ID:", error)
    res.status(500).send({ success: false, message: error.message })
  }
}

// Update delivery by ID
exports.updateDelivery = async (req, res) => {
  try {
    const { customer } = req.body
    // Validate customer ID if it's provided and not empty
    if (customer && !mongoose.Types.ObjectId.isValid(customer)) {
      return res.status(400).send({ success: false, message: "Invalid customer ID format" })
    }

    const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("customer", "name email")
    if (!delivery) {
      return res.status(404).send({ success: false, message: "Delivery not found" })
    }
    res.status(200).send({ success: true, message: "Delivery updated successfully", data: delivery })
  } catch (error) {
    console.error("Error updating delivery:", error)
    res.status(400).send({ success: false, message: error.message })
  }
}

// Delete delivery by ID
exports.deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id)
    if (!delivery) {
      return res.status(404).send({ success: false, message: "Delivery not found" })
    }
    res.status(200).send({ success: true, message: "Delivery deleted successfully" })
  } catch (error) {
    console.error("Error deleting delivery:", error)
    res.status(500).send({ success: false, message: error.message })
  }
}
