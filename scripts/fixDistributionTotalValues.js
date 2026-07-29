const mongoose = require('mongoose');
const InventoryDistribution = require('../Restaurant/model/InventoryDistribution');
const GoodsReceiptNote = require('../model/GoodsReceiptNote');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hotel_crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixDistributionTotalValues() {
  try {
    console.log('🔧 Starting to fix distribution total values...');
    
    // Get all distributions
    const distributions = await InventoryDistribution.find({});
    console.log(`📦 Found ${distributions.length} distributions to process`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const dist of distributions) {
      // Skip if already has totalValue
      if (dist.totalValue && dist.totalValue > 0) {
        console.log(`⏭️  Skipping ${dist._id} - already has totalValue: ₹${dist.totalValue}`);
        skipped++;
        continue;
      }
      
      // Find the GRN for this product, branch, and store location
      const grn = await GoodsReceiptNote.findOne({
        'items.product': dist.productName,
        branch: dist.branch,
      }).sort({ createdAt: -1 }); // Get the most recent GRN
      
      if (!grn) {
        console.warn(`⚠️  No GRN found for product: ${dist.productName}, branch: ${dist.branch}`);
        continue;
      }
      
      // Find the item in the GRN
      const item = grn.items.find(i => 
        i.product === dist.productName && 
        i.storeType === dist.storeLocation
      );
      
      if (!item) {
        console.warn(`⚠️  Item not found in GRN for product: ${dist.productName}, store: ${dist.storeLocation}`);
        continue;
      }
      
      // Calculate total value
      const pricePerUnit = item.rate || 0;
      const taxRate = grn.taxRate || 0;
      const subtotal = dist.quantityDistributed * pricePerUnit;
      const taxAmount = subtotal * (taxRate / 100);
      const totalValue = subtotal + taxAmount;
      
      // Update distribution
      dist.pricePerUnit = pricePerUnit;
      dist.taxRate = taxRate;
      dist.totalValue = totalValue;
      
      await dist.save();
      
      console.log(`✅ Fixed ${dist._id}:`);
      console.log(`   Product: ${dist.productName}`);
      console.log(`   Quantity: ${dist.quantityDistributed}`);
      console.log(`   Price: ₹${pricePerUnit}`);
      console.log(`   Tax Rate: ${taxRate}%`);
      console.log(`   Total Value: ₹${totalValue.toFixed(2)}`);
      
      fixed++;
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total: ${distributions.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing distributions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
fixDistributionTotalValues();
