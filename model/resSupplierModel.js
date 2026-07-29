const mongoose = require("mongoose");

// Define Counter schema with explicit _id type and strict mode
const counterRESSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { strict: true }
);

// Use existing Counter model or create new one
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
    email: {
      type: String,
      required: true,
    },
    billingAddress: {
      type: String,
      required: true,
    },
    gst: {
      type: String,
      required: true,
      unique: true,
    },
    pan: {
      type: String,
      required: true,
      unique: true,
    },
    supplierID: {
      type: String,
      unique: true,
    },
  branchId: {
  type: String, // stores _id from Restaurant App branch API
  required: true,
},
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-generate supplierID
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

// Debug log to confirm model definition
console.log("Supplier model defined");

module.exports = mongoose.models.ResSupplier || mongoose.model("ResSupplier", ressupplierSchema);
