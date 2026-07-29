const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      required: true,
      trim: true,
    },
    siteCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    supervisors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
    workersRequired: {
      type: Number,
      required: true,
      default: 0,
    },
    workers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Worker",
      },
    ],
    budget: {
      total: { type: Number, required: true },
      spent: { type: Number, default: 0 },
      remaining: { type: Number },
    },
    timeline: {
      startDate: { type: Date, required: true },
      expectedEndDate: { type: Date, required: true },
      actualEndDate: { type: Date },
    },
    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed", "Cancelled"],
      default: "Planning",
    },
    description: {
      type: String,
    },
    clientDetails: {
      name: { type: String },
      contact: { type: String },
      email: { type: String },
    },
    // Sales Management Integration
    salesClientId: {
      type: String, // localStorage ID from Sales Management
      ref: "ConstructionClient",
    },
    salesProjectId: {
      type: String, // localStorage ID from Sales Management
      ref: "ConstructionProject",
    },
    projectBudget: {
      type: Number,
      default: 0,
    },
    contractValue: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Fixed Assets - permanent assets assigned to site
    fixedAssets: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true }, // Vehicle, Machine, Equipment, etc. (manually entered)
        quantity: { type: Number, default: 1, min: 1 },
        value: { type: Number, required: true, min: 0 }, // Unit value
        totalValue: { type: Number, default: 0 }, // quantity * value
        dateOfPurchase: { type: Date },
        invoiceUrl: { type: String }, // Uploaded invoice file
        invoiceNumber: { type: String },
        depreciationPercentage: { type: Number, min: 0, max: 100, default: 10 },
        currentValue: { type: Number, default: 0 }, // After depreciation
        accumulatedDepreciation: { type: Number, default: 0 },
        vendor: { type: String },
        description: { type: String },
        status: { 
          type: String, 
          enum: ["Active", "Sold", "Disposed", "Under Maintenance"], 
          default: "Active" 
        },
      },
    ],
    // Work Order PDF
    workOrderPdf: {
      type: String,
    },
    // BOQ Excel
    boqExcel: {
      type: String,
    },
    // Temporary Assets - assets temporarily assigned to site
    temporaryAssets: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true }, // Vehicle, Machine, Equipment, etc. (manually entered)
        quantity: { type: Number, default: 1, min: 1 },
        value: { type: Number, required: true, min: 0 }, // Unit value
        totalValue: { type: Number, default: 0 }, // quantity * value
        dateOfPurchase: { type: Date },
        invoiceUrl: { type: String }, // Uploaded invoice file
        invoiceNumber: { type: String },
        depreciationPercentage: { type: Number, min: 0, max: 100, default: 10 },
        currentValue: { type: Number, default: 0 }, // After depreciation
        accumulatedDepreciation: { type: Number, default: 0 },
        vendor: { type: String },
        description: { type: String },
        status: { 
          type: String, 
          enum: ["Active", "Sold", "Disposed", "Under Maintenance"], 
          default: "Active" 
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Calculate remaining budget before saving
siteSchema.pre("save", function (next) {
  if (this.budget) {
    this.budget.remaining = this.budget.total - (this.budget.spent || 0);
  }
  next();
});

module.exports = mongoose.model("Site", siteSchema);
