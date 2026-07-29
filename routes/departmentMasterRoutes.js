const express = require('express');
const router = express.Router();
const Department = require('../model/DepartmentModel');

// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create department
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }
    const dept = new Department({ name: name.trim() });
    await dept.save();
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
