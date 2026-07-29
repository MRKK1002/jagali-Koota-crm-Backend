require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Category = require('./model/Category');
  const cats = await Category.find({}).select('name image').lean();
  console.log('Categories in DB:');
  cats.forEach(c => {
    const rel = (c.image || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const full = path.join(__dirname, rel);
    const exists = rel ? fs.existsSync(full) : false;
    console.log(`  name: ${c.name}`);
    console.log(`  image: ${JSON.stringify(c.image)}`);
    console.log(`  file: ${full}`);
    console.log(`  exists: ${exists}`);
    console.log();
  });
  await mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
