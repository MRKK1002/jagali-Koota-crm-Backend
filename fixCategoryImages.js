/**
 * fixCategoryImages.js
 * 
 * 1. Fixes category DB records that store absolute Windows paths → converts to relative
 * 2. Matches each category to the most recent real file on disk (by timestamp in filename)
 * 
 * Run once: node fixCategoryImages.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const BACKEND = __dirname;
const CAT_DIR = path.join(BACKEND, 'uploads', 'category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected\n');

  const Category = require('./model/Category');

  // Get all real files on disk (only files > 1KB — skip any tiny placeholders)
  const diskFiles = fs.readdirSync(CAT_DIR)
    .map(f => ({ name: f, full: path.join(CAT_DIR, f), size: fs.statSync(path.join(CAT_DIR, f)).size }))
    .filter(f => f.size > 1024) // must be real image > 1KB
    .sort((a, b) => b.name.localeCompare(a.name)); // newest first (by timestamp prefix)

  console.log('Real image files on disk:');
  diskFiles.forEach(f => console.log(`  ${f.name} (${Math.round(f.size/1024)}KB)`));

  const cats = await Category.find({}).lean();
  console.log(`\nCategories in DB: ${cats.length}`);

  for (const cat of cats) {
    const currentImg = cat.image || '';

    // Check if current image path is absolute (contains drive letter or absolute path)
    const isAbsolute = /^[A-Za-z]:[\\/]/.test(currentImg) || currentImg.startsWith('/Users/') || currentImg.startsWith('/home/');
    
    // Extract just the filename from whatever path is stored
    const storedFilename = path.basename(currentImg.replace(/\\/g, '/'));
    
    // Check if the stored relative path already works
    const relPath = currentImg.replace(/\\/g, '/').replace(/^\/+/, '');
    const fileExists = relPath.startsWith('uploads/') && fs.existsSync(path.join(BACKEND, relPath));

    console.log(`\n  Category: "${cat.name}"`);
    console.log(`  Stored: ${JSON.stringify(currentImg)}`);
    console.log(`  Is absolute: ${isAbsolute}, File exists (relative): ${fileExists}`);

    if (fileExists && !isAbsolute) {
      console.log(`  ✅ Already correct — skipping`);
      continue;
    }

    // Try to find matching file on disk by filename
    const matchByName = diskFiles.find(f => f.name === storedFilename);
    
    if (matchByName) {
      // Found exact file on disk — fix the path to be relative
      const newPath = `uploads/category/${matchByName.name}`;
      await Category.findByIdAndUpdate(cat._id, { image: newPath });
      console.log(`  ✅ Fixed path → ${newPath}`);
    } else if (diskFiles.length > 0) {
      // No exact match — assign the most recent unassigned file
      // Get which files are already used by other cats
      const allCats = await Category.find({ _id: { $ne: cat._id } }).select('image').lean();
      const usedFiles = new Set(allCats.map(c => path.basename((c.image || '').replace(/\\/g, '/'))));
      const unused = diskFiles.find(f => !usedFiles.has(f.name));
      
      if (unused) {
        const newPath = `uploads/category/${unused.name}`;
        await Category.findByIdAndUpdate(cat._id, { image: newPath });
        console.log(`  ✅ Assigned best available file → ${newPath}`);
      } else {
        // All files used — assign the newest one anyway
        const newPath = `uploads/category/${diskFiles[0].name}`;
        await Category.findByIdAndUpdate(cat._id, { image: newPath });
        console.log(`  ✅ Assigned newest file → ${newPath}`);
      }
    } else {
      console.log(`  ⚠️  No real image files on disk — keeping path as-is (will show placeholder)`);
    }
  }

  // Verify final state
  console.log('\n=== FINAL STATE ===');
  const updated = await Category.find({}).select('name image').lean();
  updated.forEach(c => {
    const rel = (c.image || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const exists = rel ? fs.existsSync(path.join(BACKEND, rel)) : false;
    const url = rel ? `http://localhost:9000/${rel}` : 'null';
    console.log(`  ${c.name}: ${exists ? '✅' : '❌'} ${url}`);
  });

  await mongoose.disconnect();
  console.log('\nDone. Restart backend and refresh the category page.');
}).catch(e => { console.error(e); process.exit(1); });
