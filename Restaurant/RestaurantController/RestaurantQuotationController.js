const Quotation = require('../RestautantModel/RestaurantQuotation');

// Get all quotations (CRM + Vendor)
exports.getAllQuotations = async (req, res, next) => {
  try {
    // Filter by businessType if provided
    const filter = {};
    if (req.query.businessType) {
      filter.businessType = req.query.businessType;
    }

    const quotations = await Quotation.find(filter)
      .populate('vendorId', 'vendorName contactInfo')       // Vendor Quotation
      .populate('poId', 'poNumber date')                    // Vendor Quotation
      .populate('customerId', 'name email company');        // CRM Quotation

    res.status(200).json(quotations);
  } catch (error) {
    next(error);
  }
};

// Create a new quotation
exports.createQuotation = async (req, res, next) => {
  try {
    const quotation = new Quotation(req.body);
    await quotation.save();

    const populated = await Quotation.findById(quotation._id)
      .populate('vendorId', 'vendorName contactInfo')
      .populate('poId', 'poNumber')
      .populate('customerId', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ message: 'Error creating quotation', error: error.message });
  }
};

// Get a single quotation by ID
exports.getQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('vendorId', 'vendorName contactInfo')
      .populate('poId', 'poNumber')
      .populate('customerId', 'name email');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.status(200).json(quotation);
  } catch (error) {
    next(error);
  }
};

// Update an existing quotation
exports.updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('vendorId', 'vendorName contactInfo')
      .populate('poId', 'poNumber')
      .populate('customerId', 'name email');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.status(200).json(quotation);
  } catch (error) {
    next(error);
  }
};

// Delete a quotation
exports.deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    res.status(200).json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    next(error);
  }
};
