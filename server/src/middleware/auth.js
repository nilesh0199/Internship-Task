import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { store } from '../services/store.js';
import { logger } from '../utils/logger.js';

/**
 * Signs a JWT session token
 * @param {Object} payload 
 * @returns {string}
 */
export function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Express middleware ensuring request has a valid authenticated JWT session
 */
export async function authRequired(req, res, next) {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Authentication required. Please log in.', code: 'UNAUTHORIZED' },
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await store.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: { message: 'User session no longer valid.', code: 'USER_NOT_FOUND' },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn({ err: err.message }, '[Auth] Invalid or expired JWT token');
    return res.status(401).json({
      ok: false,
      error: { message: 'Session expired. Please log in again.', code: 'INVALID_TOKEN' },
    });
  }
}

/**
 * Role-based access control middleware
 * @param {Array<string>} roles - e.g. ['assistant', 'client']
 */
export function roleRequired(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Authentication required.', code: 'UNAUTHORIZED' },
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: { message: 'Forbidden. Insufficient permissions for this action.', code: 'FORBIDDEN' },
      });
    }

    next();
  };
}
