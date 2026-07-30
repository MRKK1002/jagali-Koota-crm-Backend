const mongoose = require("mongoose")
const supplierEntrySchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResSupplier",   // Reference to Supplier model
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamps: {
      type: Date,
      default: Date.now,
    },

  },
  { _id: false }
)

const locationStockSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      // required: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    }
  },
  { _id: false }
)
const rawMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    suppliers: [supplierEntrySchema], // multiple suppliers
      locations: [locationStockSchema],  // ✅ Track per location
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    minLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["In Stock", "Low Stock", "Out of Stock"],
      default: "In Stock",
    },
    transfered:{
      type:Number,
      default:0
    }
  },
  {
    timestamps: true,
  }
)
rawMaterialSchema.pre("save", function (next) {
  // Calculate totals
  this.totalQuantity = this.suppliers.reduce(
    (sum, s) => sum + (s.quantity || 0),
    0
  )
  this.totalValue = this.suppliers.reduce(
    (sum, s) => sum + (s.quantity * s.price),
    0
  )

  // Update status
  if (this.totalQuantity === 0) {
    this.status = "Out of Stock"
  } else if (this.totalQuantity <= this.minLevel) {
    this.status = "Low Stock"
  } else {
    this.status = "In Stock"
  }

  next()
})

/* ------------------ Index ------------------ */
rawMaterialSchema.index({ name: "text", category: 1 })
module.exports = mongoose.models.RawMaterial || mongoose.model("RawMaterial", rawMaterialSchema)

