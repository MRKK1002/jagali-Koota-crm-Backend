const mongoose = require('mongoose');
const UOM = require('../model/resUOMmodel');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the main app
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your-database-name';

mongoose.connect(MONGO_URI);

const defaultUOMs = [
  { label: 'Kilogram', unit: 'kg' },
  { label: 'Gram', unit: 'g' },
  { label: 'Liter', unit: 'l' },
  { label: 'Milliliter', unit: 'ml' },
  { label: 'Pieces', unit: 'pcs' },
  { label: 'Dozen', unit: 'doz' },
  { label: 'Packet', unit: 'pkt' },
  { label: 'Box', unit: 'box' },
  { label: 'Bottle', unit: 'btl' },
  { label: 'Can', unit: 'can' },
  { label: 'Bag', unit: 'bag' },
  { label: 'Sack', unit: 'sack' },
  { label: 'Carton', unit: 'ctn' },
  { label: 'Bundle', unit: 'bdl' },
  { label: 'Roll', unit: 'roll' },
  { label: 'Meter', unit: 'm' },
  { label: 'Centimeter', unit: 'cm' },
  { label: 'Inch', unit: 'inch' },
  { label: 'Foot', unit: 'ft' },
  { label: 'Pound', unit: 'lb' },
  { label: 'Ounce', unit: 'oz' },
  { label: 'Gallon', unit: 'gal' },
  { label: 'Quart', unit: 'qt' },
  { label: 'Pint', unit: 'pt' },
  { label: 'Cup', unit: 'cup' },
  { label: 'Tablespoon', unit: 'tbsp' },
  { label: 'Teaspoon', unit: 'tsp' }
];

const seedUOMs = async () => {
  try {
    console.log('🌱 Starting UOM seeding...');
    
    // Check if UOMs already exist
    const existingUOMs = await UOM.find();
    if (existingUOMs.length > 0) {
      console.log(`✅ Found ${existingUOMs.length} existing UOMs. Skipping seed.`);
      process.exit(0);
    }

    // Insert default UOMs
    const result = await UOM.insertMany(defaultUOMs);
    console.log(`✅ Successfully seeded ${result.length} UOMs:`);
    
    result.forEach(uom => {
      console.log(`   - ${uom.label} (${uom.unit})`);
    });

    console.log('🎉 UOM seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding UOMs:', error);
    process.exit(1);
  }
};

// Run the seeding
seedUOMs();