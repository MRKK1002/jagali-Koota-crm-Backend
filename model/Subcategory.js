const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subcategory name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoryy',
    required: [true, 'Category ID is required'],
  },
  branchId: {
    type: String,
    required: [true, 'Branch ID is required']
  }
}, {
  timestamps: true
});

subcategorySchema.index({ name: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model('Subcategory', subcategorySchema);
