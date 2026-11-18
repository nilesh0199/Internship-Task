/**
 * BaseAgent
 * Abstract interface for all specialized Daybook Mail autonomous inbox agents.
 * Every agent inherits from this class and implements run(thread, ctx).
 */
export class BaseAgent {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique lowercase identifier ('triage', 'scheduling', etc.)
   * @param {string} options.name - Human-readable name
   * @param {string} options.description - Clear, honest one-line description
   * @param {string[]} options.canDo - Specific list of capabilities
   * @param {string[]} options.neverDoes - Specific list of safety boundaries/limitations
   * @param {string[]} options.triggers - Event triggers ('ingest', 'new_message', 'client_action', 'schedule_tick', 'manual')
   * @param {'auto'|'propose'|'off'} [options.defaultAutonomy='propose'] - Default autonomy level
   */
  constructor({
    id,
    name,
    description,
    canDo = [],
    neverDoes = [],
    triggers = [],
    defaultAutonomy = 'propose',
    kind = 'workflow',
  }) {
    if (!id || !name) {
      throw new Error('Agent requires id and name');
    }
    this.id = id;
    this.name = name;
    this.kind = kind; // 'agent' (closed loop) | 'workflow' (deterministic pipeline)
    this.description = description;
    this.canDo = canDo;
    this.neverDoes = neverDoes;
    this.triggers = triggers;
    this.defaultAutonomy = defaultAutonomy;
  }

  /**
   * Determines if this agent should run for the given thread and trigger context
   * @param {Object} thread
   * @param {Object} ctx - { trigger, client, playbook, autonomy, messages }
   * @returns {boolean}
   */
  canRun(thread, ctx) {
    if (!this.triggers.includes(ctx.trigger)) {
      return false;
    }
    return true;
  }

  /**
   * Executes the agent's core specialized task
   * @param {Object} thread
   * @param {Object} ctx - { trigger, client, playbook, autonomy, messages, existingRuns }
   * @returns {Promise<AgentResult>}
   */
  async run(thread, ctx) {
    throw new Error(`run() not implemented by ${this.name}`);
  }

  /**
   * Helper to format a standardized AgentResult
   * @param {Object} data
   * @returns {Object} AgentResult
   */
  formatResult({
    action,
    outcome, // 'auto_handled' | 'proposed' | 'escalated' | 'skipped' | 'error' | 'reversed'
    summary,
    details = {},
    confidence = 0.95,
    requiresHuman = false,
    undo = null,
    usedLLM = false,
    fallbackUsed = false,
    durationMs = 0,
    kind = this.kind || 'workflow',
    steps = [],
    stopReason = null,
    usage = null,
    recordedSample = false,
  }) {
    return {
      agentId: this.id,
      kind,
      action,
      outcome,
      summary,
      details,
      confidence,
      requiresHuman,
      undo,
      usedLLM,
      fallbackUsed,
      durationMs,
      steps,
      stopReason,
      usage,
      recordedSample,
      startedAt: new Date(Date.now() - durationMs),
    };
  }

  /**
   * Metadata export for UI cards and discovery
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind || 'workflow',
      description: this.description,
      canDo: this.canDo,
      neverDoes: this.neverDoes,
      triggers: this.triggers,
      defaultAutonomy: this.defaultAutonomy,
    };
  }
}
