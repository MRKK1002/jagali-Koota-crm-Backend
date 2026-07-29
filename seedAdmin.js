// Run this once: node seedAdmin.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Admin = require("./model/adminModel");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    const existing = await Admin.findOne({ email: "jagalikoota@gmail.com" });
    if (existing) {
      console.log("ℹ️  Admin already exists. Updating password...");
      existing.password = "jagalikoota@123";
      existing.type = "restaurant";
      await existing.save();
      console.log("✅ Admin password updated successfully");
    } else {
      await Admin.create({
        email: "jagalikoota@gmail.com",
        password: "jagalikoota@123",
        type: "restaurant",
      });
      console.log("✅ Admin created successfully");
    }

    console.log("\n📋 Login Credentials:");
    console.log("   Email   : jagalikoota@gmail.com");
    console.log("   Password: jagalikoota@123");
    console.log("   Type    : restaurant");

    await mongoose.disconnect();
    console.log("✅ Done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedAdmin();
