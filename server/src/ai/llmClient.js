import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { ClassificationOutputSchema } from './schemas.js';
import { runHeuristicRules } from './heuristicEngine.js';
import { logger } from '../utils/logger.js';

let geminiClient = null;
if (env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  } catch (err) {
    logger.warn({ err: err.message }, '[AI] Failed to initialize GoogleGenAI client');
  }
}

let groqClient = null;
if (env.GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
  } catch (err) {
    logger.warn({ err: err.message }, '[AI] Failed to initialize Groq client');
  }
}

/**
 * Builds the comprehensive prompt incorporating Playbook and recent corrections
 */
function buildPrompt(thread, messages, playbook = {}, corrections = []) {
  const recentMessages = messages.slice(-3);
  const formattedMessages = recentMessages
    .map(
      (m, idx) =>
        `Message ${idx + 1} (${m.from?.name || m.from?.email || 'Unknown'} -> ${m.direction}):\nSnippet: ${
          m.snippet || ''
        }\nBody: ${m.bodyText ? m.bodyText.substring(0, 500) : ''}`
    )
    .join('\n\n');

  const formattedCorrections = corrections.length
    ? corrections
        .slice(0, 10)
        .map(
          (c) =>
            `- When subject was "${c.threadContext?.subject}" from "${c.threadContext?.senderEmail}", assistant overrode from ${c.previousLabel} to ${c.correctedLabel} (Note: ${c.assistantNote || 'None'})`
        )
        .join('\n')
    : 'None yet.';

  const playbookTopics = (playbook.topicRules || [])
    .map((r) => `- [${r.disposition}] ${r.topic}: ${r.description || ''}`)
    .join('\n');

  return `You are ReplyRight AI, an intelligent executive email triage engine for assistant Maya managing client ${
    playbook.name || 'Priya Sharma'
  }'s inbox.
Classify who owns the next reply for this thread and structure decisions.

TARGET LABELS:
- "CLIENT_TO_REPLY": Approvals, signatures, legal/financial decisions > $1,000, term sheets, personal/family notes, direct strategic questions to the client.
- "ASSISTANT_TO_REPLY": Scheduling, calendar rescheduling, flights/hotels, invoices < $1,000, catering, vendor follow-ups, routine administration.
- "NO_REPLY_NEEDED": Newsletters, receipts, automated updates, FYI threads where client was only CC'd, resolved threads.
- "NEEDS_REVIEW": Low confidence, ambiguous tone, or conflicting directions.

CLIENT PLAYBOOK:
VIP Senders: ${(playbook.vipSenders || []).join(', ')}
VIP Domains: ${(playbook.vipDomains || []).join(', ')}
Max Assistant Spend Approval: $${playbook.financialThresholds?.maxAssistantApprovalUsd || 1000}
Topic Dispositions:
${playbookTopics}
Custom Instructions: ${playbook.customInstructions || 'None'}

RECENT ASSISTANT CORRECTIONS (FEW-SHOT LEARNING):
${formattedCorrections}

THREAD TO CLASSIFY:
Subject: "${thread.subject}"
Participants: ${(thread.participants || []).map((p) => `${p.name} <${p.email}>`).join(', ')}

${formattedMessages}

RESPONSE REQUIREMENT:
Respond ONLY with a valid JSON object matching this schema:
{
  "label": "ASSISTANT_TO_REPLY" | "CLIENT_TO_REPLY" | "NO_REPLY_NEEDED" | "NEEDS_REVIEW",
  "confidence": 0.0 to 1.0,
  "reason": "Clear 1-2 sentence explanation of why this label was chosen",
  "evidence": "Short direct quote from the email text supporting this",
  "summary": "Crisp single-sentence summary of the conversation",
  "decision": {
    "question": "Single question the client must answer (required if CLIENT_TO_REPLY)",
    "options": ["Option 1", "Option 2"],
    "deadline": "Deadline string if any",
    "consequence": "Risk if delayed"
  } | null,
  "action_required": true | false,
  "due_date": "ISO string" | null,
  "meetings": [],
  "needs_review": true | false,
  "signals_used": ["PLAYBOOK_RULE", "VIP_MATCH", etc.]
}`;
}

/**
 * Call Google Gemini with JSON enforcement
 */
async function callGemini(prompt) {
  if (!geminiClient) throw new Error('Gemini API key not configured');

  const response = await geminiClient.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const text = response.text;
  return JSON.parse(text);
}

/**
 * Call Groq with JSON mode fallback
 */
async function callGroq(prompt) {
  if (!groqClient) throw new Error('Groq API key not configured');

  const completion = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL,
    messages: [
      { role: 'system', content: 'You are a strict JSON-only email classification API.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const text = completion.choices[0]?.message?.content;
  return JSON.parse(text);
}

/**
 * Orchestrates LLM call with primary -> fallback -> rules fallback
 */
export async function invokeClassificationLLM(thread, messages, playbook, corrections) {
  const prompt = buildPrompt(thread, messages, playbook, corrections);
  const start = Date.now();

  let rawResult = null;
  let providerUsed = 'rules_engine';
  let modelUsed = 'heuristic_v1';

  // 1. Primary: Google Gemini
  if (env.GEMINI_API_KEY) {
    try {
      rawResult = await callGemini(prompt);
      providerUsed = 'gemini';
      modelUsed = env.GEMINI_MODEL;
    } catch (geminiErr) {
      logger.warn({ err: geminiErr.message }, '[AI] Gemini call failed, attempting Groq fallback');
    }
  }

  // 2. Secondary Fallback: Groq
  if (!rawResult && env.GROQ_API_KEY) {
    try {
      rawResult = await callGroq(prompt);
      providerUsed = 'groq';
      modelUsed = env.GROQ_MODEL;
    } catch (groqErr) {
      logger.warn({ err: groqErr.message }, '[AI] Groq fallback failed, using heuristic rules');
    }
  }

  const latencyMs = Date.now() - start;

  // 3. Fallback: Heuristic Rules
  if (!rawResult) {
    const heuristic = runHeuristicRules(thread, messages, playbook);
    return {
      ...heuristic,
      latencyMs,
    };
  }

  // Schema Validation with 1 retry
  const parsed = ClassificationOutputSchema.safeParse(rawResult);
  if (!parsed.success) {
    logger.warn({ error: parsed.error.format() }, '[AI] Schema validation failed. Falling back to heuristic rules.');
    return {
      ...runHeuristicRules(thread, messages, playbook),
      latencyMs,
    };
  }

  return {
    ...parsed.data,
    provider: providerUsed,
    model: modelUsed,
    latencyMs,
  };
}
