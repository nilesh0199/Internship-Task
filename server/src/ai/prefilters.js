const NO_REPLY_SENDERS = [
  'no-reply',
  'noreply',
  'mailer-daemon',
  'notifications@github.com',
  'billing@stripe.com',
  'uber.us@uber.com',
  'no-reply-aws@amazon.com',
  'reservations@united.com',
  'no-reply@zoom.us',
  'orders@amazon.com',
  'do-not-reply',
];

/**
 * Runs deterministic prefilters against email headers and sender metadata.
 * Returns a classification object if matched, or null to proceed to LLM.
 * @param {Object} thread
 * @param {Array<Object>} messages
 * @returns {Object|null}
 */
export function runDeterministicPrefilters(thread, messages = []) {
  const latestMessage = messages[messages.length - 1] || {};
  const headers = latestMessage.headers || {};
  const senderEmail = (latestMessage.from?.email || thread.participants?.[0]?.email || '').toLowerCase();

  // 1. Check List-Unsubscribe or bulk precedence headers
  if (headers.listUnsubscribe || headers.precedence === 'bulk' || headers.precedence === 'list') {
    return {
      label: 'NO_REPLY_NEEDED',
      confidence: 0.99,
      reason: 'Marketing newsletter or mailing list with List-Unsubscribe/bulk header. No conversational reply expected.',
      evidence: headers.listUnsubscribe ? 'List-Unsubscribe header present' : 'Precedence: bulk header present',
      summary: `Automated marketing newsletter: ${thread.subject}`,
      decision: null,
      action_required: false,
      due_date: null,
      meetings: [],
      needs_review: false,
      signals_used: ['PREFILTER_BULK_HEADER', 'ZERO_TOKEN_BYPASS'],
    };
  }

  // 2. Check automated/system noreply senders
  const isNoReplySender = NO_REPLY_SENDERS.some((pattern) => senderEmail.includes(pattern));
  if (isNoReplySender) {
    return {
      label: 'NO_REPLY_NEEDED',
      confidence: 0.99,
      reason: 'Automated system notification, receipt, or service update from a noreply address.',
      evidence: `Sender address (${senderEmail}) indicates automated delivery`,
      summary: `System receipt or notification: ${thread.subject}`,
      decision: null,
      action_required: false,
      due_date: null,
      meetings: [],
      needs_review: false,
      signals_used: ['PREFILTER_NOREPLY_SENDER', 'ZERO_TOKEN_BYPASS'],
    };
  }

  return null;
}
