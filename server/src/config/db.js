import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;
let isInMemoryFallback = false;

/**
 * Initializes the MongoDB connection via Mongoose with graceful fallback
 * @returns {Promise<boolean>}
 */
export async function connectDB() {
  if (isConnected) return true;

  if (!env.MONGODB_URI || env.MONGODB_URI.trim() === '') {
    logger.warn('[DB] No MONGODB_URI configured. Running with in-memory persistence adapter.');
    isInMemoryFallback = true;
    return false;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    isConnected = true;
    logger.info(`[DB] Connected to MongoDB Atlas: ${conn.connection.host}`);
    return true;
  } catch (err) {
    logger.error({ err: err.message }, '[DB] Failed to connect to MongoDB Atlas. Activating in-memory persistence adapter.');
    isInMemoryFallback = true;
    return false;
  }
}

/**
 * Returns whether a real MongoDB connection is active
 * @returns {boolean}
 */
export function isRealDBConnected() {
  return isConnected;
}

/**
 * Returns whether the app is using the resilient in-memory fallback
 * @returns {boolean}
 */
export function isUsingFallbackDB() {
  return isInMemoryFallback;
}
