const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cloudinary, isConfigured, getSignedCardUrl } = require('../config/cloudinary');
const imageService = require('./imageService');
const logger = require('../utils/logger');

const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/cards');

// Ensure local uploads directory exists
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

/**
 * Upload business card image to Cloudinary (or local secure store if unconfigured)
 * 
 * @param {Buffer} buffer - Image buffer
 * @param {'front' | 'back'} side - Card side
 * @param {string} originalFilename
 * @returns {Promise<{publicId: string, assetId: string, secureUrl: string, isLocal: boolean}>}
 */
async function uploadCardImage(buffer, side = 'front', originalFilename = 'card.jpg') {
  // Normalize and auto-orient before storing
  const normalizedBuffer = await imageService.normalizeForStorage(buffer);

  if (isConfigured()) {
    try {
      logger.info(`Uploading card ${side} image to Cloudinary authenticated storage...`);

      return await new Promise((resolve, reject) => {
        const folder = `business-card-scanner/original-cards/${side.toLowerCase()}`;
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            type: 'authenticated', // Authenticated delivery for private business cards
            format: 'jpg',
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error', error);
              return reject(error);
            }

            // Generate signed URL for authorized access
            const signedUrl = getSignedCardUrl(result.public_id, 86400) || result.secure_url;

            logger.info(`Cloudinary upload complete: ${result.public_id}`);
            resolve({
              publicId: result.public_id,
              assetId: result.asset_id || result.public_id,
              secureUrl: signedUrl,
              isLocal: false,
            });
          }
        );

        uploadStream.end(normalizedBuffer);
      });
    } catch (err) {
      logger.error('Failed to upload to Cloudinary, falling back to local storage', err);
    }
  }

  // Local fallback storage
  const fileId = `${side}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
  const filePath = path.join(LOCAL_UPLOAD_DIR, fileId);
  fs.writeFileSync(filePath, normalizedBuffer);

  const localUrl = `/uploads/cards/${fileId}`;
  logger.info(`Saved card image locally: ${localUrl}`);

  return {
    publicId: fileId,
    assetId: fileId,
    secureUrl: localUrl,
    isLocal: true,
  };
}

/**
 * Clean up uploaded Cloudinary or local assets if database transaction fails
 * Prevents orphaned files (Requirement in Section 14)
 * 
 * @param {Array<{publicId: string, isLocal: boolean}>} imageRecords
 */
async function cleanupUploadedImages(imageRecords) {
  if (!imageRecords || !Array.isArray(imageRecords)) return;

  for (const img of imageRecords) {
    if (!img.publicId) continue;

    if (img.isLocal) {
      const localPath = path.join(LOCAL_UPLOAD_DIR, img.publicId);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
          logger.info(`Cleaned up orphaned local file: ${img.publicId}`);
        } catch (e) {
          logger.error(`Error deleting local file ${img.publicId}`, e);
        }
      }
    } else if (isConfigured()) {
      try {
        await cloudinary.uploader.destroy(img.publicId, { type: 'authenticated' });
        logger.info(`Cleaned up orphaned Cloudinary asset: ${img.publicId}`);
      } catch (err) {
        logger.error(`Error deleting Cloudinary asset ${img.publicId}`, err);
      }
    }
  }
}

/**
 * Refresh/Get signed view URL for an image
 */
function getDisplayUrl(publicId, fallbackUrl) {
  if (isConfigured() && publicId && !publicId.endsWith('.jpg')) {
    const signed = getSignedCardUrl(publicId, 86400); // 24hr access
    if (signed) return signed;
  }
  return fallbackUrl;
}

module.exports = {
  uploadCardImage,
  cleanupUploadedImages,
  getDisplayUrl,
};

