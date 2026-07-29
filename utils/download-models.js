// scripts/download-models.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const models = [
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
    filename: 'ssd_mobilenetv1_model-weights_manifest.json'
  },
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-shard1',
    filename: 'ssd_mobilenetv1_model-shard1'
  },
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/ssd_mobilenetv1_model-shard2',
    filename: 'ssd_mobilenetv1_model-shard2'
  },
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json',
    filename: 'face_landmark_68_model-weights_manifest.json'
  },
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1',
    filename: 'face_landmark_68_model-shard1'
  },
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json',
    filename: 'face_recognition_model-weights_manifest.json'
  },
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1',
    filename: 'face_recognition_model-shard1'
  },
  {
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard2',
    filename: 'face_recognition_model-shard2'
  }
];

const modelsDir = path.join(__dirname, '../models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('📁 Created models directory');
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => reject(err));
    });
  });
}

async function downloadModels() {
  console.log('📥 Downloading face recognition models...');
  console.log('This may take a few minutes depending on your internet connection...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (const model of models) {
    const filepath = path.join(modelsDir, model.filename);
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`✅ ${model.filename} already exists, skipping...`);
      successCount++;
      continue;
    }

    try {
      console.log(`⬇️  Downloading ${model.filename}...`);
      await downloadFile(model.url, filepath);
      console.log(`✅ Downloaded ${model.filename}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to download ${model.filename}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Download Summary:');
  console.log(`✅ Successfully downloaded: ${successCount} files`);
  console.log(`❌ Failed: ${errorCount} files`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All models downloaded successfully!');
    console.log('You can now start the face recognition attendance system.');
  } else {
    console.log('\n⚠️  Some models failed to download. Please check your internet connection and try again.');
  }
}

// Run if this script is executed directly
if (require.main === module) {
  downloadModels().catch(console.error);
}

module.exports = downloadModels;