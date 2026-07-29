const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  rawId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: [true, 'Raw material ID is required']
  },
  name: {
    type: String,
    required: [true, 'Ingredient name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.0001, 'Quantity must be greater than 0']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: {
      values: ['KG', 'Lt', 'pieces'],
      message: 'Invalid unit. Must be KG, Lt, or pieces'
    }
  }
});

const recipeSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch ID is required']
  },
  ingredients: [ingredientSchema]
}, { timestamps: true });

// Ensure unique recipe per product and branch
recipeSchema.index({ productId: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('Recipe', recipeSchema); 