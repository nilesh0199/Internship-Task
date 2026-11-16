import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
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
  max: 60, // allow 60 login/signup attempts per 15 mins
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
