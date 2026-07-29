const path = require("path");
const faceapi = require("face-api.js");
const canvas = require("canvas");
const fs = require("fs");

// Patch nodejs environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_PATH = path.join(__dirname, "../weights");

async function loadModels() {
  try {
    console.log("📥 Loading face recognition models...");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    console.log("✅ Face recognition models loaded successfully!");
  } catch (error) {
    console.error("❌ Failed to load face recognition models:", error);
  }
}

// Example: detect face from local image
async function detectFace(imagePath) {
  const img = await canvas.loadImage(imagePath);
  const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  console.log(detections);
}

module.exports = { loadModels, detectFace };
