const mongoose = require("mongoose");
const SubAdmin = require("../model/SubAdmin");
require("dotenv").config();

async function checkCommonUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hotelvirat");
    console.log("✅ Connected to MongoDB\n");

    // Find all common users
    const commonUsers = await SubAdmin.find({ type: "common" });
    console.log(`📊 Found ${commonUsers.length} common user(s)\n`);

    if (commonUsers.length > 0) {
      commonUsers.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Type: ${user.type}`);
        console.log(`  Name: ${user.name || 'N/A'}`);
        console.log(`  Created: ${user.createdAt || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log("❌ No common users found!");
      console.log("Run: node scripts/createCommonUser.js");
    }

    // Also check all users
    const allUsers = await SubAdmin.find({});
    console.log(`\n📋 Total users in database: ${allUsers.length}`);
    console.log("\nAll user types:");
    const types = {};
    allUsers.forEach(user => {
      types[user.type] = (types[user.type] || 0) + 1;
    });
    Object.entries(types).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkCommonUser();

