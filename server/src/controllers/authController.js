const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const COOKIE_NAME = 'admin_token';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

function createToken(admin) {
  const secret = process.env.JWT_SECRET || 'business_card_scanner_jwt_secret_dev_key';
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
    },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Admin Login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const db = getDb();

    const admin = await db.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const token = createToken(admin);

    // Set secure HttpOnly cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    logger.info(`Admin logged in successfully: ${admin.email}`);

    return successResponse(res, {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name || 'Administrator',
      },
    }, 'Login successful');
  } catch (error) {
    logger.error('Login error', error);
    return errorResponse(res, 'An error occurred during login', 500);
  }
}

/**
 * Admin Logout
 */
async function logout(req, res) {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return successResponse(res, {}, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Logout failed', 500);
  }
}

/**
 * Get Current Admin Profile
 */
async function getMe(req, res) {
  try {
    return successResponse(res, { admin: req.admin });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch admin profile', 500);
  }
}

/**
 * Change Admin Password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = getDb();

    const admin = await db.admin.findUnique({
      where: { id: req.admin.id },
    });

    if (!admin) {
      return errorResponse(res, 'Admin account not found', 404);
    }

    const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isValid) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await db.admin.update({
      where: { id: admin.id },
      data: { passwordHash: newPasswordHash },
    });

    logger.info(`Password changed successfully for admin: ${admin.email}`);
    return successResponse(res, {}, 'Password changed successfully');
  } catch (error) {
    logger.error('Error changing password', error);
    return errorResponse(res, 'Failed to change password', 500);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  changePassword,
};

