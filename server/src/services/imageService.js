const sharp = require('sharp');
const logger = require('../utils/logger');

/**
 * Image processing service using Sharp
 */

/**
 * Preprocess image buffer specifically optimized for Google Vision OCR
 * - Auto-rotates using EXIF orientation
 * - Resizes excessively large images (caps max dimension to 2400px)
 * - Normalizes contrast and applies gentle sharpening for better text legibility
 * - Produces normalized image buffer
 * 
 * @param {Buffer} inputBuffer - Original image buffer
 * @returns {Promise<{ocrBuffer: Buffer, metadata: object}>}
 */
async function preprocessForOcr(inputBuffer) {
  try {
    const pipeline = sharp(inputBuffer).rotate(); // auto-rotate based on EXIF
    const metadata = await pipeline.metadata();

    const maxDim = 2400;
    let width = metadata.width;
    let height = metadata.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      pipeline.resize(width, height, { fit: 'inside', withoutEnlargement: true });
    }

    // Enhance contrast and sharpness for OCR text extraction
    const ocrBuffer = await pipeline
      .normalize() // stretch luminance to cover the full dynamic range
      .sharpen({ sigma: 1.2, m1: 1.0, m2: 2.0 })
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      ocrBuffer,
      metadata: {
        width,
        height,
        format: metadata.format,
      },
    };
  } catch (error) {
    logger.error('Sharp image processing error', error);
    // Return original buffer as fallback if Sharp encounters format issue
    return {
      ocrBuffer: inputBuffer,
      metadata: {},
    };
  }
}

/**
 * Normalize and auto-orient original image for cloud storage
 * Maintains high resolution and clean quality while fixing orientation
 * 
 * @param {Buffer} inputBuffer
 * @returns {Promise<Buffer>}
 */
async function normalizeForStorage(inputBuffer) {
  try {
    return await sharp(inputBuffer)
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    logger.error('Error normalizing image for storage', error);
    return inputBuffer;
  }
}

module.exports = {
  preprocessForOcr,
  normalizeForStorage,
};

