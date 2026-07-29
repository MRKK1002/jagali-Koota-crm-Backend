const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
const fs = require('fs');
const path = require('path');

// Configure face-api.js to use node-canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class FaceRecognitionService {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = path.join(__dirname, '../models');
  }

  async loadModels() {
    if (this.modelsLoaded) return;
    
    try {
      // Check if models directory exists
      if (!fs.existsSync(this.modelPath)) {
        throw new Error(`Models directory not found: ${this.modelPath}`);
      }
      
      // Load models from local file system
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelPath),
        faceapi.nets.faceExpressionNet.loadFromDisk(this.modelPath),
        faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelPath)
      ]);
      this.modelsLoaded = true;
      console.log('Face recognition models loaded successfully');
    } catch (error) {
      console.error('Error loading face recognition models:', error);
      throw new Error('Failed to load face recognition models');
    }
  }

  async detectFaces(imageBuffer) {
    await this.loadModels();
    
    try {
      const img = new Image();
      img.src = imageBuffer;
      
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      return detections;
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw new Error('Failed to detect faces in image');
    }
  }

  async generateFaceEmbedding(imageBuffer) {
    await this.loadModels();
    
    try {
      const img = new Image();
      img.src = imageBuffer;
      
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detection) {
        throw new Error('No face detected in the image');
      }
      
      return Array.from(detection.descriptor);
    } catch (error) {
      console.error('Error generating face embedding:', error);
      throw new Error('Failed to generate face embedding');
    }
  }

  async compareFaces(embedding1, embedding2, threshold = 0.6) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      return { match: false, distance: Infinity };
    }

    // Calculate Euclidean distance between two embeddings
    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      sum += Math.pow(embedding1[i] - embedding2[i], 2);
    }
    
    const distance = Math.sqrt(sum);
    const match = distance < threshold;
    
    return { match, distance };
  }

  async findBestMatch(inputEmbedding, employeeEmbeddings, threshold = 0.6) {
    let bestMatch = null;
    let bestDistance = Infinity;
    
    for (const employee of employeeEmbeddings) {
      const comparison = await this.compareFaces(inputEmbedding, employee.faceEmbedding, threshold);
      if (comparison.match && comparison.distance < bestDistance) {
        bestMatch = employee;
        bestDistance = comparison.distance;
      }
    }
    
    return bestMatch ? { employee: bestMatch, distance: bestDistance } : null;
  }

  async validateFaceQuality(imageBuffer) {
    await this.loadModels();
    
    try {
      const img = new Image();
      img.src = imageBuffer;
      
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
      
      if (detections.length === 0) {
        return { valid: false, reason: 'No face detected' };
      }
      
      if (detections.length > 1) {
        return { valid: false, reason: 'Multiple faces detected' };
      }
      
      const detection = detections[0];
      const box = detection.detection.box;
      
      // Check face size (should be at least 100x100 pixels)
      if (box.width < 100 || box.height < 100) {
        return { valid: false, reason: 'Face too small' };
      }
      
      // Check if face is centered and well-positioned
      const imgWidth = img.width;
      const imgHeight = img.height;
      const faceCenterX = box.x + box.width / 2;
      const faceCenterY = box.y + box.height / 2;
      
      const centerX = imgWidth / 2;
      const centerY = imgHeight / 2;
      
      const distanceFromCenter = Math.sqrt(
        Math.pow(faceCenterX - centerX, 2) + Math.pow(faceCenterY - centerY, 2)
      );
      
      const maxDistance = Math.min(imgWidth, imgHeight) * 0.3;
      
      if (distanceFromCenter > maxDistance) {
        return { valid: false, reason: 'Face not centered' };
      }
      
      return { valid: true, quality: 'good' };
    } catch (error) {
      console.error('Error validating face quality:', error);
      return { valid: false, reason: 'Error processing image' };
    }
  }
}

// Create singleton instance
const faceRecognitionService = new FaceRecognitionService();

// Export functions for backward compatibility
exports.generateFaceEmbedding = async (imageBuffer) => {
  return await faceRecognitionService.generateFaceEmbedding(imageBuffer);
};

exports.compareFaces = (embedding1, embedding2, threshold = 0.6) => {
  return faceRecognitionService.compareFaces(embedding1, embedding2, threshold);
};

exports.detectFaces = async (imageBuffer) => {
  return await faceRecognitionService.detectFaces(imageBuffer);
};

exports.findBestMatch = async (inputEmbedding, employeeEmbeddings, threshold = 0.6) => {
  return await faceRecognitionService.findBestMatch(inputEmbedding, employeeEmbeddings, threshold);
};

exports.validateFaceQuality = async (imageBuffer) => {
  return await faceRecognitionService.validateFaceQuality(imageBuffer);
};

exports.faceRecognitionService = faceRecognitionService;