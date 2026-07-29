const mongoose = require('mongoose');

const materialCategorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MaterialCategory', materialCategorySchema);
