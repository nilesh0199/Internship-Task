import { logger } from '../utils/logger.js';

/**
 * Centralized Express Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred.';

  // Log error without recording email body parameters
  logger.error(
    {
      status,
      code,
      message,
      path: req.path,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    '[ErrorHandler] Request failed'
  );

  res.status(status).json({
    ok: false,
    error: {
      message,
      code,
      details: err.details || undefined,
    },
  });
}
