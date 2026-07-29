const mongoose = require("mongoose")

const cOrderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Menu",
    required: [true, "Menu item ID is required"],
  },
  name: {
    type: String,
    required: [true, "Item name is required"],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
  },
})

const counterOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Counter",
    required: [true, "User ID is required"],
  },
  customerName: {
    type: String,
    required: [true, "Customer name is required"],
    trim: true,
    minlength: [1, "Customer name cannot be empty"],
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
    match: [/^\d{10}$/, "Phone number must be a 10-digit number"],
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: [true, "Branch is required"],
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CounterInvoice",
    required: [true, "Invoice is required"],
  },
  items: [cOrderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, "Subtotal cannot be negative"],
  },
  gstAmount: {
    type: Number,
    default: 0,
    min: [0, "GST amount cannot be negative"],
  },
  tax: {
    type: Number,
    required: true,
    min: [0, "Tax cannot be negative"],
  },
  serviceCharge: {
    type: Number,
    required: true,
    min: [0, "Service charge cannot be negative"],
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, "Total amount cannot be negative"],
  },
  grandTotal: {
    type: Number,
    required: true,
    min: [0, "Grand total cannot be negative"],
  },
  paymentMethod: {
    type: String,
    required: [true, "Payment method is required"],
    enum: ["cash", "card", "upi", "qr"],
  },
  orderStatus: {
    type: String,
    required: [true, "Order status is required"],
    enum: ["pending", "processing", "completed", "cancelled"],
    default: "processing",
  },
  paymentStatus: {
    type: String,
    required: [true, "Payment status is required"],
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Add index for better query performance
counterOrderSchema.index({ userId: 1, createdAt: -1 })
counterOrderSchema.index({ orderStatus: 1 })

module.exports = mongoose.model("CounterOrder", counterOrderSchema)
