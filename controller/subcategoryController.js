const Subcategory = require('../model/Subcategory');

// Create a new subcategory
exports.createSubcategory = async (req, res) => {
  try {
    const { name, description, categoryId, branchId } = req.body;
    
    // Validate required fields
    if (!name || !categoryId || !branchId) {
      return res.status(400).json({ 
        message: 'Name, category ID, and branch ID are required' 
      });
    }

    // Check if subcategory with the same name already exists for this category
    const existingSubcategory = await Subcategory.findOne({ 
      name, 
      categoryId 
    });
    
    if (existingSubcategory) {
      return res.status(400).json({ 
        message: 'Subcategory with this name already exists for this category' 
      });
    }

    const subcategory = new Subcategory({
      name,
      description,
      categoryId,
      branchId
    });

    await subcategory.save();
    res.status(201).json({ 
      message: 'Subcategory created successfully', 
      subcategory 
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Error creating subcategory', 
      error: error.message 
    });
  }
};

// Get all subcategories
exports.getAllSubcategories = async (req, res) => {
  try {
    const { categoryId, branchId } = req.query;
    
    // Build filter based on query parameters
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (branchId) filter.branchId = branchId;
    
    const subcategories = await Subcategory.find(filter)
      .populate('categoryId', 'name')
      .sort({ name: 1 });
    res.status(200).json(subcategories);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching subcategories', 
      error: error.message 
    });
  }
};

// Get a single subcategory by ID
exports.getSubcategoryById = async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id)
      .populate('categoryId', 'name');
    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }
    res.status(200).json(subcategory);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching subcategory', 
      error: error.message 
    });
  }
};

// Update a subcategory
exports.updateSubcategory = async (req, res) => {
  try {
    const { name, description, categoryId, branchId } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (branchId !== undefined) updateData.branchId = branchId;

    const subcategory = await Subcategory.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      {
        new: true,
        runValidators: true,
      }
    ).populate('categoryId', 'name');

    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    res.status(200).json({ 
      message: 'Subcategory updated successfully', 
      subcategory 
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Error updating subcategory', 
      error: error.message 
    });
  }
};

// Delete a subcategory
exports.deleteSubcategory = async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id);
    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    await Subcategory.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting subcategory', 
      error: error.message 
    });
  }
};
