// Test Vidya's login
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../model/User');

async function testVidyaLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const email = 'vidya@gmail.com';
    const testPasswords = ['vidya123', 'vidya@123', 'Vidya123', 'password'];

    console.log('Finding Vidya...');
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('✗ User not found!');
      process.exit(1);
    }

    console.log('✓ User found!');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Allowed Modules: ${user.allowedModules.join(', ')}\n`);

    console.log('Testing common passwords...\n');
    
    for (const password of testPasswords) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password "${password}": ${isMatch ? '✓ MATCH!' : '✗ no match'}`);
      
      if (isMatch) {
        console.log('\n' + '='.repeat(50));
        console.log('LOGIN CREDENTIALS FOUND!');
        console.log('='.repeat(50));
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`CRM Type: restaurant`);
        console.log('\nExpected behavior after login:');
        console.log('  - Should see only 3 modules in sidebar:');
        console.log('    1. Order & Billing (orders)');
        console.log('    2. Kitchen Management (kitchen)');
        console.log('    3. Restaurant Setup > Tables (tables)');
        console.log('\n  - Should NOT see:');
        console.log('    - Dashboard, Menu, Inventory, Purchase, etc.');
        break;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('If none of the passwords matched, you need to:');
    console.log('1. Remember the password you used when creating Vidya');
    console.log('2. Or reset the password using Restaurant User Management');
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testVidyaLogin();
