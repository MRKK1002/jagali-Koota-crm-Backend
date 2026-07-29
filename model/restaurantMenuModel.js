const mongoose = require('mongoose');

const restaurantMenuSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
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
  image: {
    type: String,
    default: null,
  },
  categoryId: {
    type: String, // Store as string since it references Hotel Virat DB
    required: [true, 'Category ID is required'],
  },
  branchId: {
    type: String, // Store as string since it references Hotel Virat DB
    required: [true, 'Branch ID is required'],
  },
  categoryName: {
    type: String,
    required: true
  },
  branchName: {
    type: String,
    required: true
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
  menuTypes: {
    type: [String],
    required: [true, 'At least one menu type is required'],
    validate: {
      validator: function (value) {
        return value.length > 0;
      },
      message: 'At least one menu type is required',
    },
  },
  sourceType: {
    type: String,
    enum: ['restaurant', 'darshani'],
    required: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      // Convert Mongoose Map to plain object
      if (ret.prices instanceof Map) {
        ret.prices = Object.fromEntries(ret.prices);
      }
      return ret;
    }
  }
});

module.exports = mongoose.model('RestaurantMenu', restaurantMenuSchema);