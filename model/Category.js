const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  image: {
    type: String,
    default: null
  },
  branch: {
    id: {
      type: String,
      required: [true, 'Branch ID is required']
    },
    name: {
      type: String,
      required: [true, 'Branch name is required']
    },
    address: {
      type: String,
      required: [true, 'Branch address is required']
    }
  }
}, {
  timestamps: true
});

categorySchema.index({ name: 1, 'branch.id': 1 }, { unique: true });

module.exports = mongoose.model('Categoryy', categorySchema);