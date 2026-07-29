// models/SequenceModel.js
const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: String,
  sequence_value: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Sequence', sequenceSchema);