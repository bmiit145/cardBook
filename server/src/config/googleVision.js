const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let visionClient = null;
let isConfigured = false;

try {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const resolvedPath = credPath ? path.resolve(process.cwd(), credPath) : null;

  if (resolvedPath && fs.existsSync(resolvedPath)) {
    visionClient = new vision.ImageAnnotatorClient({
      keyFilename: resolvedPath,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    isConfigured = true;
    logger.info('Google Cloud Vision API client initialized successfully.');
  } else if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    visionClient = new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    isConfigured = true;
    logger.info('Google Cloud Vision API client initialized with project credentials.');
  } else {
    logger.warn('Google Cloud Vision credentials not detected. OCR service will run in demo/fallback mode.');
  }
} catch (error) {
  logger.error('Error initializing Google Cloud Vision API', error);
  isConfigured = false;
}

module.exports = {
  getClient: () => visionClient,
  isConfigured: () => isConfigured,
};

