// Script to hash passwords for existing users
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../model/User');

async function hashExistingPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`\nFound ${users.length} users`);

    if (users.length === 0) {
      console.log('No users to process');
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        console.log(`✓ Skipping ${user.email} - password already hashed`);
        skipped++;
        continue;
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      // Update directly in database to avoid triggering pre-save hook
      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );

      console.log(`✓ Hashed password for ${user.email}`);
      updated++;
    }

    console.log(`\n✓ Complete!`);
    console.log(`  - Updated: ${updated} users`);
    console.log(`  - Skipped: ${skipped} users (already hashed)`);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
console.log('Starting password hashing for existing users...\n');
hashExistingPasswords();
