const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  expenseTypes: {
    type: [String],
  },
  claimTypes: {
    type: [String],
  },
});

module.exports = mongoose.model("Settings", settingsSchema);
