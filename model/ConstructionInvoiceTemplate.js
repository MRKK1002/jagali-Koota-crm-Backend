const mongoose = require("mongoose")

const constructionInvoiceTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Inactive",
    },
    templateData: {
      type: Object,
      required: true,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure only one template is active at a time
constructionInvoiceTemplateSchema.pre("save", async function (next) {
  if (this.status === "Active") {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { status: "Inactive" })
  }
  next()
})

module.exports = mongoose.model("ConstructionInvoiceTemplate", constructionInvoiceTemplateSchema)
