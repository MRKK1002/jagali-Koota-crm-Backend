/**
 * Run this script ONCE to fix/create the admin account:
 *   node fixAdmin.js
 *
 * This will:
 *  1. Remove any existing admin records
 *  2. Create a fresh admin with type "restaurant"
 *  3. Pre-save hook handles password hashing automatically
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("./model/adminModel");

async function fixAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Remove old admin records
  const deleted = await Admin.deleteMany({});
  console.log(`🗑️  Removed ${deleted.deletedCount} old admin record(s)`);

  // Create new admin — pre-save hook will hash the password automatically
  const admin = new Admin({
    email: "admin@jagalikoota.com",
    password: "Jagali@2026#DB",
    type: "restaurant",
  });
  await admin.save();

  console.log("\n✅ Admin created successfully!");
  console.log("─────────────────────────────────");
  console.log("   Email   : admin@jagalikoota.com");
  console.log("   Password: Jagali@2026#DB");
  console.log("   Type    : restaurant");
  console.log("─────────────────────────────────");

  await mongoose.disconnect();
  console.log("\n✅ Done. Login with the credentials above.");
}

fixAdmin().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
