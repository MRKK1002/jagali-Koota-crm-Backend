// // models/NewRecipeRequirement.js
// const mongoose = require("mongoose");

// const itemSchema = new mongoose.Schema({
//   rawMaterial: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Material",
//     required: true,
//   },
//   quantity: { type: Number, required: true, min: 0 },
//   unit: { type: String, required: true, trim: true },
// });

// const newRecipeRequirementSchema = new mongoose.Schema(
//   {
//     branchId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Branch",
//       required: true,
//     },
//     categoryId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Categoryy", // 👈 matches your Category model
//       required: true,
//     },
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Menu",
//       required: true,
//     },
//     items: {
//       type: [itemSchema],
//       default: [],
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("NewRecipeRequirement", newRecipeRequirementSchema);


// models/NewRecipeRequirement.js
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  rawMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
    required: true,
  },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
});

const newRecipeRequirementSchema = new mongoose.Schema(
  {
    branchId: {
      type: String, // Store as string since it references Hotel Virat DB
      required: true,
    },
    branchName: {
      type: String,
      required: true
    },
    categoryId: {
      type: String, // Store as string since it references Hotel Virat DB
      required: true,
    },
    categoryName: {
      type: String,
      required: true
    },
    productId: {
      type: String, // Changed from ObjectId to String
      required: true,
    },
   productName: {
      type: String, // Add this field to store the product name
      required: true
    },
    items: {
      type: [itemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewRecipeRequirement", newRecipeRequirementSchema);