import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' && !env.DEMO_MODE ? 300 : 5000, // relaxed in demo/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' && !env.DEMO_MODE ? 60 : 500, // allow 500 attempts in demo/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      message: 'Too many authentication attempts. Please wait 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // max 10 failed attempts per 15 minutes per IP + email combination
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';
    const email = (req.body?.email || '').toLowerCase().trim();
    return `${ip}_${email}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    },
  },
});
