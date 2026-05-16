const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const authRoutes = require('./routes/auth.routes');
const jobRoutes = require('./routes/jobs.routes');
const bidRoutes = require('./routes/bids.routes');
const userRoutes = require('./routes/users.routes');
const adminRoutes = require('./routes/admin.routes');
const categoryRoutes = require('./routes/categories.routes');
const notificationRoutes = require('./routes/notifications.routes');
const reviewRoutes = require('./routes/reviews.routes');
const contractRoutes = require('./routes/contracts.routes');
const statsRoutes = require('./routes/stats.routes');
const orderRoutes = require('./routes/orders.routes');
const disputeRoutes = require('./routes/disputes.routes');
const uploadRoutes = require('./routes/upload.routes');
const errorMiddleware = require('./middleware/error');
const { error } = require('./utils/response');

const app = express();

// Trust proxy (required for correct IP detection behind Render/Vercel/nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary media
}));

// CORS
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Response compression (skips already-compressed formats)
app.use(compression());

// HTTP request logging (skip in test)
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Auth routes: strict — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, try again in 15 minutes', code: 'RATE_LIMITED' },
});

// General API: 150 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down', code: 'RATE_LIMITED' },
});

// Apply general limiter to all /api/v1 routes
app.use('/api/v1', apiLimiter);

// Stricter limiter on auth endpoints
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ── Health check (unauthenticated) ───────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  uptime: Math.floor(process.uptime()),
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/bids', bidRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/upload', uploadRoutes);

app.use((req, res) => error(res, 'Route not found', 404, 'NOT_FOUND'));
app.use(errorMiddleware);

module.exports = app;
