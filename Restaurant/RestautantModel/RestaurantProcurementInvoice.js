const mongoose = require("mongoose")

const procurementInvoiceSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    vendor: {
      type: String, // Keep as String for vendor name
      required: [true, "Vendor is required"],
    },
    vendorName: {
      type: String,
      required: [true, "Vendor name is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "INR"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "overdue", "paid", "cancelled"],
      default: "pending",
    },
    category: {
      type: String,
      enum: ["materials", "services", "equipment", "utilities", "other"],
      default: "other",
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better performance
procurementInvoiceSchema.index({ invoiceNo: 1 })
procurementInvoiceSchema.index({ vendor: 1, status: 1 })
procurementInvoiceSchema.index({ dueDate: 1, status: 1 })
procurementInvoiceSchema.index({ status: 1, createdAt: -1 })

// Virtual for checking if invoice is overdue
procurementInvoiceSchema.virtual("isOverdue").get(function () {
  return this.status === "pending" && new Date() > this.dueDate
})

// Pre-save middleware to update status based on due date
procurementInvoiceSchema.pre("save", function (next) {
  if (this.status === "pending" && new Date() > this.dueDate) {
    this.status = "overdue"
  }
  next()
})

module.exports = mongoose.model("ProcurementInvoice", procurementInvoiceSchema)
