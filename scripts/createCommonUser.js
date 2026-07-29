const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const SubAdmin = require("../model/SubAdmin");
require("dotenv").config();

// Create a common user for testing
async function createCommonUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hotelvirat", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Check if common user already exists
    const existingUser = await SubAdmin.findOne({
      email: "common@example.com",
      type: "common",
    });

    if (existingUser) {
      console.log("Common user already exists!");
      console.log("Email: common@example.com");
      console.log("Type: common");
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash("common123", 10);

    // Create new common user with full permissions
    const commonUser = new SubAdmin({
      name: "Common Admin",
      email: "common@example.com",
      password: hashedPassword,
      type: "common",
      permissions: {
        dashboard: true,
        salesManagement: true,
        purchaseManagement: true,
        inventoryManagement: true,
        menu: true,
        tableManagement: true,
        customerManagement: true,
        hrManagement: true,
        employee: true,
        attendanceLeave: true,
        payroll: true,
        finance: true,
        reports: true,
        security: true,
        alerts: true,
        kitchenDisplay: true,
        POS: true,
        RestaurantDashboard: true,
        RestaurantSetup: true,
        MenuManagement: true,
        StockManagement: true,
        PurchaseManagement: true,
        OrderBilling: true,
        CustomerManagement: true,
        ReservationsManagement: true,
        KitchenManagement: true,
        HRManagement: true,
        ExpenseManagement: true,
        RestaurantAnalytics: true,
        SubAdmin: true,
        UserManagement: true,
        SiteManagement: true,
      },
    });

    await commonUser.save();

    console.log("✅ Common user created successfully!");
    console.log("\n📧 Login Credentials:");
    console.log("Email: common@example.com");
    console.log("Password: common123");
    console.log("Type: common");
    console.log("\nYou can now login with these credentials on the common CRM!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating common user:", error);
    process.exit(1);
  }
}

createCommonUser();

