const cloudinaryConfig = require('../config/cloudinary');
const { isMongoConnected, getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get Health and Configuration Status of System Services
 */
async function getStatus(req, res) {
  try {
    const status = {
      database: {
        type: isMongoConnected() ? 'MongoDB (Mongoose)' : 'MongoDB (Resilient Local Mode)',
        connected: isMongoConnected(),
        engine: 'MongoDB',
        uri: (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/visiting_cards').replace(
          /\/\/([^:]+):([^@]+)@/,
          '//$1:****@'
        ),
      },
      aiEngine: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        status: process.env.GEMINI_API_KEY ? 'Connected' : 'Offline Engine',
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      },
      cloudinary: {
        configured: cloudinaryConfig.isConfigured(),
        status: cloudinaryConfig.isConfigured() ? 'Connected' : 'Local Storage Mode',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Local File System',
      },
    };

    return successResponse(res, { status });
  } catch (error) {
    logger.error('Error fetching system status', error);
    return errorResponse(res, 'Failed to fetch system status', 500);
  }
}

module.exports = {
  getStatus,
};
