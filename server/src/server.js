const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { initDatabase } = require('./config/database');
const { startSheetsSyncWorker, stopSheetsSyncWorker } = require('./jobs/sheetsSyncWorker');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    logger.info('Initializing Business Card Scanner API server...');

    // Initialize database connectivity (PostgreSQL or local fallback)
    await initDatabase();

    // Start background synchronization worker for Google Sheets
    startSheetsSyncWorker(30000); // Poll every 30 seconds

    const server = app.listen(PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`🔗 API Endpoint: http://localhost:${PORT}/api/v1`);
      logger.info(`📱 Client Allowed Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      logger.info(`=======================================================`);
    });

    const shutdown = () => {
      logger.info('Gracefully shutting down server...');
      stopSheetsSyncWorker();
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Fatal error during server startup', error);
    process.exit(1);
  }
}

bootstrap();

