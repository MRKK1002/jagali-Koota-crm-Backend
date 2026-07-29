const mongoose = require("mongoose")

const sOrderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: String, // Changed to String to match frontend item IDs
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity cannot be less than 1"],
  },
  image: {
    type: String, // Added to store image path
    required: false,
  },
  description: {
    type: String, // Added to store item description
    required: false,
  },
})

const staffOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffLogin", // Reference to StaffLogin model
      required: false, // CHANGED: Made optional for guest orders
    },
    // NEW FIELDS FOR GUEST ORDERS
    customerName: {
      type: String,
      required: false, // Required for guest orders, optional for staff orders
      trim: true,
    },
    customerMobile: {
      type: String,
      required: false, // Required for guest orders, optional for staff orders
      validate: {
        validator: (v) => {
          // Only validate if value is provided
          return !v || /^[0-9]{10}$/.test(v)
        },
        message: "Mobile number must be 10 digits",
      },
    },
    isGuestOrder: {
      type: Boolean,
      default: false, // NEW: Flag to identify guest orders
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      validate: {
        validator: function (v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: "Invalid Branch ID"
      }
    },
    branchName: {
      type: String,
      required: true, // Store branch name for easy access
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: [true, "Table ID is required"],
    },
    tableNumber: {
      type: String,
      required: true,
    },
    peopleCount: {
      type: Number,
      required: true,
      min: [1, "People count cannot be less than 1"],
    },
    items: [sOrderItemSchema],
    status: {
      type: String,
      enum: ["pending", "preparing", "served", "completed", "cancelled"],
      default: "pending",
    },
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    serviceCharge: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: function () {
        // Default to pending for guest orders, completed for staff orders
        return this.isGuestOrder ? "pending" : "completed"
      },
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "cash", "wallet"],
      required: true,
    },
    // NEW FIELD ADDED - to track when payment was last updated
    paymentUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    orderTime: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
)

// UPDATED: Custom validation to ensure either userId OR (customerName + customerMobile) is provided
staffOrderSchema.pre("validate", function (next) {
  if (this.isGuestOrder) {
    // For guest orders, require customerName and customerMobile
    if (!this.customerName || !this.customerMobile) {
      return next(new Error("Guest orders require customerName and customerMobile"))
    }
    // Validate mobile number format for guest orders
    if (!/^[0-9]{10}$/.test(this.customerMobile)) {
      return next(new Error("Mobile number must be 10 digits"))
    }
  } else {
    // For staff orders, require userId
    if (!this.userId) {
      return next(new Error("Staff orders require userId"))
    }
  }
  next()
})

// Add indexes for faster queries
staffOrderSchema.index({ userId: 1 })
// orderId index is automatically created by unique: true constraint
staffOrderSchema.index({ branchId: 1, tableId: 1 })
staffOrderSchema.index({ branchName: 1, tableNumber: 1 })
staffOrderSchema.index({ status: 1 })
staffOrderSchema.index({ paymentStatus: 1 })
staffOrderSchema.index({ paymentMethod: 1 })
staffOrderSchema.index({ isGuestOrder: 1 }) // NEW INDEX
staffOrderSchema.index({ customerMobile: 1 }) // NEW INDEX for guest orders

module.exports = mongoose.model("StaffOrder", staffOrderSchema)
