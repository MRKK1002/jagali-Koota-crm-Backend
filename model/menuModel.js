const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoryy', 
    required: [true, 'Category ID is required'],
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
    default: null,
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
  // status: {
  //   type: String,
  //   enum: ['Available', 'Limited', 'Out of Stock'],
  //   default: 'Available',
  // },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      // Convert Mongoose Map to plain object so frontend can access prices as ret.prices["Small"]
      if (ret.prices instanceof Map) {
        ret.prices = Object.fromEntries(ret.prices);
      }
      return ret;
    }
  }
});

module.exports = mongoose.model('Menu', menuSchema);