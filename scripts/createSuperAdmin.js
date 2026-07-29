// Script to create a super admin user with full access
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../model/User');

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const superAdminData = {
      name: 'Super Admin',
      email: 'restaurant.admin@example.com',
      password: 'restaurant123',
      role: 'Admin',
      crmType: 'restaurant',
      allowedModules: [
        'dashboard',
        'menu',
        'orders',
        'tables',
        'kitchen',
        'inventory',
        'purchase',
        'customers',
        'reports',
        'hr',
        'payroll',
        'finance',
        'settings'
      ]
    };

    console.log('Creating Super Admin user...');
    console.log(`Email: ${superAdminData.email}`);
    console.log(`Password: ${superAdminData.password}`);
    console.log(`Role: ${superAdminData.role}`);
    console.log(`CRM Type: ${superAdminData.crmType}\n`);

    // Check if user already exists
    const existingUser = await User.findOne({ email: superAdminData.email.toLowerCase() });
    
    if (existingUser) {
      console.log('⚠️  User already exists! Updating instead...\n');
      
      // Update existing user
      existingUser.name = superAdminData.name;
      existingUser.role = superAdminData.role;
      existingUser.crmType = superAdminData.crmType;
      existingUser.allowedModules = superAdminData.allowedModules;
      existingUser.password = superAdminData.password; // Will be hashed by pre-save hook
      
      await existingUser.save();
      
      console.log('✓ User updated successfully!');
    } else {
      // Create new user
      const user = new User(superAdminData);
      await user.save(); // Password will be hashed by pre-save hook
      
      console.log('✓ User created successfully!');
    }

    // Verify the user
    const verifyUser = await User.findOne({ email: superAdminData.email.toLowerCase() });
    
    console.log('\n' + '='.repeat(50));
    console.log('SUPER ADMIN DETAILS');
    console.log('='.repeat(50));
    console.log(`Name: ${verifyUser.name}`);
    console.log(`Email: ${verifyUser.email}`);
    console.log(`Role: ${verifyUser.role}`);
    console.log(`CRM Type: ${verifyUser.crmType}`);
    console.log(`Password is hashed: ${verifyUser.password.startsWith('$2') ? '✓ YES' : '✗ NO'}`);
    console.log(`\nAllowed Modules (${verifyUser.allowedModules.length}):`);
    verifyUser.allowedModules.forEach((module, index) => {
      console.log(`  ${index + 1}. ${module}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('LOGIN CREDENTIALS');
    console.log('='.repeat(50));
    console.log(`Email: ${superAdminData.email}`);
    console.log(`Password: ${superAdminData.password}`);
    console.log(`CRM Type: Restaurant`);
    
    console.log('\n✅ Super Admin is ready!');
    console.log('\nYou can now login with these credentials and access ALL modules.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('='.repeat(50));
console.log('CREATE SUPER ADMIN USER');
console.log('='.repeat(50));
console.log();
createSuperAdmin();
