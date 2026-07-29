const mongoose = require("mongoose");

const storeLocationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    manager: {
        type: String,
        required: true,
    },
    contact: {
        type: String,
        required: true,
    },
    itemCount: {
        type: Number,
        default: 0, // <-- Make it optional and default to 0
    },
});

// Prevent model overwrite error
module.exports = mongoose.models.StoreLocation || mongoose.model("StoreLocation", storeLocationSchema);