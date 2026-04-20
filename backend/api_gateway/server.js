/**
 * AgriWise API Gateway (Production Ready)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');

const { authenticateJWT } = require('./middleware/auth');
const { connectRedis } = require('./services/redis');

const app = express();
const PORT = process.env.PORT || 3000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─────────────────────────────────────────
// 🔹 Connect Redis
// ─────────────────────────────────────────
connectRedis();

// ─────────────────────────────────────────
// 🔹 Security Middleware
// ─────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined'));

// ─────────────────────────────────────────
// 🔹 Rate Limiters
// ─────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // stricter for OTP/login
});

// ─────────────────────────────────────────
// 🔹 Routes
// ─────────────────────────────────────────

// Auth (stricter limit)
app.use('/auth', authLimiter, authRouter);

// Protected routes
app.use('/products', authenticateJWT, generalLimiter, productsRouter);
app.use('/orders', authenticateJWT, generalLimiter, ordersRouter);

// Payments (protected + raw body support)
app.use('/payments',
  express.raw({ type: 'application/json' }),
  authenticateJWT,
  paymentsRouter
);

// ─────────────────────────────────────────
// 🔹 ML Proxy
// ─────────────────────────────────────────
app.use('/api', createProxyMiddleware({
  target: ML_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        error: 'ML_SERVICE_DOWN',
        message: err.message,
      });
    },
  },
}));

// ─────────────────────────────────────────
// 🔹 Health Check
// ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'agriwise-gateway',
    uptime: process.uptime(),
  });
});

// ─────────────────────────────────────────
// 🔹 404 Handler
// ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    path: req.path,
  });
});

// ─────────────────────────────────────────
// 🔹 Global Error Handler
// ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Something went wrong',
  });
});

// ─────────────────────────────────────────
// 🔹 Graceful Shutdown
// ─────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
});

module.exports = app;