const { getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get Dashboard KPI Statistics and Activity
 */
async function getStats(req, res) {
  try {
    const db = getDb();

    // Start of today (midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalContacts,
      totalCompanies,
      allScans,
      allSyncs,
      recentScans,
      recentContacts,
    ] = await Promise.all([
      db.businessContact.count({ where: { isDeleted: false } }),
      db.company.count(),
      db.scanHistory.findMany(),
      db.googleSheetsSync.findMany(),
      db.scanHistory.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { contact: true },
      }),
      db.businessContact.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { company: true, sheetsSyncs: true },
      }),
    ]);

    // Cards scanned today
    const cardsScannedToday = allScans.filter(
      (s) => new Date(s.createdAt) >= todayStart
    ).length;

    // Failed OCR count
    const failedOcrCount = allScans.filter((s) => s.status === 'FAILED').length;

    // Google Sheets sync breakdowns
    const syncSyncedCount = allSyncs.filter((s) => s.status === 'SYNCED').length;
    const syncPendingCount = allSyncs.filter((s) => s.status === 'PENDING').length;
    const syncFailedCount = allSyncs.filter((s) => s.status === 'FAILED').length;

    return successResponse(res, {
      stats: {
        totalContacts,
        totalCompanies,
        cardsScannedToday,
        failedOcrCount,
        syncStatus: {
          synced: syncSyncedCount,
          pending: syncPendingCount,
          failed: syncFailedCount,
          total: allSyncs.length,
        },
      },
      recentScans,
      recentContacts,
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats', error);
    return errorResponse(res, 'Failed to fetch dashboard statistics', 500);
  }
}

module.exports = {
  getStats,
};

