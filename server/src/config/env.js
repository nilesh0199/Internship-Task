import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const renderExternalUrl = (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
const defaultClientUrl = process.env.CLIENT_URL || renderExternalUrl || 'http://localhost:5173';
const defaultGoogleRedirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  (renderExternalUrl
    ? `${renderExternalUrl}/api/auth/google/callback`
    : 'http://localhost:5000/api/auth/google/callback');
const defaultMicrosoftRedirectUri =
  process.env.MICROSOFT_REDIRECT_URI ||
  (renderExternalUrl
    ? `${renderExternalUrl}/api/auth/microsoft/callback`
    : 'http://localhost:5000/api/auth/microsoft/callback');

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default(defaultClientUrl),
  MONGODB_URI: z.string().optional().default(''),
  JWT_SECRET: z.string().default('daybook_super_secure_jwt_secret_demo_32_characters_minimum'),
  TOKEN_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  SEND_ENABLED: z.string().default('false').transform((val) => val === 'true'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().default(defaultGoogleRedirectUri),
  MICROSOFT_CLIENT_ID: z.string().optional().default(''),
  MICROSOFT_CLIENT_SECRET: z.string().optional().default(''),
  MICROSOFT_REDIRECT_URI: z.string().default(defaultMicrosoftRedirectUri),
  COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  DEMO_MODE: z
    .string()
    .default(process.env.NODE_ENV === 'production' ? 'false' : 'true')
    .transform((val) => val === 'true'),
  LOG_LEVEL: z.string().default('info'),
  AGENT_MAX_STEPS: z.string().default('5').transform((val) => parseInt(val, 10)),
  AGENT_TIMEOUT_MS: z.string().default('20000').transform((val) => parseInt(val, 10)),
  AGENT_DAILY_RUN_CAP: z.string().default('25').transform((val) => parseInt(val, 10)),
  ENABLE_LIVE_AGENT_LOOPS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables detected:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

const DEFAULT_JWT_PATTERNS = [
  'daybook_super_secure_jwt_secret_demo_32_characters_minimum',
  'replyright_super_secure_jwt_secret_demo_32_characters_minimum',
  'replace_with_32_byte_secret_hex_or_string',
];
const DEFAULT_ENCRYPTION_KEYS = [
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
];

if (parsed.data.NODE_ENV === 'production') {
  if (!parsed.data.JWT_SECRET || DEFAULT_JWT_PATTERNS.includes(parsed.data.JWT_SECRET)) {
    throw new Error(
      '[FATAL] Production startup rejected: JWT_SECRET must be configured with a unique, secure secret (not default template value).'
    );
  }
  if (
    !parsed.data.TOKEN_ENCRYPTION_KEY ||
    DEFAULT_ENCRYPTION_KEYS.includes(parsed.data.TOKEN_ENCRYPTION_KEY) ||
    parsed.data.TOKEN_ENCRYPTION_KEY.length !== 64
  ) {
    throw new Error(
      '[FATAL] Production startup rejected: TOKEN_ENCRYPTION_KEY must be a unique 32-byte hex string (64 characters) for AES-256-GCM encryption.'
    );
  }

  // Loud warning if running in production without MongoDB
  if (!parsed.data.MONGODB_URI || parsed.data.MONGODB_URI.trim() === '') {
    console.warn(
      '\x1b[31m%s\x1b[0m',
      '********************************************************************************\n' +
      ' [LOUD WARNING] PRODUCTION RUNNING WITHOUT MONGODB_URI!\n' +
      ' All database records (accounts, threads, drafts, agent runs, memories) are\n' +
      ' currently stored in VOLATILE IN-MEMORY storage.\n' +
      ' State will be completely ERASED whenever Render spins down or restarts.\n' +
      ' Configure MONGODB_URI in your Render environment variables to enable persistence.\n' +
      '********************************************************************************'
    );
  }
} else {
  if (DEFAULT_JWT_PATTERNS.includes(parsed.data.JWT_SECRET)) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '[SECURITY WARNING] Running with default demo JWT_SECRET in development. Set a unique JWT_SECRET before production deployment.'
    );
  }
  if (DEFAULT_ENCRYPTION_KEYS.includes(parsed.data.TOKEN_ENCRYPTION_KEY)) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '[SECURITY WARNING] Running with default demo TOKEN_ENCRYPTION_KEY in development. Set a unique 32-byte hex key before production deployment.'
    );
  }
}

export const env = parsed.data;
