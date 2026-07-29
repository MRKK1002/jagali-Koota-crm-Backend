const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const SubAdmin = require("../model/SubAdmin");
require("dotenv").config();

// Create a specific common user
async function createSpecificCommonUser() {
  try {
    // Connect to MongoDB - Use same variable as server.js
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/hotelvirat", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB\n");

    const email = "common123@gmail.com";
    const password = "common123";

    // Check if user already exists
    const existingUser = await SubAdmin.findOne({ email });

    if (existingUser) {
      console.log("⚠️  User already exists with this email!");
      console.log(`Email: ${existingUser.email}`);
      console.log(`Type: ${existingUser.type}`);
      
      // Ask if we should update it
      console.log("\n🔄 Updating user to type 'common'...");
      
      const hashedPassword = await bcryptjs.hash(password, 10);
      
      existingUser.type = "common";
      existingUser.password = hashedPassword;
      existingUser.name = "Common User";
      existingUser.permissions = {
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
      };
      
      await existingUser.save();
      console.log("✅ User updated successfully!");
    } else {
      // Hash the password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Create new common user with full permissions
      const commonUser = new SubAdmin({
        name: "Common User",
        email: email,
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
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 LOGIN CREDENTIALS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Type:     common`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n✨ You can now login with these credentials!");
    console.log("🔗 Go to login page and select 'Common' type\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating common user:", error);
    process.exit(1);
  }
}

createSpecificCommonUser();

