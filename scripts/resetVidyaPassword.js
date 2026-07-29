// Reset Vidya's password for testing
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../model/User');

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const email = 'vidya@gmail.com';
    const newPassword = 'vidya123';

    console.log(`Resetting password for: ${email}`);
    console.log(`New password: ${newPassword}\n`);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('✗ User not found!');
      process.exit(1);
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log('✓ Password reset successfully!\n');
    console.log('='.repeat(50));
    console.log('LOGIN CREDENTIALS');
    console.log('='.repeat(50));
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`CRM Type: restaurant`);
    console.log('\nUser Details:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Allowed Modules: ${user.allowedModules.join(', ')}`);
    console.log('\nExpected Sidebar Modules:');
    console.log('  1. Order & Billing');
    console.log('  2. Kitchen Management');
    console.log('  3. Restaurant Setup (with Tables submenu)');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

console.log('Resetting Vidya\'s password...\n');
resetPassword();
