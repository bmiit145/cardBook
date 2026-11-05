const { getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get Dashboard KPI Statistics and Activity
 * Strictly scoped to authenticated user
 */
async function getStats(req, res) {
  try {
    // If user is unauthenticated or guest, return zeroed dashboard stats
    if (!req.admin || !req.admin.id) {
      return successResponse(res, {
        stats: {
          totalContacts: 0,
          totalCompanies: 0,
          cardsScannedToday: 0,
          failedOcrCount: 0,
        },
        recentScans: [],
        recentContacts: [],
      });
    }

    const db = getDb();

    // Start of today (midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const userWhere = {
      isDeleted: false,
      userId: req.admin.id,
    };

    const [
      totalContacts,
      userContacts,
      recentContacts,
    ] = await Promise.all([
      db.businessContact.count({ where: userWhere }),
      db.businessContact.findMany({ where: userWhere }),
      db.businessContact.findMany({
        where: userWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { company: true },
      }),
    ]);

    // Distinct companies for this user's contacts
    const userCompanyIds = new Set(
      userContacts.map((c) => c.companyId).filter(Boolean)
    );
    const totalCompanies = userCompanyIds.size;

    // Contact IDs belonging to this user
    const userContactIdSet = new Set(userContacts.map((c) => c.id));

    // Scans associated with this user's contacts
    const allScans = await db.scanHistory.findMany({
      include: { contact: true },
    });

    const userScans = allScans.filter((s) => userContactIdSet.has(s.contactId));

    const recentScans = userScans
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Cards scanned today
    const cardsScannedToday = userScans.filter(
      (s) => new Date(s.createdAt) >= todayStart
    ).length;

    // Failed OCR count
    const failedOcrCount = userScans.filter((s) => s.status === 'FAILED').length;

    return successResponse(res, {
      stats: {
        totalContacts,
        totalCompanies,
        cardsScannedToday,
        failedOcrCount,
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
