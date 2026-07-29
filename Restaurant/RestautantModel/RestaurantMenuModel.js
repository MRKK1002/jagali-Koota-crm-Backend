const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
  },
  prices: {
    type: Map,
    of: Number,
    required: [true, 'At least one price is required'],
    validate: {
      validator: function (value) {
        return value.size > 0 && Array.from(value.values()).every((price) => price >= 0);
      },
      message: 'At least one valid price is required and prices cannot be negative',
    },
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoryy', 
    required: [true, 'Category ID is required'],
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch ID is required'],
  },
  quantities: {
    type: [String],
    required: [true, 'At least one quantity is required'],
    validate: {
      validator: function (value) {
        return value.length > 0;
      },
      message: 'At least one quantity is required',
    },
  },
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Menu', menuSchema);