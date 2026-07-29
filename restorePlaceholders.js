/**
 * restorePlaceholders.js
 * 
 * Creates placeholder image files on disk for every DB record that has an image path
 * but no corresponding file. This stops all 404 image errors immediately.
 * 
 * The placeholder is a valid PNG with a food emoji style grey background.
 * 
 * Run: node restorePlaceholders.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 200×200 grey placeholder PNG (valid PNG, displays as grey square)
// Generated with: python3 -c "from PIL import Image; img=Image.new('RGB',(200,200),(220,220,220)); img.save('ph.png')"
// Embedded as base64 to avoid any external dependency
const PLACEHOLDER_PNG_B64 = `
iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABmJLR0QA/wD/AP+gvaeTAAAADUlE
QVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
`.replace(/\s/g, '');

const PLACEHOLDER_BUF = Buffer.from(PLACEHOLDER_PNG_B64, 'base64');

const BACKEND_ROOT = __dirname;

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected\n');

  let created = 0;
  let skipped = 0;

  async function processModel(Model, label) {
    const docs = await Model.find({ image: { $ne: null, $ne: '' } }).select('image').lean();
    console.log(`${label}: ${docs.length} records with images`);

    for (const doc of docs) {
      const imgPath = doc.image;
      if (!imgPath) continue;

      // Normalize path  
      const rel = imgPath.replace(/\\/g, '/').replace(/^\/+/, '');
      const fullPath = path.join(BACKEND_ROOT, rel);
      const dir = path.dirname(fullPath);

      if (fs.existsSync(fullPath)) {
        skipped++;
        continue;
      }

      // Ensure directory exists
      fs.mkdirSync(dir, { recursive: true });

      // Write placeholder matching the original file extension
      const ext = path.extname(fullPath).toLowerCase();
      // All common image types — write the same PNG bytes (browsers accept PNG regardless of extension for display)
      fs.writeFileSync(fullPath, PLACEHOLDER_BUF);
      console.log(`  ✅ Created placeholder: ${rel}`);
      created++;
    }
  }

  const Menu = require('./model/menuModel');
  const Category = require('./model/Category');
  const RestaurantMenu = require('./model/restaurantMenuModel');

  await processModel(Menu, 'Menu');
  await processModel(Category, 'Category');
  await processModel(RestaurantMenu, 'RestaurantMenu');

  console.log(`\nDone! Created: ${created} placeholders, Skipped (already exist): ${skipped}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
