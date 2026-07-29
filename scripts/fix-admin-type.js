const mongoose = require("mongoose");
const Admin = require("../model/adminModel");
require("dotenv").config();

/**
 * This script updates existing Admin records to set their type field
 * Run this once to fix existing admin accounts
 */
async function fixAdminType() {
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

    // Find all admins without a type field
    const admins = await Admin.find({ type: { $exists: false } });
    
    if (admins.length === 0) {
      console.log("✅ All admin accounts already have a type field set.");
      process.exit(0);
    }

    console.log(`Found ${admins.length} admin(s) without type field:\n`);

    for (const admin of admins) {
      console.log(`📧 Email: ${admin.email}`);
      console.log(`   Setting type to: construction (default)`);
      
      // Update the admin with construction type
      admin.type = "construction";
      await admin.save();
      
      console.log(`   ✅ Updated\n`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All admin accounts updated successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 Note: If you need to change an admin's type,");
    console.log("   update it directly in the database or create a new script.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing admin types:", error);
    process.exit(1);
  }
}

fixAdminType();
