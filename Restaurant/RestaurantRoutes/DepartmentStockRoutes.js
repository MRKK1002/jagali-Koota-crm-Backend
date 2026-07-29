const express = require("express");
const router = express.Router();
const controller = require("../RestaurantController/DepartmentStockController");

router.get("/", controller.getAllDepartmentStock);
router.get("/department", controller.getDepartmentStock); // ?department=Kitchen&branch=MYSURU
router.post("/deduct-by-recipe", controller.deductByRecipe);

// Consumption logs
router.get("/consumption-logs", controller.getConsumptionLogs);

module.exports = router;
