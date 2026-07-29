const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    type: {
        type: String,
        enum: ['Global', 'Regional', 'Branch'],
        required: true
    },
    region: { type: String, default: null }, // e.g., "Karnataka"
    branch: { type: String, default: null }, // e.g., "Bangalore HQ"
    description: { type: String }
});

module.exports = mongoose.model('Holiday', holidaySchema);
