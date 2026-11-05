const syncService = require('../services/syncService');
const logger = require('../utils/logger');

async function batchSync(req, res, next) {
  try {
    const { items = [] } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'items must be an array of sync objects',
      });
    }

    const result = await syncService.processBatchSync(items);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await syncService.getSyncStatus();
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

async function getChanges(req, res, next) {
  try {
    const { since } = req.query;
    const changes = await syncService.getChangesSince(since);
    return res.status(200).json({
      success: true,
      data: changes,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  batchSync,
  getStatus,
  getChanges,
};

