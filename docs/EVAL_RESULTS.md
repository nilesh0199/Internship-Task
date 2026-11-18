# EVAL_RESULTS.md — Agent Evaluation Benchmark Report

> **Generated**: `2026-11-18T03:30:47.884Z`  
> **Benchmark Dataset**: `server/eval/dataset.json` (38 synthetic labeled threads)  
> **Evaluation Mode**: Baseline (Static Fast-Path Heuristics) vs Agentic Pipeline (Baseline + `TriageInvestigator` Closed-Loop Agent)

---

## 1. Honest Benchmark Disclaimer & Methodology

> [!WARNING]
> **Synthetic Benchmark Caveat**:
> Results are evaluated on a curated benchmark of **38 synthetic test threads** designed specifically to test edge cases (high-risk wire alterations, personal officer guarantee traps, CC-only directives, casual VIP coffee requests). Real-world email distributions have significant class imbalance and unbounded ambiguity. **Never cite these numbers as real-world production performance.**

### Benchmark Composition:
- **Quiet Notifications** (`NO_REPLY_NEEDED`): 8 threads (receipts, newsletters, automated CI/CD alerts, DocuSign archive confirmations).
- **Routine Assistant Logistics** (`ASSISTANT_TO_REPLY`): 10 threads (catering headcounts, flight seating, Form W-9 requests, rescheduling, hotel confirmation).
- **Executive Approvals** (`CLIENT_TO_REPLY`): 10 threads (term sheet signatures, board consent resolutions, offer letters, legal settlements).
- **Ambiguous Traps** (`NEEDS_REVIEW`): 10 threads (unexpected wire banking changes, personal guarantees, CC-only fyi, ambiguous "please advise", whistleblower notices).

---

## 2. Comparative Benchmark Summary

| Evaluation Metric | Baseline (Static Heuristics) | Agentic Pipeline (Closed-Loop) | Delta / Improvement |
| :--- | :--- | :--- | :--- |
| **Accuracy on Benchmark** | **68.4%** | **97.4%** | **+29.0%** |
| **Escalation Rate (`NEEDS_REVIEW`)** | **18.4%** | **26.3%** | **+7.9%** |
| **Average Turns / Steps per Item** | **1.00 steps** | **1.74 steps** | Multi-turn tool loop |
| **Average Latency per Item** | **2.0 ms** | **13.8 ms** | Includes tool executions |

---

## 3. Confusion Matrices

### (A) Baseline (Static Fast-Path Rules)
| Actual \ Predicted | CLIENT_TO_REPLY | ASSISTANT_TO_REPLY | NO_REPLY_NEEDED | NEEDS_REVIEW |
| :--- | :---: | :---: | :---: | :---: |
| **CLIENT_TO_REPLY** | 10 | 0 | 0 | 0 |
| **ASSISTANT_TO_REPLY** | 0 | 7 | 1 | 2 |
| **NO_REPLY_NEEDED** | 0 | 0 | 6 | 2 |
| **NEEDS_REVIEW** | 6 | 1 | 0 | 3 |

*Observations on Baseline Failures:*
1. **Wire Change Fraud Trap**: The baseline saw "Invoice #9910" and naively classified it as `ASSISTANT_TO_REPLY`, failing to catch the $14,500 wire routing alteration.
2. **Personal Guarantee Trap**: The baseline saw "Contract" and routed it to `CLIENT_TO_REPLY` for signature, missing that it required an unprecedented personal officer guarantee.
3. **Casual VIP Outreach**: The baseline routed casual coffee requests directly into the client's urgent queue without calendar conflict investigation.

### (B) Agentic Pipeline (Baseline + Closed-Loop TriageInvestigator)
| Actual \ Predicted | CLIENT_TO_REPLY | ASSISTANT_TO_REPLY | NO_REPLY_NEEDED | NEEDS_REVIEW |
| :--- | :---: | :---: | :---: | :---: |
| **CLIENT_TO_REPLY** | 10 | 0 | 0 | 0 |
| **ASSISTANT_TO_REPLY** | 0 | 9 | 1 | 0 |
| **NO_REPLY_NEEDED** | 0 | 0 | 8 | 0 |
| **NEEDS_REVIEW** | 0 | 0 | 0 | 10 |

*Observations on Agentic Performance:*
1. **Tool-Driven Disambiguation**: The `TriageInvestigator` agent inspected sender history, verified playbook rules, and checked risk keywords across 2–3 iterative steps.
2. **Zero Inappropriate Autonomy**: When ambiguous or high-risk signals were encountered (<0.70 confidence, wire changes, personal guarantees), the agent escalated cleanly to `NEEDS_REVIEW` with full evidence audit traces.

---

## 4. How to Reproduce

Run the automated evaluation benchmark via:
```bash
npm run eval --prefix server
```
Or run deterministically with explicit stub mode:
```bash
EVAL_STUB=true npm run eval --prefix server
```
