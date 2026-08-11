// controllers/goodReceiptNotesController.js
const GoodsReceiptNote = require('../../model/GoodsReceiptNote');
const Inventory = require('../../model/inventoryModel');
const PurchaseOrder = require('../../model/purchaseOrder');
const RestaurantPurchaseOrder = require('../RestautantModel/RestaurantPurchaseModel');
const mongoose = require('mongoose');

class GRNController {
  // Create new GRN
  async createGRN(req, res) {
    // Declare variables outside try block so they're accessible in catch block
    let isManualEntry;
    let finalGRNNumber;
    
    try {
      console.log('🔍 Received GRN creation request');
      console.log('📦 Request body keys:', Object.keys(req.body));
      console.log('📝 poNumber in request:', req.body.poNumber);
      
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
        poNumber, // PO Number for display
        storeType,
        storeLocationId, // Store location ObjectId
        receivedBy,
        createdBy,
        isManualEntry: isManualEntryFromBody // Flag to indicate manual entry (no GRN number needed)
      } = req.body;
      
      console.log('✅ Extracted poNumber:', poNumber);
      
      // Assign to outer scope variable
      isManualEntry = isManualEntryFromBody;

      // Validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Items array is required and must not be empty'
        });
      }

      // Allow multiple GRNs per PO for partial deliveries
      // Duplicate check removed to support multiple shipments for the same PO
      if (poId && !isManualEntry) {
        const existingGRNs = await GoodsReceiptNote.find({ poId: poId });
        if (existingGRNs.length > 0) {
          console.log(`ℹ️ Found ${existingGRNs.length} existing GRN(s) for PO ${poId}. Creating additional GRN for partial delivery.`);
        }
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

      // Process items to calculate availableQuantity (acceptedQty = receivedQty - rejectedQty)
      const processedItems = items.map(item => {
        const receivedQty = item.receivedQty || item.quantity || 0;
        const rejectedQty = item.rejectedQty || 0;
        const acceptedQty = item.acceptedQty || (receivedQty - rejectedQty);
        
        return {
          ...item,
          receivedQty,
          rejectedQty,
          acceptedQty,
          availableQuantity: acceptedQty, // Only accepted items go to inventory
          consumedQuantity: 0
        };
      });
      
      console.log('📊 Processed items with availableQuantity:', processedItems.map(i => ({
        product: i.product,
        receivedQty: i.receivedQty,
        rejectedQty: i.rejectedQty,
        acceptedQty: i.acceptedQty,
        availableQuantity: i.availableQuantity
      })));

      // Create GRN object
      console.log('📝 Creating GRN with poNumber:', poNumber);
      const grnData = {
        grnNumber: finalGRNNumber,
        supplier: supplier || supplierId,
        branch: branch || branchId,
        items: processedItems,
        totalQuantity,
        taxRate: req.body.taxRate || 0,
        totalTax,
        totalAmount,
        status: status || 'Pending',
        notes: notes || '',
        supplierId,
        branchId,
        // Only include poId if it's not undefined (omit for manual entries to avoid unique index violation)
        ...(poIdObjectId !== undefined && { poId: poIdObjectId }),
        ...(poNumber && { poNumber: poNumber }), // Include poNumber if provided
        storeType: storeType || 'Main Store', // Use provided storeType or default to 'Main Store'
        receivedBy: receivedBy || 'System User',
        createdBy: createdBy || 'System'
      };
      console.log('📦 GRN Data includes poNumber?', 'poNumber' in grnData, grnData.poNumber);

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

      // NEW: Update Purchase Order if poId is provided
      let poUpdateResult = null;
      if (poIdObjectId) {
        try {
          const po = await RestaurantPurchaseOrder.findById(poIdObjectId);
          if (po) {
            // Update received quantities for each item
            items.forEach(grnItem => {
              const poItem = po.items.find(item => 
                item.name?.toString() === grnItem.product || 
                item._id?.toString() === grnItem.productId
              );
              
              if (poItem) {
                const receivedQty = grnItem.receivedQty || grnItem.quantity || 0;
                poItem.receivedQty = (poItem.receivedQty || 0) + receivedQty;
                
                // Ensure received qty doesn't exceed ordered qty
                if (poItem.receivedQty > poItem.quantity) {
                  poItem.receivedQty = poItem.quantity;
                }
              }
            });
            
            // Update PO delivery status
            if (po.updateDeliveryStatus) {
              po.updateDeliveryStatus();
            }
            
            // Add GRN reference to PO
            if (!po.grns) po.grns = [];
            if (!po.grns.includes(grn._id)) {
              po.grns.push(grn._id);
            }
            
            // Update GRN flag
            po.grnGenerated = true;
            po.grnDate = new Date();
            
            await po.save();
            
            poUpdateResult = {
              deliveryStatus: po.deliveryStatus,
              deliveryPercentage: po.deliveryPercentage,
              grnGenerated: po.grnGenerated
            };
            
            console.log('✅ Purchase Order updated with GRN:', {
              poId: po._id,
              deliveryStatus: po.deliveryStatus,
              deliveryPercentage: po.deliveryPercentage
            });
          }
        } catch (poError) {
          console.error('⚠️ Error updating Purchase Order:', poError);
          // Don't fail the GRN creation if PO update fails
        }
      }

      // Sync to LocationInventory when GRN status is "Received" or "Approved"
      // This enables department-wise distribution from the Store Inventory system
      const grnStatus = (grnData.status || '').toLowerCase();
      if (grnStatus === 'received' || grnStatus === 'approved') {
        try {
          const RawMaterial = require('../RestautantModel/RestaurantRawMaterialModel');
          const { LocationInventory, StockTransaction } = Inventory;
          const syncStoreLocationId = storeLocationId || grnData.storeLocationId || grnData.storeLocation?.id;

          if (syncStoreLocationId) {
            for (const item of (grnData.items || [])) {
              const acceptedQty = Number(item.acceptedQty || item.receivedQty || item.quantity || 0);
              if (acceptedQty <= 0) continue;

              // Find the raw material by name
              const rawMaterial = await RawMaterial.findOne({ name: item.product });
              if (!rawMaterial) {
                console.warn(`⚠️ LocationInventory sync: Raw material "${item.product}" not found, skipping`);
                continue;
              }

              // Find or create LocationInventory record
              let locInv = await LocationInventory.findOne({
                locationId: syncStoreLocationId,
                rawMaterialId: rawMaterial._id,
              });

              if (locInv) {
                locInv.quantity += acceptedQty;
                locInv.costPrice = item.rate || locInv.costPrice;
                locInv.lastUpdated = new Date();
                await locInv.save();
              } else {
                locInv = new LocationInventory({
                  locationId: syncStoreLocationId,
                  rawMaterialId: rawMaterial._id,
                  quantity: acceptedQty,
                  costPrice: item.rate || 0,
                  lastUpdated: new Date(),
                });
                await locInv.save();
              }

              // Create inward stock transaction
              const transaction = new StockTransaction({
                type: 'inward',
                locationId: syncStoreLocationId,
                rawMaterialId: rawMaterial._id,
                quantity: acceptedQty,
                costPrice: item.rate || 0,
                reference: finalGRNNumber || grn.grnNumber,
                source: 'GRN Received',
                notes: `From GRN ${finalGRNNumber || grn.grnNumber}, Supplier: ${grnData.supplier || ''}`,
              });
              await transaction.save();

              console.log(`📦 LocationInventory synced: ${item.product} +${acceptedQty} → Store ${syncStoreLocationId}`);
            }
          } else {
            console.warn('⚠️ LocationInventory sync skipped: no storeLocationId on GRN');
          }
        } catch (syncError) {
          console.error('⚠️ LocationInventory sync error (GRN still created):', syncError.message);
          // Don't fail GRN creation if sync fails
        }
      }
      res.status(201).json({
        status: 'success',
        message: 'GRN created successfully',
        data: grn,
        ...(poUpdateResult && { poUpdate: poUpdateResult })
      });

    } catch (error) {
      console.error('Error creating GRN:', error);
      console.error('Error details:', {
        name: error.name,
        code: error.code,
        message: error.message,
        isManualEntry: isManualEntry,
        grnNumber: finalGRNNumber
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
        if (isManualEntry) {
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
        .populate('poId', 'storeLocation storeType storeLocationId purchaseOrderId')
        .sort(options.sort)
        .limit(options.limit * 1)
        .skip((options.page - 1) * options.limit);
      
      // Ensure storeType and poNumber are set from PO
      const enrichedGRNs = grns.map(grn => {
        const grnObj = grn.toObject ? grn.toObject() : grn;
        
        // If GRN has poId populated, extract PO details
        if (grn.poId) {
          const poStoreLocation = typeof grn.poId.storeLocation === 'object' 
            ? grn.poId.storeLocation.name 
            : grn.poId.storeLocation;
          const poStoreType = grn.poId.storeType || poStoreLocation;
          
          // Set poNumber from PO
          if (grn.poId.purchaseOrderId && !grnObj.poNumber) {
            grnObj.poNumber = grn.poId.purchaseOrderId;
          }
          
          // Only update storeType if GRN doesn't have it or it's the default "Main Store"
          if (!grn.storeType || grn.storeType === 'Main Store') {
            if (poStoreType && poStoreType !== 'Main Store') {
              grnObj.storeType = poStoreType;
            }
          }
        }
        return grnObj;
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

      // Process items to calculate availableQuantity (acceptedQty = receivedQty - rejectedQty)
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
        
        // Process each item to ensure correct quantities
        updateData.items = updateData.items.map(item => {
          const receivedQty = item.receivedQty || item.quantity || 0;
          const rejectedQty = item.rejectedQty || 0;
          const acceptedQty = item.acceptedQty || (receivedQty - rejectedQty);
          
          if (!item.storeType || item.storeType === 'Main Store') {
            item.storeType = grnStoreType;
          }
          
          return {
            ...item,
            receivedQty,
            rejectedQty,
            acceptedQty,
            availableQuantity: acceptedQty,
            consumedQuantity: item.consumedQuantity || 0
          };
        });
        
        // Also ensure GRN's storeType is set
        if (!updateData.storeType || updateData.storeType === 'Main Store') {
          updateData.storeType = grnStoreType;
        }
        
        console.log('🔄 Updating GRN items with processed quantities:', {
          grnStoreType,
          itemsCount: updateData.items.length,
          items: updateData.items.map(i => ({
            product: i.product,
            receivedQty: i.receivedQty,
            rejectedQty: i.rejectedQty,
            acceptedQty: i.acceptedQty,
            availableQuantity: i.availableQuantity
          }))
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

      // Update Purchase Order delivery status if items were updated
      let poUpdateResult = null;
      if (updatedGRN.poId && updateData.items) {
        try {
          const po = await RestaurantPurchaseOrder.findById(updatedGRN.poId);
          if (po) {
            // Recalculate received quantities from all GRNs for this PO
            const allGRNs = await GoodsReceiptNote.find({ poId: po._id });
            
            // Reset received quantities
            po.items.forEach(poItem => {
              poItem.receivedQty = 0;
            });
            
            // Sum up received quantities from all GRNs
            allGRNs.forEach(grnDoc => {
              grnDoc.items.forEach(grnItem => {
                const poItem = po.items.find(item => 
                  item.name?.toString() === grnItem.product || 
                  item._id?.toString() === grnItem.productId
                );
                
                if (poItem) {
                  const receivedQty = grnItem.receivedQty || grnItem.acceptedQty || grnItem.quantity || 0;
                  poItem.receivedQty = (poItem.receivedQty || 0) + receivedQty;
                  
                  // Ensure received qty doesn't exceed ordered qty
                  if (poItem.receivedQty > poItem.quantity) {
                    poItem.receivedQty = poItem.quantity;
                  }
                }
              });
            });
            
            // Update PO delivery status
            if (po.updateDeliveryStatus) {
              po.updateDeliveryStatus();
            }
            
            await po.save();
            
            poUpdateResult = {
              deliveryStatus: po.deliveryStatus,
              deliveryPercentage: po.deliveryPercentage
            };
            
            console.log('✅ Purchase Order delivery status updated:', {
              poId: po._id,
              deliveryStatus: po.deliveryStatus,
              deliveryPercentage: po.deliveryPercentage
            });
          }
        } catch (poError) {
          console.error('⚠️ Error updating Purchase Order:', poError);
          // Don't fail the GRN update if PO update fails
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'GRN updated successfully',
        data: updatedGRN,
        ...(poUpdateResult && { poUpdate: poUpdateResult })
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

      // Prevent deletion of approved GRNs unless force=true query param is set
      if (grn.status === 'Approved' && req.query.force !== 'true') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot delete approved GRN. Add ?force=true to override.'
        });
      }

      // Reverse LocationInventory before deleting
      if (grn.storeType) {
        try {
          const RawMaterial = require('../RestautantModel/RestaurantRawMaterialModel');
          const { LocationInventory } = Inventory;
          const StoreLocationModel = require('../../model/storeLocationModel');
          const storeDoc = await StoreLocationModel.findOne({ name: grn.storeType });

          if (storeDoc) {
            for (const item of (grn.items || [])) {
              const acceptedQty = Number(item.acceptedQty || item.receivedQty || item.quantity || 0);
              if (acceptedQty <= 0) continue;

              const rawMaterial = await RawMaterial.findOne({ name: item.product });
              if (!rawMaterial) continue;

              const locInv = await LocationInventory.findOne({
                locationId: storeDoc._id,
                rawMaterialId: rawMaterial._id,
              });

              if (locInv) {
                locInv.quantity = Math.max(0, locInv.quantity - acceptedQty);
                locInv.lastUpdated = new Date();
                await locInv.save();
                console.log(`📦 LocationInventory reversed: ${item.product} -${acceptedQty} from store ${grn.storeType}`);
              }
            }
          } else {
            console.warn(`⚠️ Store "${grn.storeType}" not found in StoreLocation collection, cannot reverse`);
          }
        } catch (syncErr) {
          console.error('⚠️ LocationInventory reversal error:', syncErr.message);
        }
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