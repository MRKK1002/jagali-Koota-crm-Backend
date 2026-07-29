// Script to give full access to a specific user
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../model/User');

async function giveFullAccess() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const email = 'admin@gmail.com';
    
    // All available restaurant modules
    const allModules = [
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
    ];

    console.log(`Updating user: ${email}`);
    console.log(`Granting access to ${allModules.length} modules...\n`);

    // Update user with all modules
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { 
        $set: { 
          allowedModules: allModules,
          role: 'Admin' // Also set role to Admin for full access
        } 
      },
      { new: true }
    );

    if (!user) {
      console.log('✗ User not found!');
      console.log(`\nPlease check if user with email "${email}" exists.`);
      process.exit(1);
    }

    console.log('✓ User updated successfully!');
    console.log('\nUser details:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  CRM Type: ${user.crmType}`);
    console.log(`  Allowed Modules (${user.allowedModules.length}):`);
    user.allowedModules.forEach(module => {
      console.log(`    - ${module}`);
    });

    console.log('\n✅ Full access granted!');
    console.log('\nNext steps:');
    console.log('  1. Logout from the application');
    console.log('  2. Login again with:');
    console.log(`     Email: ${email}`);
    console.log('     Password: restaurant123');
    console.log('     CRM Type: Restaurant');
    console.log('  3. You should now see all modules!');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('='.repeat(50));
console.log('GRANT FULL ACCESS TO USER');
console.log('='.repeat(50));
console.log();
giveFullAccess();
