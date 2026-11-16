/**
 * Deterministic Heuristic Engine
 * Used as a fallback when external LLM providers (Gemini/Groq) are unreachable.
 * Guaranteed to never crash or throw unhandled exceptions.
 */
export function runHeuristicRules(thread, messages = [], playbook = {}) {
  const latestMessage = messages[messages.length - 1] || {};
  const fullText = `${thread.subject} ${latestMessage.snippet || thread.snippet} ${latestMessage.bodyText || ''}`.toLowerCase();
  const senderEmail = (latestMessage.from?.email || '').toLowerCase();

  const isVip =
    (playbook.vipSenders || []).some((s) => senderEmail.includes(s.toLowerCase())) ||
    (playbook.vipDomains || []).some((d) => senderEmail.endsWith(d.toLowerCase()));

  // 1. High-stakes Client to Reply triggers
  const clientKeywords = [
    'term sheet',
    'valuation',
    'docusign',
    'countersignature',
    'offer letter',
    'equity',
    'wire transfer',
    'board deck',
    'acquisition',
    'credit request',
    'priya,',
  ];

  if (clientKeywords.some((kw) => fullText.includes(kw))) {
    return {
      label: 'CLIENT_TO_REPLY',
      confidence: 0.85,
      reason: 'AI unavailable, used rules: Detected executive decision keywords (contracts, investments, or direct founder inquiry).',
      evidence: `Subject matched keywords: "${thread.subject}"`,
      summary: `Executive action required on ${thread.subject}`,
      decision: {
        question: `Review and decide on ${thread.subject}?`,
        options: ['Approve', 'Decline', 'Delegate to Assistant'],
        deadline: 'Review by end of business day',
        consequence: 'Pending transaction or negotiation on hold',
      },
      action_required: true,
      due_date: null,
      meetings: [],
      needs_review: false,
      signals_used: ['RULE_BASED_FALLBACK', 'EXECUTIVE_KEYWORDS'],
      provider: 'rules_engine',
      model: 'heuristic_v1',
    };
  }

  // 2. Assistant to Reply triggers
  const assistantKeywords = [
    'catering',
    'flight',
    'hotel',
    'reschedule',
    'calendar',
    'invoice',
    'parking',
    'receipt',
    'shipping',
    'dhl',
    'headshot',
    'cleaning',
    'chauffeur',
    'maya,',
  ];

  if (assistantKeywords.some((kw) => fullText.includes(kw))) {
    return {
      label: 'ASSISTANT_TO_REPLY',
      confidence: 0.88,
      reason: 'AI unavailable, used rules: Operational coordination, scheduling, or logistics assigned to Assistant.',
      evidence: `Keywords identified: "${thread.subject}"`,
      summary: `Administrative logistics: ${thread.subject}`,
      decision: null,
      action_required: true,
      due_date: null,
      meetings: [],
      needs_review: false,
      signals_used: ['RULE_BASED_FALLBACK', 'ASSISTANT_LOGISTICS'],
      provider: 'rules_engine',
      model: 'heuristic_v1',
    };
  }

  // 3. VIP sender default
  if (isVip) {
    return {
      label: 'CLIENT_TO_REPLY',
      confidence: 0.75,
      reason: 'AI unavailable, used rules: Correspondence from VIP contact; routed to Client.',
      evidence: `Sender on VIP list: ${senderEmail}`,
      summary: `VIP communication from ${senderEmail}`,
      decision: {
        question: `Respond to VIP contact ${senderEmail}?`,
        options: ['Reply', 'Have Maya Schedule', 'Archive'],
        deadline: null,
        consequence: 'VIP response delay',
      },
      action_required: true,
      due_date: null,
      meetings: [],
      needs_review: true,
      signals_used: ['RULE_BASED_FALLBACK', 'VIP_MATCH'],
      provider: 'rules_engine',
      model: 'heuristic_v1',
    };
  }

  // 4. Default safe fallback
  return {
    label: 'NEEDS_REVIEW',
    confidence: 0.5,
    reason: 'AI unavailable, used rules: Ambiguous intent; flagged for Assistant review.',
    evidence: thread.snippet || thread.subject,
    summary: thread.subject,
    decision: null,
    action_required: true,
    due_date: null,
    meetings: [],
    needs_review: true,
    signals_used: ['RULE_BASED_FALLBACK', 'AMBIGUOUS_DEFAULT'],
    provider: 'rules_engine',
    model: 'heuristic_v1',
  };
}
