import { env } from '../../config/env.js';

// In-memory daily counter keyed by `${clientId}:${YYYY-MM-DD}`
const dailyCounters = new Map();

/**
 * Returns formatted date string YYYY-MM-DD
 */
function getTodayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Checks if the client has reached the daily agent execution cap
 * @param {string} clientId
 * @returns {boolean} true if under cap (can run), false if exceeded
 */
export function checkDailyCap(clientId) {
  const cap = env.AGENT_DAILY_RUN_CAP || 25;
  const key = `${clientId || 'default'}:${getTodayKey()}`;
  const current = dailyCounters.get(key) || 0;
  return current < cap;
}

/**
 * Increments the daily agent execution counter for a client
 * @param {string} clientId
 * @returns {number} new count
 */
export function incrementDailyCap(clientId) {
  const key = `${clientId || 'default'}:${getTodayKey()}`;
  const current = dailyCounters.get(key) || 0;
  const next = current + 1;
  dailyCounters.set(key, next);
  return next;
}

/**
 * Returns current daily run count for a client
 * @param {string} clientId
 * @returns {number}
 */
export function getDailyUsage(clientId) {
  const key = `${clientId || 'default'}:${getTodayKey()}`;
  return dailyCounters.get(key) || 0;
}

/**
 * Resets all daily counters (for tests and dev)
 */
export function resetDailyCap() {
  dailyCounters.clear();
}
