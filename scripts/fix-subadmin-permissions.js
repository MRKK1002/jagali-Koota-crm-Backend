const mongoose = require("mongoose");
const SubAdmin = require("../model/SubAdmin");
require("dotenv").config();

/**
 * This script fixes SubAdmin permission keys to match the frontend Nav.jsx expectations
 * Run this once to fix existing user permissions
 */

// Mapping of old keys to new keys
const PERMISSION_KEY_MAPPING = {
  purchaseManagement: "PurchaseManagement",
  finance: "ExpenseManagement",
  // hr stays as hr (correct)
  // SiteManagement stays as SiteManagement (correct)
  // salesManagement stays as salesManagement (correct)
  // dashboard stays as dashboard (correct)
  // inventoryManagement stays as inventoryManagement (correct)
  // security stays as security (correct)
  // allAccess stays as allAccess (correct)
};

async function fixSubAdminPermissions() {
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

    // Find all SubAdmins with construction type
    const subAdmins = await SubAdmin.find({ type: "construction" });
    
    if (subAdmins.length === 0) {
      console.log("✅ No construction SubAdmin accounts found.");
      process.exit(0);
    }

    console.log(`Found ${subAdmins.length} construction SubAdmin(s):\n`);

    let updatedCount = 0;

    for (const subAdmin of subAdmins) {
      console.log(`📧 Email: ${subAdmin.email}`);
      console.log(`   Name: ${subAdmin.name || subAdmin.username}`);
      console.log(`   Role: ${subAdmin.role}`);
      
      if (!subAdmin.permissions) {
        console.log(`   ⚠️  No permissions object found, skipping\n`);
        continue;
      }

      let hasChanges = false;
      const updatedPermissions = { ...subAdmin.permissions.toObject() };

      // Check and update permission keys
      for (const [oldKey, newKey] of Object.entries(PERMISSION_KEY_MAPPING)) {
        if (updatedPermissions[oldKey] === true) {
          console.log(`   🔄 Updating: ${oldKey} → ${newKey}`);
          updatedPermissions[newKey] = true;
          delete updatedPermissions[oldKey];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        subAdmin.permissions = updatedPermissions;
        await subAdmin.save();
        updatedCount++;
        console.log(`   ✅ Updated permissions\n`);
      } else {
        console.log(`   ℹ️  No changes needed\n`);
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Updated ${updatedCount} SubAdmin account(s) successfully!`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 Note: Users need to log out and log back in for changes to take effect.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing SubAdmin permissions:", error);
    process.exit(1);
  }
}

fixSubAdminPermissions();
