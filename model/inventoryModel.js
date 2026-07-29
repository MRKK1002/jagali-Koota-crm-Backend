// Re-export LocationInventory and StockTransaction from Restaurant models
// This file provides a common interface for controllers that need these models
const { LocationInventory, StockTransaction } = require("../Restaurant/RestautantModel/RestaurantLocationInventoryModel");

module.exports = {
  LocationInventory,
  StockTransaction,
};




