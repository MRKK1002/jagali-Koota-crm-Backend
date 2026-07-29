const mongoose = require("mongoose")

const constructionInvoiceSettingsSchema = new mongoose.Schema(
  {
    prefix: {
      type: String,
      required: true,
      default: "SAL",
    },
    nextNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    taxRate: {
      type: Number,
      required: true,
      default: 18,
    },
    taxId: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    companyAddress: {
      type: String,
      required: true,
    },
    companyGSTIN: {
      type: String,
      required: true,
    },
    companyState: {
      type: String,
      required: true,
    },
    paymentTerms: {
      type: Number,
      default: 30, // days
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("ConstructionInvoiceSettings", constructionInvoiceSettingsSchema)
