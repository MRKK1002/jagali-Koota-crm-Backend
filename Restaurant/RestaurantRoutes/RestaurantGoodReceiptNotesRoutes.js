// routes/goodsReceiptNoteRoutes.js
const express = require('express');
const router = express.Router();
const grnController = require('../RestaurantController/RestaurantGoodReceiptNotesController');

// Middleware for request logging (optional)
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

// Apply logging middleware to all routes
router.use(requestLogger);

// Validation middleware for GRN creation
const validateGRNCreation = (req, res, next) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Items array is required and must not be empty'
    });
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.product || typeof item.product !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: `Item ${i + 1}: Product name is required`
      });
    }
    
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({
        status: 'error',
        message: `Item ${i + 1}: Valid quantity is required`
      });
    }
    
    if (!item.rate || typeof item.rate !== 'number' || item.rate < 0) {
      return res.status(400).json({
        status: 'error',
        message: `Item ${i + 1}: Valid rate is required`
      });
    }
    
    if (!item.amount || typeof item.amount !== 'number' || item.amount < 0) {
      return res.status(400).json({
        status: 'error',
        message: `Item ${i + 1}: Valid amount is required`
      });
    }
  }
  
  next();
};

// ===== GRN CRUD ROUTES =====

// Create new GRN
router.post('/', validateGRNCreation, grnController.createGRN);

// Get all GRNs with filtering and pagination
router.get('/', grnController.getAllGRNs);

// Get GRN statistics
router.get('/stats', grnController.getGRNStats);

// Get single GRN by ID
router.get('/:id', grnController.getGRNById);

// Get GRN by GRN Number
router.get('/number/:grnNumber', grnController.getGRNByNumber);

// Update GRN
router.put('/:id', grnController.updateGRN);

// Partial update GRN
router.patch('/:id', grnController.updateGRN);

// Delete GRN
router.delete('/:id', grnController.deleteGRN);

// Fix store types for existing GRNs from their Purchase Orders
router.post('/fix-store-types', async (req, res) => {
  try {
    const GoodsReceiptNote = require('../../model/GoodsReceiptNote');
    const PurchaseOrder = require('../../model/purchaseOrder');
    
    // Fetch all GRNs
    const grns = await GoodsReceiptNote.find().populate('poId', 'storeLocation storeType storeLocationId');
    
    let fixed = 0;
    let updated = [];
    
    for (const grn of grns) {
      let needsUpdate = false;
      const oldStoreType = grn.storeType || 'Main Store';
      let newStoreType = oldStoreType;
      
      // If GRN has poId and PO has storeLocation, use it
      if (grn.poId && grn.poId.storeLocation) {
        const poStoreLocation = typeof grn.poId.storeLocation === 'object' 
          ? grn.poId.storeLocation.name 
          : grn.poId.storeLocation;
        const poStoreType = grn.poId.storeType || poStoreLocation;
        
        // Update if GRN doesn't have storeType or it's "Main Store"
        if (!grn.storeType || grn.storeType === 'Main Store') {
          if (poStoreType && poStoreType !== 'Main Store') {
            newStoreType = poStoreType;
            needsUpdate = true;
          }
        }
      }
      
      // Also update items if they don't have storeType or it's "Main Store"
      if (grn.items && grn.items.length > 0) {
        const updatedItems = grn.items.map(item => {
          if (!item.storeType || item.storeType === 'Main Store') {
            if (newStoreType && newStoreType !== 'Main Store') {
              item.storeType = newStoreType;
              needsUpdate = true;
            }
          }
          return item;
        });
        
        if (needsUpdate) {
          grn.items = updatedItems;
        }
      }
      
      if (needsUpdate) {
        grn.storeType = newStoreType;
        await grn.save();
        fixed++;
        updated.push({
          grnNumber: grn.grnNumber,
          oldStoreType: oldStoreType,
          newStoreType: newStoreType
        });
        console.log(`✅ Fixed GRN ${grn.grnNumber}: storeType "${oldStoreType}" -> "${newStoreType}"`);
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: `Fixed ${fixed} GRN(s) with correct store types`,
      data: {
        fixed,
        total: grns.length,
        updated
      }
    });
  } catch (error) {
    console.error('Error fixing store types:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ===== GRN APPROVAL ROUTES =====

// Approve GRN
router.post('/:id/approve', grnController.approveGRN);

// Reject GRN
router.post('/:id/reject', grnController.rejectGRN);

// ===== BULK OPERATIONS =====

// Bulk approve GRNs
router.post('/bulk/approve', async (req, res) => {
  try {
    const { grnIds, approvedBy } = req.body;
    
    if (!Array.isArray(grnIds) || grnIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'GRN IDs array is required'
      });
    }

    const results = [];
    for (const id of grnIds) {
      try {
        const grn = await require('../models/GoodsReceiptNote').findById(id);
        if (grn && grn.status !== 'Approved') {
          await grn.approve(approvedBy || 'System');
          results.push({ id, status: 'approved', grn });
        } else {
          results.push({ id, status: 'skipped', reason: 'Already approved or not found' });
        }
      } catch (error) {
        results.push({ id, status: 'error', error: error.message });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Bulk approval completed',
      results
    });

  } catch (error) {
    console.error('Error in bulk approval:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Bulk delete GRNs
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { grnIds } = req.body;
    
    if (!Array.isArray(grnIds) || grnIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'GRN IDs array is required'
      });
    }

    const results = [];
    for (const id of grnIds) {
      try {
        const grn = await require('../models/GoodsReceiptNote').findById(id);
        if (grn) {
          if (grn.status === 'Approved') {
            results.push({ id, status: 'skipped', reason: 'Cannot delete approved GRN' });
          } else {
            await require('../models/GoodsReceiptNote').findByIdAndDelete(id);
            results.push({ id, status: 'deleted' });
          }
        } else {
          results.push({ id, status: 'not_found' });
        }
      } catch (error) {
        results.push({ id, status: 'error', error: error.message });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Bulk deletion completed',
      results
    });

  } catch (error) {
    console.error('Error in bulk deletion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ===== REPORTING ROUTES =====

// Get GRNs by date range
router.get('/reports/date-range', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Start date and end date are required'
      });
    }

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (status) {
      query.status = status;
    }

    const grns = await require('../model/GoodsReceiptNote')
      .find(query)
      .sort({ createdAt: -1 });

    const summary = {
      totalGRNs: grns.length,
      totalValue: grns.reduce((sum, grn) => sum + grn.totalAmount, 0),
      totalQuantity: grns.reduce((sum, grn) => sum + grn.totalQuantity, 0),
      statusBreakdown: grns.reduce((acc, grn) => {
        acc[grn.status] = (acc[grn.status] || 0) + 1;
        return acc;
      }, {})
    };

    res.status(200).json({
      status: 'success',
      data: grns,
      summary
    });

  } catch (error) {
    console.error('Error fetching date range report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get supplier-wise GRN summary
router.get('/reports/supplier-summary', async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$supplier',
          totalGRNs: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          totalQuantity: { $sum: '$totalQuantity' },
          avgValue: { $avg: '$totalAmount' },
          statuses: { $push: '$status' }
        }
      },
      {
        $sort: { totalValue: -1 }
      }
    ];

    const summary = await require('../models/GoodsReceiptNote').aggregate(pipeline);

    res.status(200).json({
      status: 'success',
      data: summary
    });

  } catch (error) {
    console.error('Error fetching supplier summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('GRN Route Error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: error.message
  });
});

module.exports = router;