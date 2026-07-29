const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const SubAdmin = require("../model/SubAdmin");
require("dotenv").config();

// Create a restaurant user for testing
async function createRestaurantUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI ||
        process.env.MONGODB_URI ||
        "mongodb://localhost:27017/hotelvirat",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ Connected to MongoDB\n");

    const email = "restaurant.admin@example.com";
    const password = "restaurant123"; // Default password - change if needed
    const type = "restaurant";

    // Check if user already exists
    const existingUser = await SubAdmin.findOne({ email, type });

    if (existingUser) {
      console.log("⚠️  User already exists with this email and type!");
      console.log(`Email: ${existingUser.email}`);
      console.log(`Type: ${existingUser.type}`);
      console.log("\n🔄 Updating password...");

      const hashedPassword = await bcryptjs.hash(password, 10);
      existingUser.password = hashedPassword;
      existingUser.name = existingUser.name || "Restaurant Admin";
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
      console.log("✅ User password updated successfully!");
    } else {
      // Hash the password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Create new restaurant user with full permissions
      const restaurantUser = new SubAdmin({
        name: "Restaurant Admin",
        email: email,
        password: hashedPassword,
        type: type,
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

      await restaurantUser.save();
      console.log("✅ Restaurant user created successfully!");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 LOGIN CREDENTIALS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Type:     ${type}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n✨ You can now login with these credentials!");
    console.log("🔗 Go to login page and select 'Restaurant' type\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating restaurant user:", error);
    process.exit(1);
  }
}

createRestaurantUser();

