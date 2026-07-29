const mongoose = require("mongoose");
const SubAdmin = require("../model/SubAdmin");
require("dotenv").config();

// Check if a user exists
async function checkUser() {
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

    const email = process.argv[2] || "restaurant.admin@example.com";
    const type = process.argv[3] || "restaurant";

    console.log(`🔍 Checking for user:`);
    console.log(`   Email: ${email}`);
    console.log(`   Type: ${type}\n`);

    // Check by email and type
    const user = await SubAdmin.findOne({
      email: email.toLowerCase().trim(),
      type: type.toLowerCase().trim(),
    });

    if (user) {
      console.log("✅ User found!");
      console.log(`   Name: ${user.name || "N/A"}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Type: ${user.type}`);
      console.log(`   Created: ${user.createdAt}`);
    } else {
      console.log("❌ User not found!");
      console.log("\nChecking if user exists with different type...");

      // Check by email only
      const userByEmail = await SubAdmin.findOne({
        email: email.toLowerCase().trim(),
      });

      if (userByEmail) {
        console.log(`⚠️  User exists but with type: ${userByEmail.type}`);
        console.log(`   Expected type: ${type}`);
        console.log(`   Actual type: ${userByEmail.type}`);
      } else {
        console.log("❌ No user found with this email at all.");
      }

      // List all users
      console.log("\n📋 All users in database:");
      const allUsers = await SubAdmin.find({}).select("email type name");
      if (allUsers.length === 0) {
        console.log("   No users found in database.");
      } else {
        allUsers.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email} (${u.type}) - ${u.name || "N/A"}`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking user:", error);
    process.exit(1);
  }
}

checkUser();

