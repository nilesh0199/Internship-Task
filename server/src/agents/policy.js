import { env } from '../config/env.js';

/**
 * Default autonomy levels for the agent collective
 */
export const DEFAULT_AUTONOMY = {
  triage: 'auto',
  scheduling: 'propose',
  followup: 'propose',
  drafting: 'propose',
  digest: 'auto',
  guardian: 'auto',
};

/**
 * Default enabled flags for each agent
 */
export const DEFAULT_ENABLED_AGENTS = {
  triage: true,
  scheduling: true,
  followup: true,
  drafting: true,
  digest: true,
  guardian: true,
};

/**
 * Checks if the global agent kill switch is engaged
 * Controlled via AGENTS_ENABLED environment variable (default: true)
 */
export function isGlobalAgentsEnabled() {
  if (process.env.AGENTS_ENABLED === 'false' || process.env.AGENTS_ENABLED === '0') {
    return false;
  }
  return true;
}

/**
 * Resolves the active autonomy level for a specific agent and client
 * @param {Object} client - The client document containing playbook
 * @param {string} agentId - 'triage' | 'scheduling' | 'followup' | 'drafting' | 'digest' | 'guardian'
 * @returns {'auto'|'propose'|'off'}
 */
export function getAgentAutonomy(client, agentId) {
  if (!isGlobalAgentsEnabled()) {
    return 'off';
  }

  const enabled = client?.playbook?.agentSettings?.enabledAgents?.[agentId];
  if (enabled === false) {
    return 'off';
  }

  const clientLevel = client?.playbook?.agentAutonomy?.[agentId];
  if (clientLevel && ['auto', 'propose', 'off'].includes(clientLevel)) {
    return clientLevel;
  }

  return DEFAULT_AUTONOMY[agentId] || 'propose';
}

/**
 * Checks whether an agent is allowed to run at all for this client
 * @param {Object} client
 * @param {string} agentId
 * @returns {boolean}
 */
export function isAgentActive(client, agentId) {
  const autonomy = getAgentAutonomy(client, agentId);
  return autonomy !== 'off';
}
