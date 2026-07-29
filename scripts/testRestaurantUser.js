// Test script to verify restaurant user creation
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../model/User');

async function testRestaurantUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Test data
    const testUser = {
      name: 'Test Chef',
      email: 'testchef@restaurant.com',
      password: 'testpassword123',
      role: 'Chef',
      crmType: 'restaurant',
      allowedModules: ['dashboard', 'menu', 'kitchen', 'inventory']
    };

    console.log('\nTesting user creation with restaurant role...');
    console.log('Test data:', testUser);

    // Try to create user
    const user = new User(testUser);
    await user.save();
    
    console.log('✓ User created successfully!');
    console.log('Created user:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      crmType: user.crmType,
      allowedModules: user.allowedModules
    });

    // Clean up - delete test user
    await User.findByIdAndDelete(user._id);
    console.log('✓ Test user cleaned up');

    console.log('\n✓ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testRestaurantUser();
