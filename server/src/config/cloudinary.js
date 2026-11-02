const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info('Cloudinary configured successfully.');
} else {
  logger.warn('Cloudinary credentials missing or incomplete in .env. Falling back to local secure storage for card images.');
}

/**
 * Generate a signed time-limited URL for authenticated card image
 * @param {string} publicId - Cloudinary public id
 * @param {number} expiresInSeconds - Expiration time (default 1 hour)
 */
function getSignedCardUrl(publicId, expiresInSeconds = 3600) {
  if (!isConfigured) return null;
  try {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      expires_at: expiresAt,
      secure: true,
    });
  } catch (error) {
    logger.error('Failed to generate signed Cloudinary URL', error);
    return null;
  }
}

module.exports = {
  cloudinary,
  isConfigured: () => isConfigured,
  getSignedCardUrl,
};

