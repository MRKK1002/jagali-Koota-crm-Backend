// Complete login test
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../model/User');

async function testCompleteLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const testEmail = 'admin@gmail.com';
    const testPassword = 'admin@123';
    const testCrmType = 'restaurant';

    console.log('Testing login for:');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);
    console.log(`  CRM Type: ${testCrmType}\n`);

    // Step 1: Find user
    console.log('Step 1: Finding user...');
    const user = await User.findOne({ 
      email: testEmail.toLowerCase().trim(),
      crmType: testCrmType.toLowerCase().trim()
    });

    if (!user) {
      console.log('✗ User not found!');
      console.log('\nPlease check:');
      console.log('  1. Email is correct');
      console.log('  2. CRM Type is correct');
      console.log('  3. User exists in database');
      process.exit(1);
    }

    console.log('✓ User found!');
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  CRM Type: ${user.crmType}`);
    console.log(`  Modules: ${user.allowedModules.join(', ')}\n`);

    // Step 2: Check password hash
    console.log('Step 2: Checking password hash...');
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    console.log(`  Password is hashed: ${isHashed ? '✓ YES' : '✗ NO'}`);
    
    if (!isHashed) {
      console.log('  ✗ Password is not hashed!');
      console.log('  Run: node scripts/hashExistingPasswords.js');
      process.exit(1);
    }

    // Step 3: Test password comparison
    console.log('\nStep 3: Testing password comparison...');
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`  Password matches: ${isMatch ? '✓ YES' : '✗ NO'}`);

    if (!isMatch) {
      console.log('\n✗ Password does not match!');
      console.log('\nPossible reasons:');
      console.log('  1. Wrong password entered');
      console.log('  2. Password was changed after hashing');
      console.log('  3. User was created with different password');
      console.log('\nTo fix:');
      console.log('  1. Try the correct password');
      console.log('  2. Or update the user with a new password');
      process.exit(1);
    }

    // Step 4: Simulate login response
    console.log('\nStep 4: Simulating login response...');
    const permissions = {};
    if (user.allowedModules && Array.isArray(user.allowedModules)) {
      user.allowedModules.forEach(module => {
        permissions[module] = true;
      });
    }

    const loginResponse = {
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        type: user.crmType,
        role: user.role,
        permissions: permissions,
        allowedModules: user.allowedModules,
      },
    };

    console.log('✓ Login would succeed!');
    console.log('\nUser data that would be returned:');
    console.log(JSON.stringify(loginResponse, null, 2));

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\nYou should now be able to login with:');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);
    console.log(`  CRM Type: ${testCrmType}`);
    console.log('\n⚠️  Make sure your backend server is running!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('='.repeat(50));
console.log('COMPLETE LOGIN TEST');
console.log('='.repeat(50));
console.log();
testCompleteLogin();
