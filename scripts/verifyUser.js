const mongoose = require("mongoose");
const SubAdmin = require("../model/SubAdmin");
require("dotenv").config();

async function verifyUser() {
  try {
    // Use same connection as server.js
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("✅ Connected to:", mongoose.connection.name, "\n");

    const email = "common123@gmail.com";
    
    const user = await SubAdmin.findOne({ email, type: "common" });
    
    if (user) {
      console.log("✅ User found in database!");
      console.log(`  Email: ${user.email}`);
      console.log(`  Type: ${user.type}`);
      console.log(`  ID: ${user._id}`);
      console.log("\n🎉 Login should work now!");
    } else {
      console.log("❌ User NOT found");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

verifyUser();

