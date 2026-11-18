import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { connectDB, isRealDBConnected } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler, apiRateLimiter } from './middleware/index.js';
import authRoutes from './routes/authRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import threadRoutes from './routes/threadRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import { startAgentScheduler } from './agents/index.js';
import { startDemoLiveFeed } from './services/demoLiveFeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const indexPath = path.join(clientDistPath, 'index.html');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || env.PORT || 5000;
const HOST = '0.0.0.0';

// Trust reverse proxy for deployment on Render
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
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, same-origin, server-to-server)
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

// Ultra lightweight health ping (no DB touch, for Render and UptimeRobot)
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
    demoMode: !!env.DEMO_MODE,
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api', providerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', threadRoutes);
app.use('/api/agents', agentRoutes);

// Unknown /api routes must always return JSON 404
app.all('/api/*', (req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      message: `API endpoint not found: ${req.method} ${req.path}`,
      code: 'NOT_FOUND',
    },
  });
});

// Centralized error handler for API exceptions
app.use(errorHandler);

// Production static client serving and SPA fallback
if (fs.existsSync(clientDistPath)) {
  // Long cache for hashed static assets, no-cache for index.html
  app.use(
    express.static(clientDistPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    })
  );

  // SPA fallback: any GET request not starting with /api or /healthz serves index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/healthz')) {
      return next();
    }
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(indexPath);
    }
    return next();
  });
}

// Start server if executed directly
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('src/index.js') ||
    process.argv[1].endsWith('src\\index.js'));

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  // Start autonomous background scheduler and live demo feed
  startAgentScheduler();
  startDemoLiveFeed();

  app.listen(PORT, HOST, () => {
    const isMongo = isRealDBConnected();
    const banner = [
      '==================================================================',
      '               DAYBOOK MAIL — EXECUTIVE INBOX API                 ',
      '==================================================================',
      ` Host & Port:        http://${HOST}:${PORT}`,
      ` Environment:        ${env.NODE_ENV}`,
      ` Storage Engine:     ${isMongo ? 'MongoDB Atlas (Persistent)' : 'In-Memory Store (Volatile Fallback)'}`,
      ` Primary AI:         Gemini (${env.GEMINI_MODEL}) [${env.GEMINI_API_KEY ? 'Active' : 'Unconfigured - Fallback'}]`,
      ` Fallback AI:        Groq (${env.GROQ_MODEL}) [${env.GROQ_API_KEY ? 'Active' : 'Unconfigured - Rules'}]`,
      ` Google OAuth:       ${env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'Configured & Enabled' : 'Disabled (Missing Credentials)'}`,
      ` Microsoft OAuth:    ${env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET ? 'Configured & Enabled' : 'Disabled (Missing Credentials)'}`,
      ` Email Dispatch:     ${env.SEND_ENABLED ? 'LIVE DISPATCH ENABLED' : 'SAFETY GATE ACTIVE (Simulated Send)'}`,
      ` Agent Runtime:     maxSteps=${env.AGENT_MAX_STEPS}, timeoutMs=${env.AGENT_TIMEOUT_MS}, dailyCap=${env.AGENT_DAILY_RUN_CAP}/client, liveLoops=${env.ENABLE_LIVE_AGENT_LOOPS && (env.GEMINI_API_KEY || env.GROQ_API_KEY) ? 'ENABLED' : 'WORKFLOW FALLBACK'}`,
      ` Demo Mode:          ${env.DEMO_MODE ? 'ENABLED (Sample Accounts Active)' : 'DISABLED (Isolated Production)'}`,
      ` Health Check:       http://localhost:${PORT}/api/health`,
      ` Health Ping:        http://localhost:${PORT}/healthz`,
      ` Static Client:      ${fs.existsSync(clientDistPath) ? 'Active (' + clientDistPath + ')' : 'Not Built (API Only)'}`,
      '==================================================================',
    ].join('\n');

    logger.info(`\n${banner}\n`);
  });
}

export default app;
