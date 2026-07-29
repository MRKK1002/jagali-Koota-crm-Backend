const mongoose = require("mongoose");

const taxConfigurationSchema = new mongoose.Schema(
  {
    taxType: {
      type: String,
      required: true,
      enum: ["GST", "TDS", "VAT", "Service Tax", "Professional Tax", "Other"],
    },
    taxName: {
      type: String,
      required: true,
      trim: true,
    },
    taxCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "both"],
      default: "both",
    },
    // GST specific fields
    gstType: {
      type: String,
      enum: ["CGST", "SGST", "IGST", "UGST", "CESS"],
    },
    gstRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    sacCode: {
      type: String,
      trim: true,
    },
    // TDS specific fields
    tdsSection: {
      type: String,
      trim: true,
    },
    tdsRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    tdsThreshold: {
      type: Number,
      default: 0,
    },
    // General tax fields
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: {
      type: Date,
    },
    applicableFor: {
      type: String,
      enum: ["Sales", "Purchase", "Both"],
      default: "Both",
    },
    // Accounts mapping
    taxPayableAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
    },
    taxReceivableAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
    },
    // Additional configuration
    isCompoundTax: {
      type: Boolean,
      default: false,
    },
    parentTax: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaxConfiguration",
    },
    isReverseCharge: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// taxCode index is automatically created by unique: true constraint
taxConfigurationSchema.index({ businessType: 1, isActive: 1 });
taxConfigurationSchema.index({ taxType: 1 });

// Static method to calculate GST
taxConfigurationSchema.statics.calculateGST = function (
  amount,
  gstRate,
  isInterState = false
) {
  const gstAmount = (amount * gstRate) / 100;

  if (isInterState) {
    // Inter-state: IGST
    return {
      IGST: gstAmount,
      CGST: 0,
      SGST: 0,
      totalGST: gstAmount,
      totalAmount: amount + gstAmount,
    };
  } else {
    // Intra-state: CGST + SGST
    const halfGST = gstAmount / 2;
    return {
      IGST: 0,
      CGST: halfGST,
      SGST: halfGST,
      totalGST: gstAmount,
      totalAmount: amount + gstAmount,
    };
  }
};

// Static method to calculate TDS
taxConfigurationSchema.statics.calculateTDS = function (
  amount,
  tdsSection,
  tdsRate,
  threshold = 0
) {
  if (amount < threshold) {
    return {
      tdsAmount: 0,
      netAmount: amount,
      isApplicable: false,
    };
  }

  const tdsAmount = (amount * tdsRate) / 100;
  return {
    tdsAmount,
    netAmount: amount - tdsAmount,
    tdsSection,
    tdsRate,
    isApplicable: true,
  };
};

// Method to get active GST rates for a business type
taxConfigurationSchema.statics.getActiveGSTRates = async function (
  businessType = "both"
) {
  const query = {
    taxType: "GST",
    isActive: true,
    effectiveFrom: { $lte: new Date() },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
  };

  if (businessType !== "both") {
    query.$or = [{ businessType }, { businessType: "both" }];
  }

  return await this.find(query).sort({ gstRate: 1 });
};

// Method to get active TDS sections
taxConfigurationSchema.statics.getActiveTDSSections = async function (
  businessType = "both"
) {
  const query = {
    taxType: "TDS",
    isActive: true,
    effectiveFrom: { $lte: new Date() },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
  };

  if (businessType !== "both") {
    query.$or = [{ businessType }, { businessType: "both" }];
  }

  return await this.find(query).sort({ tdsSection: 1 });
};

// Method to validate HSN/SAC code
taxConfigurationSchema.statics.validateHSNCode = function (hsnCode) {
  // HSN code should be 4, 6, or 8 digits
  const hsnRegex = /^\d{4}$|^\d{6}$|^\d{8}$/;
  return hsnRegex.test(hsnCode);
};

taxConfigurationSchema.statics.validateSACCode = function (sacCode) {
  // SAC code should be 6 digits
  const sacRegex = /^\d{6}$/;
  return sacRegex.test(sacCode);
};

module.exports = mongoose.model("TaxConfiguration", taxConfigurationSchema);


