const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialCategory',   // reference to categories
      required: false
    },
    unit:{
      type: String,
      required: true
    },
    businessType: {
      type: String,
      enum: ['construction', 'restaurant'],
      default: 'construction'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
