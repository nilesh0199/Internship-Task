import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDB, isRealDBConnected } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler, apiRateLimiter } from './middleware/index.js';
import authRoutes from './routes/authRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import threadRoutes from './routes/threadRoutes.js';

const app = express();
const PORT = env.PORT;

// Trust reverse proxy for deployment on Render/Heroku
app.set('trust proxy', 1);

// Strict CORS allowlist
const rawAllowedOrigins = (env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://localhost:4173',
];

const allowedOrigins = Array.from(
  new Set([
    ...rawAllowedOrigins,
    ...(env.NODE_ENV !== 'production' ? devOrigins : []),
  ])
);

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/api', apiRateLimiter);

// Connect database (with automatic fallback to in-memory store)
connectDB();

// Ultra lightweight health ping (no DB touch, for load balancers)
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Detailed health check endpoint reflecting real storage state
app.get('/api/health', (req, res) => {
  const isMongo = isRealDBConnected();
  res.status(200).json({
    ok: true,
    service: 'Daybook Mail API',
    storage: isMongo ? 'mongodb' : 'in-memory',
    db: isMongo ? 'connected' : 'fallback',
    time: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', providerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', threadRoutes);

// Centralized error handler
app.use(errorHandler);

// Start server if not imported
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    const isMongo = isRealDBConnected();
    const banner = [
      '==================================================================',
      '               DAYBOOK MAIL — EXECUTIVE INBOX API                 ',
      '==================================================================',
      ` Port:               http://localhost:${PORT}`,
      ` Environment:        ${env.NODE_ENV}`,
      ` Storage Engine:     ${isMongo ? 'MongoDB Atlas (Persistent)' : 'In-Memory Store (Volatile Fallback)'}`,
      ` Primary AI:         Gemini (${env.GEMINI_MODEL}) [${env.GEMINI_API_KEY ? 'Active' : 'Unconfigured - Fallback'}]`,
      ` Fallback AI:        Groq (${env.GROQ_MODEL}) [${env.GROQ_API_KEY ? 'Active' : 'Unconfigured - Rules'}]`,
      ` Google OAuth:       ${env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'Configured & Enabled' : 'Disabled (Missing Credentials)'}`,
      ` Microsoft OAuth:    ${env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET ? 'Configured & Enabled' : 'Disabled (Missing Credentials)'}`,
      ` Email Dispatch:     ${env.SEND_ENABLED ? 'LIVE DISPATCH ENABLED' : 'SAFETY GATE ACTIVE (Simulated Send)'}`,
      ` Health Check:       http://localhost:${PORT}/api/health`,
      '==================================================================',
    ].join('\n');

    logger.info(`\n${banner}\n`);
  });
}

export default app;
