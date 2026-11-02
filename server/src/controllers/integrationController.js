const googleVisionConfig = require('../config/googleVision');
const cloudinaryConfig = require('../config/cloudinary');
const googleSheetsConfig = require('../config/googleSheets');
const { isPostgresConnected, getDb } = require('../config/database');
const { syncContact } = require('../services/sheetsSyncService');
const { processSyncQueue } = require('../jobs/sheetsSyncWorker');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get Health and Configuration Status of All Integrations
 */
async function getStatus(req, res) {
  try {
    const db = getDb();
    const failedSyncs = await db.googleSheetsSync.findMany({
      where: { status: 'FAILED' },
      include: { contact: true },
    });

    const status = {
      database: {
        type: isPostgresConnected() ? 'PostgreSQL (Prisma)' : 'Local Resilient Store',
        connected: true,
      },
      googleVision: {
        configured: googleVisionConfig.isConfigured(),
        status: googleVisionConfig.isConfigured() ? 'Connected' : 'Demo / Standby Mode',
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'Not configured',
      },
      cloudinary: {
        configured: cloudinaryConfig.isConfigured(),
        status: cloudinaryConfig.isConfigured() ? 'Connected' : 'Local Storage Mode',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'Not configured',
      },
      googleSheets: {
        configured: googleSheetsConfig.isConfigured(),
        status: googleSheetsConfig.isConfigured() ? 'Connected' : 'Not configured',
        spreadsheetId: googleSheetsConfig.getSpreadsheetId() || 'Not configured',
        failedSyncCount: failedSyncs.length,
      },
      failedSyncs,
    };

    return successResponse(res, { status });
  } catch (error) {
    logger.error('Error fetching integration status', error);
    return errorResponse(res, 'Failed to fetch integration status', 500);
  }
}

/**
 * Retry All Failed Google Sheets Synchronizations
 */
async function retryFailedSheetsSync(req, res) {
  try {
    const db = getDb();
    const failedSyncs = await db.googleSheetsSync.findMany({
      where: { status: 'FAILED' },
    });

    if (failedSyncs.length === 0) {
      return successResponse(res, { retriedCount: 0 }, 'No failed sync records found to retry');
    }

    // Reset retryCount so worker picks them immediately
    for (const item of failedSyncs) {
      await db.googleSheetsSync.update({
        where: { id: item.id },
        data: {
          status: 'PENDING',
          retryCount: 0,
          lastError: null,
        },
      });
    }

    // Trigger queue processing
    processSyncQueue().catch((err) => {
      logger.error('Worker error during manual retry', err);
    });

    return successResponse(
      res,
      { retriedCount: failedSyncs.length },
      `Enqueued ${failedSyncs.length} failed contact(s) for Google Sheets retry.`
    );
  } catch (error) {
    logger.error('Error retrying sheets sync', error);
    return errorResponse(res, 'Failed to retry synchronization', 500);
  }
}

/**
 * Manually Trigger Google Sheets Sync for a Specific Contact
 */
async function syncSingleContact(req, res) {
  try {
    const { id } = req.params;
    const result = await syncContact(id);

    if (result.success) {
      return successResponse(res, result, 'Contact synced to Google Sheets successfully');
    } else {
      return errorResponse(res, result.error || 'Failed to sync with Google Sheets', 400);
    }
  } catch (error) {
    logger.error('Error syncing single contact', error);
    return errorResponse(res, 'Failed to sync contact', 500);
  }
}

module.exports = {
  getStatus,
  retryFailedSheetsSync,
  syncSingleContact,
};

