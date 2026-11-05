const { getDb } = require('../config/database');
const logger = require('../utils/logger');
const contactService = require('./contactService');

/**
 * Handles batch synchronization from offline mobile queues
 */
async function processBatchSync(batchItems = []) {
  const db = getDb();
  const results = [];

  for (const item of batchItems) {
    const { idempotencyKey, entityType, operation, data } = item;

    try {
      if (entityType === 'CONTACT') {
        if (operation === 'CREATE') {
          // Check for duplicates first
          const duplicate = await contactService.checkDuplicate({
            phone: data.phone,
            email: data.email,
            fullName: data.fullName,
            companyName: data.company,
          });

          if (duplicate && duplicate.isDuplicate && duplicate.existingContact) {
            results.push({
              idempotencyKey,
              entityType,
              status: 'DUPLICATE_RESOLVED',
              serverId: duplicate.existingContact.id,
              data: duplicate.existingContact,
              message: 'Existing contact matched by phone or email.',
            });
            continue;
          }

          // Create new contact
          const created = await contactService.createContact({
            fullName: data.fullName || 'Unknown Contact',
            companyName: data.company || '',
            designation: data.designation || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            address: data.address || '',
            notes: data.notes || 'Created via offline sync',
          });

          results.push({
            idempotencyKey,
            entityType,
            status: 'SUCCESS',
            serverId: created.id,
            data: created,
          });
        } else if (operation === 'UPDATE' && data.id) {
          const updated = await contactService.updateContact(data.id, data);
          results.push({
            idempotencyKey,
            entityType,
            status: 'SUCCESS',
            serverId: updated.id,
            data: updated,
          });
        }
      } else if (entityType === 'SCAN') {
        const scanRecord = await db.scanHistory.create({
          data: {
            originalOcrText: data.ocrText || '',
            extractedJson: data.extractedJson || {},
            status: 'SUCCESS',
          },
        });

        results.push({
          idempotencyKey,
          entityType,
          status: 'SUCCESS',
          serverId: scanRecord.id,
        });
      } else {
        results.push({
          idempotencyKey,
          status: 'SKIPPED',
          message: `Unknown entity type: ${entityType}`,
        });
      }
    } catch (err) {
      logger.error(`Error syncing batch item [${idempotencyKey}]:`, err);
      results.push({
        idempotencyKey,
        status: 'FAILED',
        error: err.message,
      });
    }
  }

  return {
    success: true,
    totalProcessed: batchItems.length,
    syncedAt: new Date().toISOString(),
    results,
  };
}

/**
 * Returns overall server sync status
 */
async function getSyncStatus() {
  const db = getDb();
  const contactCount = await db.businessContact.count({ where: { isDeleted: false } });
  const pendingSheetsCount = await db.googleSheetsSync.count({ where: { status: 'PENDING' } });

  return {
    serverOnline: true,
    serverTime: new Date().toISOString(),
    totalActiveContacts: contactCount,
    pendingSheetsSync: pendingSheetsCount,
  };
}

/**
 * Returns contacts modified since given timestamp
 */
async function getChangesSince(sinceTimestamp) {
  const db = getDb();
  const sinceDate = sinceTimestamp ? new Date(sinceTimestamp) : new Date(0);

  const contacts = await db.businessContact.findMany({
    where: {
      updatedAt: { gte: sinceDate },
    },
    include: {
      company: true,
    },
    orderBy: { updatedAt: 'asc' },
  });

  return {
    since: sinceDate.toISOString(),
    count: contacts.length,
    contacts,
  };
}

module.exports = {
  processBatchSync,
  getSyncStatus,
  getChangesSince,
};

