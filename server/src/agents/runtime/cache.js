import crypto from 'crypto';

// In-memory cache for agent loop runs
const agentRunCache = new Map();

/**
 * Generates a deterministic cache key for an agent run on a thread
 * @param {string} agentId
 * @param {string} threadId
 * @param {string} latestMessageId
 * @returns {string}
 */
export function generateCacheKey(agentId, threadId, latestMessageId) {
  const raw = `${agentId || 'unknown'}:${threadId || 'no_thread'}:${latestMessageId || 'no_msg'}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Retrieves cached agent run result if present
 * @param {string} key
 * @returns {Object|null}
 */
export function getAgentCache(key) {
  if (!key) return null;
  return agentRunCache.get(key) || null;
}

/**
 * Stores an agent run result in cache
 * @param {string} key
 * @param {Object} value
 */
export function setAgentCache(key, value) {
  if (!key || !value) return;
  agentRunCache.set(key, {
    ...value,
    cachedAt: new Date(),
  });
  // Maintain cache size under 1000 items
  if (agentRunCache.size > 1000) {
    const firstKey = agentRunCache.keys().next().value;
    agentRunCache.delete(firstKey);
  }
}

/**
 * Clears agent run cache (for testing)
 */
export function clearAgentCache() {
  agentRunCache.clear();
}
