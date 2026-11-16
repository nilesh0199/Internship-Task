import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM

/**
 * Derives a 32-byte Buffer from the configured encryption key
 * @returns {Buffer}
 */
function getKeyBuffer() {
  const key = env.TOKEN_ENCRYPTION_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  return crypto.createHash('sha256').update(String(key)).digest();
}

/**
 * Encrypts a string using AES-256-GCM
 * @param {string} plainText - The sensitive string (e.g. OAuth token)
 * @returns {{ cipherText: string, iv: string, authTag: string }}
 */
export function encryptToken(plainText) {
  if (!plainText) {
    return { cipherText: '', iv: '', authTag: '' };
  }
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    cipherText: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts a cipher object using AES-256-GCM
 * @param {{ cipherText: string, iv: string, authTag: string }} payload
 * @returns {string} The decrypted plain text
 */
export function decryptToken({ cipherText, iv, authTag }) {
  if (!cipherText || !iv || !authTag) {
    return '';
  }
  const key = getKeyBuffer();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
