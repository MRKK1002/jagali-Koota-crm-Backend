const mongoose = require("mongoose");
const counterRESSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { strict: true }
);
const Counter =
  mongoose.models.CounterRES || mongoose.model("CounterRES", counterRESSchema);
const ressupplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    contact2: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    billingAddress: {
      type: String,
      required: true,
    },
    gst: {
      type: String,
      required: false,
      default: null,
    },
    pan: {
      type: String,
      required: false,
      default: null,
    },
    supplierID: {
      type: String,
      unique: true,
    },
    branchId: {
      type: String, // stores _id from Restaurant App branch API (optional - for multi-branch restaurants)
      required: false, // Completely optional - not needed for basic supplier functionality
      default: null, // Explicitly set default to null
    },
  },
  {
    timestamps: true,
  }
);

ressupplierSchema.index({ gst: 1 }, { unique: true, sparse: true });
ressupplierSchema.index({ pan: 1 }, { unique: true, sparse: true });

ressupplierSchema.pre("save", async function (next) {
  if (this.isNew && !this.supplierID) {
    try {
      console.log("Generating supplierID for new supplier"); // Debug log
      const counter = await Counter.findOneAndUpdate(
        { _id: "supplierID" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      console.log("Counter document:", counter); // Debug log
      this.supplierID = `VHSUPP${String(counter.seq).padStart(4, "0")}`;
      next();
    } catch (error) {
      console.error("Error in pre-save hook:", error); // Debug log
      next(error);
    }
  } else {
    next();
  }
});
console.log("Supplier model defined");
if (mongoose.models.ResSupplier) {
  delete mongoose.models.ResSupplier;
  if (mongoose.modelSchemas && mongoose.modelSchemas.ResSupplier) {
    delete mongoose.modelSchemas.ResSupplier;
  }
}
module.exports = mongoose.models.ResSupplier || mongoose.model("ResSupplier", ressupplierSchema);
