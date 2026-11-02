const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error at ${req.method} ${req.originalUrl}`, err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 'File size exceeds 12MB limit.', 400);
    }
    return errorResponse(res, `File upload error: ${err.message}`, 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return errorResponse(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? err.stack : undefined
  );
}

module.exports = {
  errorHandler,
};

