const InventoryDistribution = require('../model/InventoryDistribution');
const GoodsReceiptNote = require('../../model/GoodsReceiptNote');
const UnitConversion = require('../../model/UnitConversionModel');
const RawMaterial = require('../RestautantModel/RestaurantRawMaterialModel');

async function getConversionFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1;
  let conv = await UnitConversion.findOne({ fromUnit, toUnit });
  if (conv) return conv.factor;

  // Reverse conversion
  conv = await UnitConversion.findOne({ fromUnit: toUnit, toUnit: fromUnit });
  if (conv) return 1 / conv.factor;

  return null;
}
exports.createDistribution = async (req, res) => {
  try {
    const { productName, quantityDistributed, branch, storeLocation, distributionUnit } = req.body;

    // Determine the actual quantity to deduct from inventory (in base unit)
    let baseQuantityDeducted = quantityDistributed;

    // If a distribution unit is specified and differs from the raw material's base unit,
    // convert the distributed quantity to the base unit for deduction
    if (distributionUnit) {
      const rawMaterial = await RawMaterial.findOne({ name: productName });
      if (rawMaterial && rawMaterial.unit !== distributionUnit) {
        // Convert from distributionUnit to base unit
        // e.g., chef requests 100g, material is stored in kg → deduct 0.1 kg
        const factor = await getConversionFactor(rawMaterial.unit, distributionUnit);
        if (factor) {
          // factor = how many distributionUnits in 1 baseUnit (e.g., 1000 g per 1 kg)
          baseQuantityDeducted = quantityDistributed / factor;
          console.log(`🔄 Unit conversion: ${quantityDistributed} ${distributionUnit} = ${baseQuantityDeducted} ${rawMaterial.unit} (factor: ${factor})`);
        } else {
          return res.status(400).json({
            success: false,
            message: `No conversion found between ${rawMaterial.unit} and ${distributionUnit}. Please set up the conversion first.`,
          });
        }
      }
    }

    // Create distribution record with conversion info
    const distributionData = {
      ...req.body,
      baseQuantityDeducted,
      distributionUnit: distributionUnit || null,
    };
    const distribution = new InventoryDistribution(distributionData);
    await distribution.save();
    
    // Update GRN inventory - reduce available quantity and increase consumed quantity
    console.log(`🔍 Searching for GRNs with product: "${productName}", branch: "${branch}", storeLocation: "${storeLocation}"`);
    
    // Find GRN items that match the product and branch
    const grns = await GoodsReceiptNote.find({
      'items.product': productName,
      branch: branch,
    }).sort({ createdAt: 1 }); // FIFO - oldest first
    
    console.log(`📦 Found ${grns.length} GRNs matching criteria`);
    
    let remainingQtyToDistribute = baseQuantityDeducted; // Use converted quantity
    
    // Update GRN items (FIFO - First In First Out)
    for (const grn of grns) {
      if (remainingQtyToDistribute <= 0) break;
      
      let grnModified = false;
      
      for (const item of grn.items) {
        console.log(`  Checking item: product="${item.product}", storeType="${item.storeType}", available=${item.availableQuantity}`);
        
        if (item.product === productName && 
            item.storeType === storeLocation && 
            item.availableQuantity > 0 &&
            remainingQtyToDistribute > 0) {
          
          const qtyToDeduct = Math.min(item.availableQuantity, remainingQtyToDistribute);
          
          item.consumedQuantity = (item.consumedQuantity || 0) + qtyToDeduct;
          item.availableQuantity = (item.availableQuantity || 0) - qtyToDeduct;
          
          remainingQtyToDistribute -= qtyToDeduct;
          grnModified = true;
          
          console.log(`✅ Updated GRN ${grn.grnNumber}: Product="${item.product}", Consumed +${qtyToDeduct}, New Available: ${item.availableQuantity}`);
        }
      }
      
      if (grnModified) {
        await grn.save();
        console.log(`💾 Saved GRN ${grn.grnNumber}`);
      }
    }
    
    if (remainingQtyToDistribute > 0) {
      console.warn(`⚠️ Warning: Could not distribute full quantity. Remaining: ${remainingQtyToDistribute}`);
    } else {
      console.log(`✅ Successfully distributed ${quantityDistributed} ${distributionUnit || 'units'} (${baseQuantityDeducted} in base unit)`);
    }

    // Also deduct from LocationInventory (keeps department distribution system in sync)
    try {
      const { LocationInventory } = require('../../model/inventoryModel');
      const StoreLocationModel = require('../RestautantModel/RestaurantStoreLocationModel');
      const storeDoc = await StoreLocationModel.findOne({ name: storeLocation });
      const matDoc = await RawMaterial.findOne({ name: productName });
      if (storeDoc && matDoc) {
        const locInv = await LocationInventory.findOne({
          locationId: storeDoc._id,
          rawMaterialId: matDoc._id,
        });
        if (locInv && locInv.quantity >= baseQuantityDeducted) {
          locInv.quantity -= baseQuantityDeducted;
          locInv.lastUpdated = new Date();
          await locInv.save();
          console.log(`📦 LocationInventory also deducted: ${productName} -${baseQuantityDeducted} from ${storeLocation} (now ${locInv.quantity})`);
        } else {
          console.warn(`⚠️ LocationInventory: no record or insufficient qty for ${productName} in ${storeLocation}`);
        }
      } else {
        console.warn(`⚠️ Direct dist sync: storeDoc=${!!storeDoc} matDoc=${!!matDoc} for "${storeLocation}" / "${productName}"`);
      }
    } catch (syncErr) {
      console.warn('⚠️ LocationInventory sync in direct distribution:', syncErr.message);
    }
    
    res.status(201).json({
      success: true,
      message: 'Distribution created successfully and inventory updated',
      data: distribution,
    });
  } catch (error) {
    console.error('Error creating distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating distribution',
      error: error.message,
    });
  }
};
exports.getAllDistributions = async (req, res) => {
  try {
    const distributions = await InventoryDistribution.find()
      .sort({ distributionDate: -1 });
    
    res.status(200).json({
      success: true,
      data: distributions,
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching distributions',
      error: error.message,
    });
  }
};
exports.getDistributionsByProduct = async (req, res) => {
  try {
    const { productName } = req.params;
    const distributions = await InventoryDistribution.find({ productName })
      .sort({ distributionDate: -1 });
    
    res.status(200).json({
      success: true,
      data: distributions,
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching distributions',
      error: error.message,
    });
  }
};
exports.deleteDistribution = async (req, res) => {
  try {
    const { id } = req.params;
    await InventoryDistribution.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Distribution deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting distribution',
      error: error.message,
    });
  }
};
