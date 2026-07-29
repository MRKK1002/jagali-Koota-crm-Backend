// const mongoose = require("mongoose")

// const rawMaterialSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     category: {
//       type: String,
//       required: true,
    
//     },
//     unit: {
//       type: String,
//       required: true,
     
//     },
//     price: {
//       type: Number,
//       required: true,
//       min: 0,
//     },
//     quantity: {
//       type: Number,
//       required: true,
//       min: 0,
//       default: 0,
//     },
//     minLevel: {
//       type: Number,
//       required: true,
//       min: 0,
//       default: 5,
//     },
//     supplier: {
//       type: String,
//       trim: true,
//     },
//     description: {
//       type: String,
//       trim: true,
//     },
//     status: {
//       type: String,
//       enum: ["In Stock", "Low Stock", "Out of Stock"],
//       default: function () {
//         if (this.quantity === 0) return "Out of Stock"
//         if (this.quantity <= this.minLevel) return "Low Stock"
//         return "In Stock"
//       },
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   },
// )

// // Virtual for total value
// rawMaterialSchema.virtual("totalValue").get(function () {
//   return this.quantity * this.price
// })

// // Pre-save middleware to update status
// rawMaterialSchema.pre("save", function (next) {
//   if (this.quantity === 0) {
//     this.status = "Out of Stock"
//   } else if (this.quantity <= this.minLevel) {
//     this.status = "Low Stock"
//   } else {
//     this.status = "In Stock"
//   }
//   next()
// })

// // Index for better search performance
// rawMaterialSchema.index({ name: "text", category: 1 })

// module.exports = mongoose.model("RawMaterial", rawMaterialSchema)











const mongoose = require("mongoose")

// Each supplier entry with ObjectId ref
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

/* ------------------ Middleware ------------------ */
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

// Prevent model overwrite error
module.exports = mongoose.models.RawMaterial || mongoose.model("RawMaterial", rawMaterialSchema)

