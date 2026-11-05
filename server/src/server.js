const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { initDatabase } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    logger.info('Initializing Business Card Scanner API server...');

    // Initialize database connectivity (PostgreSQL / Relational database)
    await initDatabase();

    const HOST = process.env.HOST || '0.0.0.0';
    const server = app.listen(PORT, HOST, () => {
      logger.info(`=======================================================`);
      logger.info(`Server running on http://${HOST}:${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info(`API Endpoint: http://localhost:${PORT}/api/v1`);
      logger.info(`Mobile Access: http://<LAN_IP>:${PORT}/api/v1`);
      logger.info(`Client Allowed Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      logger.info(`=======================================================`);
    });

    const shutdown = () => {
      logger.info('Gracefully shutting down server...');
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

