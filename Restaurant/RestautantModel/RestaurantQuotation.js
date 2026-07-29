const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    // For CRM Quotations
    quotationNumber: { type: String, required: false, unique: false },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },
    projectType: { type: String },
    serviceType: { type: String },
    materialCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    equipmentCost: { type: Number, default: 0 },
    installationCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
      default: "Draft",
    },
    validTill: { type: Date },

    // For Vendor Quotations
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor"
    },
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Po"
    },
    materialId: { type: String },
    materialDescription: { type: String },
    quantity: { type: Number, default: 1 },
    unit: { 
      type: String, 
      enum: ["pcs", "kg", "ton", "ltr", "m", "sqm", "bag", "box"],
      default: "pcs" 
    },
    quotedPrice: { type: Number },
    deliveryTerms: { type: String },
    
    // Business Type for data separation
    businessType: {
      type: String,
      enum: ["construction", "restaurant"],
      required: true,
      default: "construction"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
