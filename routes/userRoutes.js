const express = require('express');
const router = express.Router();
const User = require('../model/User'); // Adjust path as needed

// Get all users (for admin)
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password') // Exclude password
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Update user's allowed modules
router.put('/:userId/modules', async (req, res) => {
  try {
    const { userId } = req.params;
    const { allowedModules } = req.body;

    if (!Array.isArray(allowedModules)) {
      return res.status(400).json({ message: 'allowedModules must be an array' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { allowedModules },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Module access updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating module access:', error);
    res.status(500).json({ message: 'Error updating module access', error: error.message });
  }
});

// Get user's allowed modules
router.get('/:userId/modules', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('allowedModules name email role');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      allowedModules: user.allowedModules || [],
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching user modules:', error);
    res.status(500).json({ message: 'Error fetching user modules', error: error.message });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, crmType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user (password will be hashed by pre-save hook if you have one)
    const user = new User({
      name,
      email,
      password, // Make sure you have password hashing in your User model
      role,
      crmType,
      allowedModules: [] // Start with no modules
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Update user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, password, role, crmType } = req.body;

    // Find user first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    user.name = name;
    user.email = email;
    user.role = role;
    user.crmType = crmType;
    
    // Only update password if provided (will be hashed by pre-save hook)
    if (password && password.trim() !== '') {
      user.password = password;
    }

    // Save (this will trigger pre-save hook for password hashing)
    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});

// Delete user
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

module.exports = router;
