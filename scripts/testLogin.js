// Test login functionality
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../model/User');

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check if any restaurant users exist
    const restaurantUsers = await User.find({ crmType: 'restaurant' });
    console.log(`Found ${restaurantUsers.length} restaurant users:\n`);

    if (restaurantUsers.length === 0) {
      console.log('❌ No restaurant users found!');
      console.log('Please create a user first through the Restaurant User Management interface.\n');
      process.exit(0);
    }

    // Display all restaurant users
    for (const user of restaurantUsers) {
      console.log('-----------------------------------');
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`CRM Type: ${user.crmType}`);
      console.log(`Allowed Modules: ${user.allowedModules.join(', ') || 'None'}`);
      console.log(`Password (hashed): ${user.password.substring(0, 20)}...`);
      console.log(`Password is hashed: ${user.password.startsWith('$2a$') || user.password.startsWith('$2b$') ? '✓ YES' : '✗ NO'}`);
      console.log('-----------------------------------\n');
    }

    // Test password comparison for first user
    if (restaurantUsers.length > 0) {
      const testUser = restaurantUsers[0];
      console.log(`\nTesting password comparison for: ${testUser.email}`);
      console.log('Enter the password you used when creating this user to test.\n');
      
      // For automated testing, you can uncomment and modify this:
      // const testPassword = 'your_test_password_here';
      // const isMatch = await bcrypt.compare(testPassword, testUser.password);
      // console.log(`Password "${testPassword}" matches: ${isMatch ? '✓ YES' : '✗ NO'}`);
    }

    console.log('\n✓ Test complete!');
    console.log('\nTo login, use:');
    console.log(`  Email: ${restaurantUsers[0].email}`);
    console.log(`  Password: (the password you set when creating the user)`);
    console.log(`  CRM Type: restaurant`);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('Testing Restaurant User Login...\n');
testLogin();
