# Rule: AI & Decision Engine Principles

1. **Thread-Level Context**:
   - Classify at the thread level using the latest 1-3 messages plus condensed older context. Never classify isolated messages.
2. **Strict Schema Validation**:
   - Every LLM completion must parse into the validated Zod classification schema (`label`, `confidence`, `reason`, `evidence`, `decision`, etc.).
   - On syntax or schema failure, retry once.
   - If retry fails, gracefully fall back to the heuristic rule engine and mark: `"AI unavailable, used rules"`. The app must never crash or blank-screen.
3. **Hard Guardrails in Code**:
   - VIP senders and domains can **never** resolve to `NO_REPLY_NEEDED` (escalate to `NEEDS_REVIEW` at minimum).
   - High-value financial, contract, wire, or legal terms (> $500) can **never** resolve to `NO_REPLY_NEEDED`.
   - Direct personal questions directed at the executive can **never** resolve to `NO_REPLY_NEEDED`.
4. **Provider Fallback Sequence**:
   - Primary: Google Gemini (`gemini-2.0-flash` via `@google/genai`).
   - Secondary Fallback: Groq SDK (`llama-3.3-70b-versatile`).
   - Final Fallback: Heuristic Rule Engine.
5. **Confidence Tiers**:
   - `>= 0.80`: Auto-apply label.
   - `0.55 – 0.79`: Apply label + flag for review.
   - `< 0.55`: Escalate to `NEEDS_REVIEW`.
   - Confidence must be displayed as 3-dot indicators (High/Medium/Low), never raw percentages.
6. **Chat Tools & Citations**:
   - Cmd+K AI uses LLM tool calling over MongoDB.
   - All references to email threads must include clickable markdown links.
