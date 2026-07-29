// Script to check all users and their module access
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../model/User');

async function checkAllUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get all restaurant users
    const users = await User.find({ crmType: 'restaurant' }).sort({ createdAt: -1 });
    
    console.log('='.repeat(70));
    console.log(`FOUND ${users.length} RESTAURANT USERS`);
    console.log('='.repeat(70));
    console.log();

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   CRM Type: ${user.crmType}`);
      console.log(`   Password Hashed: ${user.password.startsWith('$2') ? '✓ YES' : '✗ NO'}`);
      console.log(`   Allowed Modules (${user.allowedModules?.length || 0}):`);
      
      if (user.allowedModules && user.allowedModules.length > 0) {
        user.allowedModules.forEach(module => {
          console.log(`      - ${module}`);
        });
      } else {
        console.log(`      (none assigned)`);
      }
      console.log();
    });

    console.log('='.repeat(70));
    console.log('LOGIN TEST CREDENTIALS');
    console.log('='.repeat(70));
    console.log();

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: (use the password you set when creating this user)`);
      console.log(`   CRM Type: restaurant`);
      console.log(`   Expected Modules: ${user.allowedModules?.join(', ') || 'none'}`);
      console.log();
    });

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('Checking all restaurant users...\n');
checkAllUsers();
