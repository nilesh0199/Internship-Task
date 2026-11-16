import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler, apiRateLimiter } from './middleware/index.js';
import authRoutes from './routes/authRoutes.js';
import providerRoutes from './routes/providerRoutes.js';

const app = express();
const PORT = env.PORT;
const CLIENT_URL = env.CLIENT_URL;

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      // In development allow localhost origins, or match CLIENT_URL
      if (origin === CLIENT_URL || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for prototype evaluation
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/api', apiRateLimiter);

// Connect database (with automatic fallback to in-memory store)
connectDB();

// Base health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'ReplyRight API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    storage: 'resilient_store',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', providerRoutes);

// Centralized error handler
app.use(errorHandler);

// Start server if not imported
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`[ReplyRight Server] Running on http://localhost:${PORT}`);
    logger.info(`[ReplyRight Server] Health check available at http://localhost:${PORT}/api/health`);
  });
}

export default app;
