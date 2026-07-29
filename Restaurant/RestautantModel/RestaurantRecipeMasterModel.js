const mongoose = require("mongoose");

const recipeIngredientSchema = new mongoose.Schema({
  rawMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RawMaterial",
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
}, { _id: false });

const recipeMasterSchema = new mongoose.Schema({
  menuItemId: {
    type: String,
    required: true,
  },
  menuItemName: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    default: "",
    // Which kitchen/department makes this item (North Kitchen, South Kitchen, Bar, etc.)
  },
  category: {
    type: String,
    default: "",
  },
  branch: {
    type: String,
    default: "",
  },
  ingredients: [recipeIngredientSchema],
  servingSize: {
    type: Number,
    default: 1,
  },
  notes: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// One recipe per menu item
recipeMasterSchema.index({ menuItemId: 1 }, { unique: true });

module.exports = mongoose.models.RecipeMaster || mongoose.model("RecipeMaster", recipeMasterSchema);
