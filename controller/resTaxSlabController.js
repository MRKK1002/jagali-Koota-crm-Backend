const TaxSlab = require('../model/resTaxSlabModel'); // Assuming the schema file is named taxSlabSchema.js



// Create a new tax slab
const createTaxSlab = async (req, res) => {
  try {
    const { name, description, gstRate, cgstRate, sgstRate, igstRate, taxRate, serviceRate, isActive, effectiveFrom, effectiveTo, applicableFor, priority } = req.body;
    console.log('Request body:', req.body); // Debug log
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tax slab name is required' });
    }
    
    if (serviceRate === undefined || serviceRate === null || serviceRate === '') {
      return res.status(400).json({ message: 'Service rate is required' });
    }
  
    const serviceRateNum = typeof serviceRate === 'string' ? parseFloat(serviceRate.trim()) : serviceRate;
    if (isNaN(serviceRateNum) || serviceRateNum < 0 || serviceRateNum > 100) {
      return res.status(400).json({ message: 'Service rate must be a number between 0 and 100' });
    }

    // Handle GST structure (new format)
    let gstRateNum = 0;
    let cgstRateNum = 0;
    let sgstRateNum = 0;
    let igstRateNum = 0;
    let taxRates = [];
    
    if (gstRate !== undefined && gstRate !== null && gstRate !== '') {
      // New GST format
      gstRateNum = typeof gstRate === 'string' ? parseFloat(gstRate.trim()) : gstRate;
      cgstRateNum = cgstRate !== undefined && cgstRate !== null && cgstRate !== '' 
        ? (typeof cgstRate === 'string' ? parseFloat(cgstRate.trim()) : cgstRate)
        : gstRateNum / 2; // Default: split GST equally
      sgstRateNum = sgstRate !== undefined && sgstRate !== null && sgstRate !== ''
        ? (typeof sgstRate === 'string' ? parseFloat(sgstRate.trim()) : sgstRate)
        : gstRateNum / 2; // Default: split GST equally
      igstRateNum = igstRate !== undefined && igstRate !== null && igstRate !== ''
        ? (typeof igstRate === 'string' ? parseFloat(igstRate.trim()) : igstRate)
        : gstRateNum; // Default: IGST = GST for inter-state

      if (isNaN(gstRateNum) || gstRateNum < 0 || gstRateNum > 100) {
        return res.status(400).json({ message: 'GST rate must be a number between 0 and 100' });
      }
    } else if (taxRate && Array.isArray(taxRate) && taxRate.length > 0) {
      // Legacy format - convert to GST structure
      taxRates = taxRate.map(rate => {
        const numRate = typeof rate === 'string' ? parseFloat(rate.trim()) : rate;
        if (isNaN(numRate) || numRate < 0 || numRate > 100) {
          throw new Error('Tax rates must be numbers between 0 and 100');
        }
        return numRate;
      });
      // Use first tax rate as GST
      gstRateNum = taxRates[0] || 0;
      cgstRateNum = gstRateNum / 2;
      sgstRateNum = gstRateNum / 2;
      igstRateNum = gstRateNum;
    } else {
      return res.status(400).json({ message: 'Either GST rate or tax rate array is required' });
    }
    
    const taxSlabData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      gstRate: gstRateNum,
      cgstRate: cgstRateNum,
      sgstRate: sgstRateNum,
      igstRate: igstRateNum,
      taxRate: taxRates.length > 0 ? taxRates : [gstRateNum], // Keep for backward compatibility
      serviceRate: serviceRateNum,
      isActive: isActive !== undefined ? isActive : true,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      applicableFor: applicableFor || 'All',
      priority: priority !== undefined ? parseInt(priority) : 0,
    };
    
    const taxSlab = new TaxSlab(taxSlabData);
    const savedTaxSlab = await taxSlab.save();
    res.status(201).json({
      message: 'Tax slab created successfully',
      data: savedTaxSlab
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Tax slab with this name already exists' });
    }
    res.status(500).json({ message: 'Error creating tax slab', error: error.message });
  }
};

// Get all tax slabs
const getAllTaxSlabs = async (req, res) => {
  try {
    const taxSlabs = await TaxSlab.find();
    res.status(200).json({
      message: 'Tax slabs retrieved successfully',
      data: taxSlabs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tax slabs', error: error.message });
  }
};

// Get a single tax slab by ID
const getTaxSlabById = async (req, res) => {
  try {
    const taxSlab = await TaxSlab.findById(req.params.id);
    if (!taxSlab) {
      return res.status(404).json({ message: 'Tax slab not found' });
    }
    res.status(200).json({
      message: 'Tax slab retrieved successfully',
      data: taxSlab
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving tax slab', error: error.message });
  }
};

// Update a tax slab
const updateTaxSlab = async (req, res) => {
  try {
    const { name, description, gstRate, cgstRate, sgstRate, igstRate, taxRate, serviceRate, isActive, effectiveFrom, effectiveTo, applicableFor, priority } = req.body;
    console.log('Update request body:', req.body); // Debug log
    
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ message: 'Tax slab name cannot be empty' });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : '';
    
    // Handle GST structure updates
    if (gstRate !== undefined && gstRate !== null && gstRate !== '') {
      const gstRateNum = typeof gstRate === 'string' ? parseFloat(gstRate.trim()) : gstRate;
      if (isNaN(gstRateNum) || gstRateNum < 0 || gstRateNum > 100) {
        return res.status(400).json({ message: 'GST rate must be a number between 0 and 100' });
      }
      updateData.gstRate = gstRateNum;
      
      // Auto-calculate CGST/SGST if not provided
      if (cgstRate !== undefined && cgstRate !== null && cgstRate !== '') {
        updateData.cgstRate = typeof cgstRate === 'string' ? parseFloat(cgstRate.trim()) : cgstRate;
      } else if (!updateData.cgstRate) {
        updateData.cgstRate = gstRateNum / 2;
      }
      
      if (sgstRate !== undefined && sgstRate !== null && sgstRate !== '') {
        updateData.sgstRate = typeof sgstRate === 'string' ? parseFloat(sgstRate.trim()) : sgstRate;
      } else if (!updateData.sgstRate) {
        updateData.sgstRate = gstRateNum / 2;
      }
      
      if (igstRate !== undefined && igstRate !== null && igstRate !== '') {
        updateData.igstRate = typeof igstRate === 'string' ? parseFloat(igstRate.trim()) : igstRate;
      } else if (!updateData.igstRate) {
        updateData.igstRate = gstRateNum;
      }
      
      // Update legacy taxRate for backward compatibility
      updateData.taxRate = [gstRateNum];
    } else if (taxRate !== undefined && Array.isArray(taxRate) && taxRate.length > 0) {
      // Legacy format
      const taxRates = taxRate.map(rate => {
        const numRate = typeof rate === 'string' ? parseFloat(rate.trim()) : rate;
        if (isNaN(numRate) || numRate < 0 || numRate > 100) {
          throw new Error('Tax rates must be numbers between 0 and 100');
        }
        return numRate;
      });
      updateData.taxRate = taxRates;
      // Convert to GST structure
      const gstRateNum = taxRates[0] || 0;
      updateData.gstRate = gstRateNum;
      updateData.cgstRate = gstRateNum / 2;
      updateData.sgstRate = gstRateNum / 2;
      updateData.igstRate = gstRateNum;
    }
    
    if (serviceRate !== undefined) {
      const serviceRateNum = typeof serviceRate === 'string' ? parseFloat(serviceRate.trim()) : serviceRate;
      if (isNaN(serviceRateNum) || serviceRateNum < 0 || serviceRateNum > 100) {
        return res.status(400).json({ message: 'Service rate must be a number between 0 and 100' });
      }
      updateData.serviceRate = serviceRateNum;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (effectiveFrom !== undefined) updateData.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();
    if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
    if (applicableFor !== undefined) updateData.applicableFor = applicableFor;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    
    const taxSlab = await TaxSlab.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!taxSlab) {
      return res.status(404).json({ message: 'Tax slab not found' });
    }
    res.status(200).json({
      message: 'Tax slab updated successfully',
      data: taxSlab
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Tax slab with this name already exists' });
    }
    res.status(500).json({ message: 'Error updating tax slab', error: error.message });
  }
};

// Delete a tax slab
const deleteTaxSlab = async (req, res) => {
  try {
    const taxSlab = await TaxSlab.findByIdAndDelete(req.params.id);
    if (!taxSlab) {
      return res.status(404).json({ message: 'Tax slab not found' });
    }
    res.status(200).json({ message: 'Tax slab deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tax slab', error: error.message });
  }
};

module.exports = {
  createTaxSlab,
  getAllTaxSlabs,
  getTaxSlabById,
  updateTaxSlab,
  deleteTaxSlab
};