import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'bodyHtml',
      'bodyText',
      'body',
      'emailBody',
      'message.bodyHtml',
      'message.bodyText',
      'draft.bodyHtml',
      'draft.bodyText',
      'req.body.password',
      'req.body.bodyHtml',
      'req.body.bodyText',
      'password',
      'authorization',
      'cookie',
    ],
    remove: true,
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
