const { getDb } = require('../config/database');
const { isConfigured } = require('../config/googleSheets');
const { syncContact } = require('../services/sheetsSyncService');
const logger = require('../utils/logger');

let isWorkerRunning = false;
let intervalId = null;

const MAX_RETRIES = 5;

/**
 * Process a batch of pending or failed Google Sheets sync jobs
 */
async function processSyncQueue() {
  if (isWorkerRunning) return;
  if (!isConfigured()) return;

  isWorkerRunning = true;
  try {
    const db = getDb();
    
    // Find sync jobs that are PENDING or FAILED with retryCount < MAX_RETRIES
    const allPendingOrFailed = await db.googleSheetsSync.findMany({
      include: { contact: true },
    });

    const now = Date.now();
    const candidateJobs = allPendingOrFailed.filter((job) => {
      if (job.status === 'SYNCED') return false;
      if (job.retryCount >= MAX_RETRIES) return false;

      // Exponential backoff check: retry after (2^retryCount * 10) seconds
      const backoffMs = Math.pow(2, job.retryCount) * 10 * 1000;
      const lastAttemptTime = new Date(job.updatedAt || job.createdAt).getTime();

      return now - lastAttemptTime >= backoffMs;
    });

    if (candidateJobs.length > 0) {
      logger.info(`[SyncWorker] Found ${candidateJobs.length} contact sync job(s) to process.`);
    }

    for (const job of candidateJobs) {
      try {
        logger.info(`[SyncWorker] Attempting sync for contact ID ${job.contactId} (attempt #${job.retryCount + 1})...`);
        await syncContact(job.contactId);
      } catch (err) {
        logger.error(`[SyncWorker] Error processing job for contact ${job.contactId}`, err);
      }
    }
  } catch (error) {
    logger.error('[SyncWorker] Error during queue check', error);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Start the background worker polling loop
 */
function startSheetsSyncWorker(intervalMs = 30000) {
  if (intervalId) clearInterval(intervalId);
  logger.info(`[SyncWorker] Starting Google Sheets synchronization background worker (interval: ${intervalMs / 1000}s)`);
  
  // Initial run after brief delay
  setTimeout(() => {
    processSyncQueue();
  }, 5000);

  intervalId = setInterval(processSyncQueue, intervalMs);
}

/**
 * Stop background worker
 */
function stopSheetsSyncWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[SyncWorker] Stopped Google Sheets worker.');
  }
}

module.exports = {
  startSheetsSyncWorker,
  stopSheetsSyncWorker,
  processSyncQueue,
};

