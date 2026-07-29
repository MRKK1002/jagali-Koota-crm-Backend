// Add dashboard module to Vidya
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../model/User');

async function addDashboard() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const email = 'vidya@gmail.com';

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('✗ User not found!');
      process.exit(1);
    }

    console.log('Current modules:', user.allowedModules.join(', '));

    // Add dashboard if not already present
    if (!user.allowedModules.includes('dashboard')) {
      user.allowedModules.unshift('dashboard'); // Add at beginning
      await user.save();
      console.log('✓ Added dashboard module');
    } else {
      console.log('✓ Dashboard already present');
    }

    console.log('Updated modules:', user.allowedModules.join(', '));
    console.log('\n✓ Done! Vidya can now access dashboard.');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

addDashboard();
