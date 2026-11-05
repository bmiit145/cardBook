const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Authentication Middleware for Admin Protection
 * Reads token from HttpOnly cookie or Authorization Bearer header
 */
async function authenticateAdmin(req, res, next) {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }

    // 2. Fallback to Authorization Header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return errorResponse(res, 'Authentication required. Please log in as admin.', 401);
    }

    const secret = process.env.JWT_SECRET || 'business_card_scanner_jwt_secret_dev_key';
    const decoded = jwt.verify(token, secret);

    if (!decoded || !decoded.id) {
      return errorResponse(res, 'Invalid authentication token.', 401);
    }

    const db = getDb();
    const admin = await db.admin.findUnique({
      where: { id: decoded.id },
    });

    if (!admin) {
      return errorResponse(res, 'Admin account not found.', 401);
    }

    // Attach sanitized admin object to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please log in again.', 401);
    }
    logger.warn(`Auth failure: ${error.message}`);
    return errorResponse(res, 'Invalid or expired token.', 401);
  }
}

/**
 * Optional Authentication Middleware
 * Populates req.admin if valid token is provided, but allows guest browsing
 */
async function optionalAuth(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (token) {
      const secret = process.env.JWT_SECRET || 'business_card_scanner_jwt_secret_dev_key';
      const decoded = jwt.verify(token, secret);
      if (decoded && decoded.id) {
        const db = getDb();
        const admin = await db.admin.findUnique({
          where: { id: decoded.id },
        });
        if (admin) {
          req.admin = {
            id: admin.id,
            email: admin.email,
            name: admin.name,
          };
        }
      }
    }
  } catch (_) {}
  next();
}

module.exports = {
  authenticateAdmin,
  optionalAuth,
};

