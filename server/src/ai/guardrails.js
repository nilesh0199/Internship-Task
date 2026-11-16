const FINANCIAL_AND_LEGAL_KEYWORDS = [
  'term sheet',
  'wire transfer',
  'docusign',
  'countersignature',
  'offer letter',
  'equity grant',
  'carta',
  'trademark',
  'infringement',
  'nda',
  'non-disclosure',
  'promissory note',
  'credit authorization',
];

/**
 * Extracts all dollar currency figures from text (e.g. $1,000, $45,000, $500)
 * @param {string} text
 * @returns {number[]}
 */
function extractDollarAmounts(text) {
  const matches = text.match(/\$[\d,]+(\.\d{2})?/g) || [];
  return matches.map((m) => parseFloat(m.replace(/[$,]/g, ''))).filter((n) => !isNaN(n));
}

/**
 * Evaluates risk-aware guardrails in code.
 * Overrides dangerous LLM outputs (e.g. marking VIPs or contracts as NO_REPLY_NEEDED).
 * @param {Object} classification - LLM generated classification
 * @param {Object} thread - Target thread
 * @param {Array<Object>} messages - Thread messages
 * @param {Object} playbook - Client playbook
 * @returns {Object} Guardrail-enforced classification
 */
export function enforceRiskGuardrails(classification, thread, messages, playbook) {
  const latestMessage = messages[messages.length - 1] || {};
  const bodyText = (latestMessage.bodyText || thread.snippet || '').toLowerCase();
  const subject = (thread.subject || '').toLowerCase();
  const senderEmail = (latestMessage.from?.email || thread.participants?.[0]?.email || '').toLowerCase();
  const senderDomain = senderEmail.split('@')[1] || '';

  const vipSenders = (playbook?.vipSenders || []).map((s) => s.toLowerCase());
  const vipDomains = (playbook?.vipDomains || []).map((d) => d.toLowerCase());

  const isVip =
    vipSenders.includes(senderEmail) ||
    vipDomains.some((d) => senderDomain.endsWith(d)) ||
    thread.participants?.some((p) => p.isVip);

  const fullText = `${subject} ${bodyText}`;
  const amounts = extractDollarAmounts(fullText);
  const maxAmount = amounts.length ? Math.max(...amounts) : 0;
  const hasLegalKeywords = FINANCIAL_AND_LEGAL_KEYWORDS.some((kw) => fullText.includes(kw));

  const clientFirstName = (playbook?.name || 'Priya').split(' ')[0].toLowerCase();
  const isDirectClientInquiry =
    fullText.includes(`${clientFirstName},`) ||
    fullText.includes(`hi ${clientFirstName}`) ||
    fullText.includes(`dear ${clientFirstName}`) ||
    fullText.includes(`what is your take`) ||
    fullText.includes(`what do you think`);

  let modified = { ...classification };
  const guardrailsTriggered = [];

  // Guardrail 1: VIP Sender Immunity
  if (isVip && modified.label === 'NO_REPLY_NEEDED') {
    modified.label = 'NEEDS_REVIEW';
    modified.needs_review = true;
    modified.reason = `[Guardrail Triggered] Sender (${senderEmail}) is on executive VIP list. VIP correspondence cannot be auto-muted.`;
    guardrailsTriggered.push('GUARDRAIL_VIP_OVERRIDE');
  }

  // Guardrail 2: High Financial or Contract Scrutiny
  if ((maxAmount > 500 || hasLegalKeywords) && modified.label === 'NO_REPLY_NEEDED') {
    modified.label = maxAmount > 1000 ? 'CLIENT_TO_REPLY' : 'NEEDS_REVIEW';
    modified.needs_review = modified.label === 'NEEDS_REVIEW';
    modified.reason = `[Guardrail Triggered] Email contains contract terms or value exceeding $500 ($${maxAmount.toLocaleString()}). Escalate for human signoff.`;
    guardrailsTriggered.push('GUARDRAIL_FINANCIAL_LEGAL_OVERRIDE');
  }

  // Guardrail 3: Direct Question to Client
  if (isDirectClientInquiry && modified.label === 'NO_REPLY_NEEDED') {
    modified.label = 'CLIENT_TO_REPLY';
    modified.reason = `[Guardrail Triggered] Direct question specifically addressed to ${playbook?.name || 'client'}.`;
    guardrailsTriggered.push('GUARDRAIL_DIRECT_INQUIRY_OVERRIDE');
  }

  if (guardrailsTriggered.length > 0) {
    modified.signals_used = [...(modified.signals_used || []), ...guardrailsTriggered];
    modified.guardrailTriggered = true;
    modified.guardrailRule = guardrailsTriggered.join(', ');
  }

  return modified;
}
