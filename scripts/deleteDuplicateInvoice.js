const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/HotelVirat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Invoice = require('../Restaurant/RestautantModel/RestaurantInvoiceModel');

async function deleteDuplicateInvoice() {
  try {
    console.log('🔍 Looking for invoice INV-0003...');
    
    const invoice = await Invoice.findOne({ invoiceNumber: 'INV-0003' });
    
    if (invoice) {
      console.log('📋 Found invoice:', invoice.invoiceNumber);
      await Invoice.deleteOne({ _id: invoice._id });
      console.log('✅ Deleted invoice INV-0003');
    } else {
      console.log('❌ Invoice INV-0003 not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteDuplicateInvoice();
