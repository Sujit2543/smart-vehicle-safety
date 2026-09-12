import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env';
import { logger } from './utils/logger';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Route imports
import breakdownRoutes from './routes/breakdown.routes';
import authRoutes from './routes/auth.routes';
import tagRoutes from './routes/tag.routes';
import customerRoutes from './routes/customer.routes';
import vehicleRoutes from './routes/vehicle.routes';
import documentRoutes from './routes/document.routes';
import sosRoutes from './routes/sos.routes';
import callRoutes from './routes/call.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import insuranceRoutes from './routes/insurance.routes';
import pucRoutes from './routes/puc.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import publicRoutes from './routes/public.routes';

const app = express();

// ── Security Headers ──────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: env.isProduction(),
  })
);

// ── CORS ──────────────────────────────────────────────────────
// Allow all configured origins. In dev this includes localhost + LAN IP.
// OPTIONS preflight must be handled before any other middleware.
app.options('*', cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin) return callback(null, true);
    const allowed = env.ALLOWED_ORIGINS as string[];
    if (allowed.includes(origin)) return callback(null, true);
    // In development also allow any LAN IP (192.168.x.x, 10.x.x.x)
    if (env.isDevelopment() && /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = env.ALLOWED_ORIGINS as string[];
      if (allowed.includes(origin)) return callback(null, true);
      if (env.isDevelopment() && /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());

// ── Request logging ───────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (_req, res) => env.isProduction() && res.statusCode < 400,
  })
);

// ── Global rate limiter ───────────────────────────────────────
app.use(globalRateLimiter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: env.APP_NAME,
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────
const prefix = env.API_PREFIX;

app.use(`${prefix}/breakdown`, breakdownRoutes);
app.use(`${prefix}/auth`, authRoutes);
app.use(`${prefix}/tags`, tagRoutes);
app.use(`${prefix}/customers`, customerRoutes);
app.use(`${prefix}/vehicles`, vehicleRoutes);
app.use(`${prefix}/documents`, documentRoutes);
app.use(`${prefix}/sos`, sosRoutes);
app.use(`${prefix}/calls`, callRoutes);
app.use(`${prefix}/maintenance`, maintenanceRoutes);
app.use(`${prefix}/insurance`, insuranceRoutes);
app.use(`${prefix}/puc`, pucRoutes);
app.use(`${prefix}/notifications`, notificationRoutes);
app.use(`${prefix}/admin`, adminRoutes);
app.use(`${prefix}/public`, publicRoutes);

// ── 404 + Error Handlers ──────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
