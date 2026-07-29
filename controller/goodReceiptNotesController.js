// controllers/goodReceiptNotesController.js
const GoodsReceiptNote = require('../model/GoodsReceiptNote');
const Inventory = require('../construction/models/Inventory');
const PurchaseOrder = require('../model/purchaseOrder');
const mongoose = require('mongoose');

class GRNController {
  // Create new GRN
  async createGRN(req, res) {
    try {
      const {
        grnNumber,
        supplier,
        branch,
        items,
        totalQuantity,
        totalTax,
        totalAmount,
        status,
        notes,
        supplierId,
        branchId,
        poId,
        storeType,
        receivedBy,
        createdBy,
        isManualEntry // Flag to indicate manual entry (no GRN number needed)
      } = req.body;

      // Validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Items array is required and must not be empty'
        });
      }

      // Generate GRN number if not provided and it's not a manual entry
      let finalGRNNumber = grnNumber;
      if (!finalGRNNumber && !isManualEntry) {
        finalGRNNumber = await GoodsReceiptNote.generateGRNNumber();
      } else if (isManualEntry) {
        // For manual entries, use MongoDB ObjectId directly for guaranteed uniqueness
        // ObjectId is guaranteed to be unique and won't conflict
        // Add retry mechanism as extra safety
        let attempts = 0;
        const maxAttempts = 5;
        let unique = false;
        
        while (!unique && attempts < maxAttempts) {
          attempts++;
          const objectId = new mongoose.Types.ObjectId();
          const candidateGRN = `MANUAL-${objectId.toString()}`;
          
          // Double-check uniqueness in database (extra safety)
          const existing = await GoodsReceiptNote.findOne({ grnNumber: candidateGRN });
          if (!existing) {
            finalGRNNumber = candidateGRN;
            unique = true;
            console.log(`✅ Generated unique manual GRN number using ObjectId (attempt ${attempts}): ${finalGRNNumber}`);
          } else {
            console.warn(`⚠️ Extremely rare ObjectId collision detected (attempt ${attempts}), generating new ObjectId...`);
            // Wait a tiny bit to ensure different timestamp component in ObjectId
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
        
        if (!unique) {
          // Last resort: use timestamp + ObjectId combination
          const timestamp = Date.now();
          const objectId = new mongoose.Types.ObjectId();
          finalGRNNumber = `MANUAL-${timestamp}-${objectId.toString()}`;
          console.log(`✅ Using timestamp+ObjectId combination: ${finalGRNNumber}`);
        }
      }

      // Convert poId to ObjectId if provided
      // For manual entries, don't set poId to avoid unique constraint violations
      let poIdObjectId = undefined; // Use undefined instead of null for manual entries
      if (poId && !isManualEntry) {
        if (mongoose.Types.ObjectId.isValid(poId)) {
          poIdObjectId = new mongoose.Types.ObjectId(poId);
        } else {
          console.warn(`Invalid poId format: ${poId}`);
        }
      } else if (isManualEntry) {
        // For manual entries, explicitly set to undefined to avoid unique index violation
        poIdObjectId = undefined;
      }

      // Log storeType for debugging
      console.log('🔍 Creating GRN with storeType:', {
        storeType: storeType || 'Main Store',
        poId: poIdObjectId,
        branch: branch || branchId,
        supplier: supplier || supplierId
      });

      // Create GRN object
      const grnData = {
        grnNumber: finalGRNNumber,
        supplier: supplier || supplierId,
        branch: branch || branchId,
        items,
        totalQuantity,
        totalTax,
        totalAmount,
        status: status || 'Pending',
        notes: notes || '',
        supplierId,
        branchId,
        // Only include poId if it's not undefined (omit for manual entries to avoid unique index violation)
        ...(poIdObjectId !== undefined && { poId: poIdObjectId }),
        storeType: storeType || 'Main Store', // Use provided storeType or default to 'Main Store'
        receivedBy: receivedBy || 'System User',
        createdBy: createdBy || 'System'
      };

      // Final uniqueness check before saving (extra safety for manual entries)
      if (isManualEntry) {
        const existingGRN = await GoodsReceiptNote.findOne({ grnNumber: finalGRNNumber });
        if (existingGRN) {
          console.error(`❌ CRITICAL: GRN number ${finalGRNNumber} already exists in database!`);
          // Generate a new one with timestamp prefix
          const timestamp = Date.now();
          const objectId = new mongoose.Types.ObjectId();
          finalGRNNumber = `MANUAL-${timestamp}-${objectId.toString()}`;
          grnData.grnNumber = finalGRNNumber;
          console.log(`✅ Regenerated GRN number: ${finalGRNNumber}`);
        }
      }

      const grn = new GoodsReceiptNote(grnData);
      await grn.save();

      res.status(201).json({
        status: 'success',
        message: 'GRN created successfully',
        data: grn
      });

    } catch (error) {
      // Capture isManualEntry before it goes out of scope
      const wasManualEntry = isManualEntry;
      const capturedGRNNumber = finalGRNNumber;
      
      console.error('Error creating GRN:', error);
      console.error('Error details:', {
        name: error.name,
        code: error.code,
        message: error.message,
        isManualEntry: wasManualEntry,
        grnNumber: capturedGRNNumber
      });
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          status: 'error',
          message: error.message,
          errors: error.errors
        });
      }
      
      if (error.code === 11000) {
        // If it's a manual entry and we still get a duplicate key error, try one more time
        if (wasManualEntry) {
          console.warn('⚠️ Duplicate key error for manual entry, attempting recovery...');
          try {
            const timestamp = Date.now();
            const objectId = new mongoose.Types.ObjectId();
            const recoveryGRNNumber = `MANUAL-${timestamp}-${objectId.toString()}`;
            // Create new grnData without poId for recovery
            const recoveryGRNData = {
              ...grnData,
              grnNumber: recoveryGRNNumber
            };
            // Remove poId if it exists to avoid unique index violation
            delete recoveryGRNData.poId;
            const recoveryGRN = new GoodsReceiptNote(recoveryGRNData);
            await recoveryGRN.save();
            console.log(`✅ Recovery successful with GRN: ${recoveryGRNNumber}`);
            return res.status(201).json({
              status: 'success',
              message: 'GRN created successfully (recovered from collision)',
              data: recoveryGRN
            });
          } catch (recoveryError) {
            console.error('❌ Recovery attempt failed:', recoveryError);
          }
        }
        
        return res.status(400).json({
          status: 'error',
          message: 'GRN number already exists'
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get all GRNs with pagination and filtering
  async getAllGRNs(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        supplier,
        branch,
        startDate,
        endDate,
        search
      } = req.query;

      // Build query
      const query = {};
      
      if (status) query.status = status;
      if (supplier) query.supplier = new RegExp(supplier, 'i');
      if (branch) query.branch = new RegExp(branch, 'i');
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      
      if (search) {
        query.$or = [
          { grnNumber: new RegExp(search, 'i') },
          { supplier: new RegExp(search, 'i') },
          { branch: new RegExp(search, 'i') },
          { notes: new RegExp(search, 'i') }
        ];
      }

      // Execute query with pagination
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
      };

      const grns = await GoodsReceiptNote.find(query)
        .populate('poId', 'storeLocation storeType storeLocationId')
        .sort(options.sort)
        .limit(options.limit * 1)
        .skip((options.page - 1) * options.limit);
      
      // Ensure storeType is set from PO if GRN doesn't have it or it's "Main Store"
      const enrichedGRNs = grns.map(grn => {
        // If GRN has poId populated and storeLocation, use it to set storeType
        if (grn.poId && grn.poId.storeLocation) {
          const poStoreLocation = typeof grn.poId.storeLocation === 'object' 
            ? grn.poId.storeLocation.name 
            : grn.poId.storeLocation;
          const poStoreType = grn.poId.storeType || poStoreLocation;
          
          // Only update if GRN doesn't have storeType or it's the default "Main Store"
          if (!grn.storeType || grn.storeType === 'Main Store') {
            if (poStoreType && poStoreType !== 'Main Store') {
              grn.storeType = poStoreType;
            }
          }
        }
        return grn;
      });

      const total = await GoodsReceiptNote.countDocuments(query);

      res.status(200).json({
        status: 'success',
        data: enrichedGRNs,
        pagination: {
          currentPage: options.page,
          totalPages: Math.ceil(total / options.limit),
          totalItems: total,
          itemsPerPage: options.limit
        }
      });

    } catch (error) {
      console.error('Error fetching GRNs:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get single GRN by ID
  async getGRNById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid GRN ID'
        });
      }

      const grn = await GoodsReceiptNote.findById(id)
        .populate('poId', 'storeLocation storeType storeLocationId');

      if (!grn) {
        return res.status(404).json({
          status: 'error',
          message: 'GRN not found'
        });
      }

      // Ensure storeType is set from PO if GRN doesn't have it or it's "Main Store"
      if (grn.poId && grn.poId.storeLocation) {
        const poStoreLocation = typeof grn.poId.storeLocation === 'object' 
          ? grn.poId.storeLocation.name 
          : grn.poId.storeLocation;
        const poStoreType = grn.poId.storeType || poStoreLocation;
        
        // Only update if GRN doesn't have storeType or it's the default "Main Store"
        if (!grn.storeType || grn.storeType === 'Main Store') {
          if (poStoreType && poStoreType !== 'Main Store') {
            grn.storeType = poStoreType;
          }
        }
      }

      res.status(200).json({
        status: 'success',
        data: grn
      });

    } catch (error) {
      console.error('Error fetching GRN:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get GRN by GRN Number
  async getGRNByNumber(req, res) {
    try {
      const { grnNumber } = req.params;

      const grn = await GoodsReceiptNote.findOne({ grnNumber })
        .populate('poId', 'storeLocation storeType storeLocationId');

      if (!grn) {
        return res.status(404).json({
          status: 'error',
          message: 'GRN not found'
        });
      }

      // Ensure storeType is set from PO if GRN doesn't have it or it's "Main Store"
      if (grn.poId && grn.poId.storeLocation) {
        const poStoreLocation = typeof grn.poId.storeLocation === 'object' 
          ? grn.poId.storeLocation.name 
          : grn.poId.storeLocation;
        const poStoreType = grn.poId.storeType || poStoreLocation;
        
        // Only update if GRN doesn't have storeType or it's the default "Main Store"
        if (!grn.storeType || grn.storeType === 'Main Store') {
          if (poStoreType && poStoreType !== 'Main Store') {
            grn.storeType = poStoreType;
          }
        }
      }

      res.status(200).json({
        status: 'success',
        data: grn
      });

    } catch (error) {
      console.error('Error fetching GRN:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Update GRN
  async updateGRN(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid GRN ID'
        });
      }

      // Don't allow updating of certain fields after approval
      const grn = await GoodsReceiptNote.findById(id).populate('poId', 'storeLocation storeType storeLocationId');
      if (grn && grn.status === 'Approved') {
        const restrictedFields = ['items', 'totalQuantity', 'totalTax', 'totalAmount'];
        const hasRestrictedUpdates = restrictedFields.some(field => updateData.hasOwnProperty(field));
        
        if (hasRestrictedUpdates) {
          return res.status(400).json({
            status: 'error',
            message: 'Cannot modify financial details of approved GRN'
          });
        }
      }

      // Ensure storeType is preserved or set from PO if updating items
      if (updateData.items && Array.isArray(updateData.items)) {
        // Get GRN's storeType (from existing GRN or PO)
        let grnStoreType = updateData.storeType || grn?.storeType || 'Main Store';
        
        // If GRN has poId, get storeType from PO
        if (grn?.poId && grn.poId.storeLocation) {
          const poStoreLocation = typeof grn.poId.storeLocation === 'object' 
            ? grn.poId.storeLocation.name 
            : grn.poId.storeLocation;
          const poStoreType = grn.poId.storeType || poStoreLocation;
          if (poStoreType && poStoreType !== 'Main Store') {
            grnStoreType = poStoreType;
          }
        }
        
        // Ensure each item has storeType
        updateData.items = updateData.items.map(item => {
          if (!item.storeType || item.storeType === 'Main Store') {
            item.storeType = grnStoreType;
          }
          return item;
        });
        
        // Also ensure GRN's storeType is set
        if (!updateData.storeType || updateData.storeType === 'Main Store') {
          updateData.storeType = grnStoreType;
        }
        
        console.log('🔄 Updating GRN items with storeType:', {
          grnStoreType,
          itemsCount: updateData.items.length,
          itemsStoreTypes: updateData.items.map(i => i.storeType)
        });
      }

      const updatedGRN = await GoodsReceiptNote.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('poId', 'storeLocation storeType storeLocationId');
      
      // Ensure storeType is set from PO if GRN doesn't have it or it's "Main Store"
      if (updatedGRN.poId && updatedGRN.poId.storeLocation) {
        const poStoreLocation = typeof updatedGRN.poId.storeLocation === 'object' 
          ? updatedGRN.poId.storeLocation.name 
          : updatedGRN.poId.storeLocation;
        const poStoreType = updatedGRN.poId.storeType || poStoreLocation;
        
        // Only update if GRN doesn't have storeType or it's the default "Main Store"
        if (!updatedGRN.storeType || updatedGRN.storeType === 'Main Store') {
          if (poStoreType && poStoreType !== 'Main Store') {
            updatedGRN.storeType = poStoreType;
            await updatedGRN.save();
          }
        }
      }

      if (!updatedGRN) {
        return res.status(404).json({
          status: 'error',
          message: 'GRN not found'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'GRN updated successfully',
        data: updatedGRN
      });

    } catch (error) {
      console.error('Error updating GRN:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          status: 'error',
          message: error.message,
          errors: error.errors
        });
      }

      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Approve GRN
  async approveGRN(req, res) {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid GRN ID'
        });
      }

      const grn = await GoodsReceiptNote.findById(id);

      if (!grn) {
        return res.status(404).json({
          status: 'error',
          message: 'GRN not found'
        });
      }

      if (grn.status === 'Approved') {
        return res.status(400).json({
          status: 'error',
          message: 'GRN is already approved'
        });
      }

      await grn.approve(approvedBy || 'System');

      res.status(200).json({
        status: 'success',
        message: 'GRN approved successfully',
        data: grn
      });

    } catch (error) {
      console.error('Error approving GRN:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Reject GRN
  async rejectGRN(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason, rejectedBy } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid GRN ID'
        });
      }

      const grn = await GoodsReceiptNote.findById(id);

      if (!grn) {
        return res.status(404).json({
          status: 'error',
          message: 'GRN not found'
        });
      }

      if (grn.status === 'Rejected') {
        return res.status(400).json({
          status: 'error',
          message: 'GRN is already rejected'
        });
      }

      await grn.reject(rejectionReason || 'No reason provided', rejectedBy || 'System');

      res.status(200).json({
        status: 'success',
        message: 'GRN rejected successfully',
        data: grn
      });

    } catch (error) {
      console.error('Error rejecting GRN:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Delete GRN
  async deleteGRN(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid GRN ID'
        });
      }

      const grn = await GoodsReceiptNote.findById(id);

      if (!grn) {
        return res.status(404).json({
          status: 'error',
          message: 'GRN not found'
        });
      }

      // Prevent deletion of approved GRNs
      if (grn.status === 'Approved') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete approved GRN'
        });
      }

      await GoodsReceiptNote.findByIdAndDelete(id);

      res.status(200).json({
        status: 'success',
        message: 'GRN deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting GRN:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get GRN statistics
  async getGRNStats(req, res) {
    try {
      const [
        totalGRNs,
        pendingGRNs,
        approvedGRNs,
        rejectedGRNs,
        totalValue
      ] = await Promise.all([
        GoodsReceiptNote.countDocuments(),
        GoodsReceiptNote.countDocuments({ status: 'Pending' }),
        GoodsReceiptNote.countDocuments({ status: 'Approved' }),
        GoodsReceiptNote.countDocuments({ status: 'Rejected' }),
        GoodsReceiptNote.aggregate([
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      ]);

      const stats = {
        totalGRNs,
        pendingGRNs,
        approvedGRNs,
        rejectedGRNs,
        totalValue: totalValue[0]?.total || 0
      };

      res.status(200).json({
        status: 'success',
        data: stats
      });

    } catch (error) {
      console.error('Error fetching GRN stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new GRNController();