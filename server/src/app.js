const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const scanRoutes = require('./routes/scanRoutes');
const contactRoutes = require('./routes/contactRoutes');
const companyRoutes = require('./routes/companyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS setup: supports Web (Vite), Mobile (Expo / React Native on local network and emulator)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. native mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('exp://')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Cookie & Body Parsing
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static local uploaded images endpoint
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/dataset-images', express.static(path.resolve(__dirname, '../data/dataset_50_cards/images')));
app.use('/examples-images', express.static(path.resolve(__dirname, '../../examples')));

// General Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', apiLimiter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes (Mounted under /api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/scans', scanRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/integrations', integrationRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;

