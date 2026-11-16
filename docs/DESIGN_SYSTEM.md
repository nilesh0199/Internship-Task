# DESIGN SYSTEM & UI/UX SPECIFICATION — ReplyRight

> **Aesthetic Philosophy**: *Calm, editorial, high-trust.*  
> ReplyRight intentionally rejects generic neon gradients and hyperactive SaaS tropes in favor of an understated, warm editorial aesthetic reminiscent of high-end Swiss publications and minimalist Scandinavian tools. The visual tone instills calm clarity in an otherwise chaotic email environment.

---

## 1. Design Principles & Color Tokens

### 1.1. Color Palette

```
Warm Canvas:      #FAF8F5  (Default app background; avoids harsh monitor glare)
Card Surface:     #FFFFFF  (Pure white for foreground cards and panels)
Ink Primary:      #111827  (Deep off-black for primary headlines and bodies)
Ink Secondary:    #374151  (Muted dark slate for subtitles and metadata)
Ink Tertiary:     #6B7280  (Neutral gray for secondary timestamps and snippets)
Subtle Border:    #E5E7EB  (Delicate 1px borders preferred over heavy shadows)
Brand Accent:     #2563EB  (Restrained classic cobalt blue for primary CTA)
```

### 1.2. Semantic Label System
To ensure accessibility and cognitive clarity, **color is never used alone**—every status badge couples color with explicit semantic text.

| Label Type | Text Hex | Background Hex | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **`CLIENT_TO_REPLY`** | `#C25E38` (Terracotta) | `#FDF2E9` | Escalated to Priya for personal review / approval |
| **`ASSISTANT_TO_REPLY`** | `#0F766E` (Deep Teal) | `#F0FDFA` | Delegated to Maya to triage and reply |
| **`NO_REPLY_NEEDED`** | `#64748B` (Neutral Slate) | `#F1F5F9` | Informational, newsletter, or resolved thread |
| **`NEEDS_REVIEW`** | `#7C3AED` (Violet) | `#F5F3FF` | Low AI confidence or safety guardrail trigger |

---

## 2. Typography

1. **User Interface Font (`sans`)**:
   - `Inter`, system-ui, -apple-system, sans-serif.
   - Clean, neutral, high x-height for dense email scanning.
2. **Client Heading Font (`serif`)**:
   - `Fraunces`, Georgia, serif.
   - Used exclusively in Priya's Client Decision Queue to create an elevated, thoughtful executive reading environment.

### Type Scale:
- `text-xs`: 12px / 16px (Badges, timestamps, pills)
- `text-sm`: 14px / 20px (Thread list snippets, metadata, table data)
- `text-base`: 16px / 24px (Email body copy, decision card context)
- `text-lg`: 18px / 28px (Panel headers, section titles)
- `text-xl`: 20px / 28px (Modal titles, drawer headers)
- `text-2xl`: 24px / 32px (Client decision questions in serif)

---

## 3. Core Component Specifications

### 3.1. ConfidenceDots (`<ConfidenceDots level="high|medium|low" />`)
- **Rule**: Raw percentages (e.g. *"87.4% confident"*) confuse users. Confidence is visualized as a 3-dot pip indicator:
  - **High** (>= 0.80): 3 filled emerald pips `● ● ●` (*High confidence*)
  - **Medium** (0.55 – 0.79): 2 filled amber pips `● ● ○` (*Medium confidence*)
  - **Low** (< 0.55): 1 filled violet pip `● ○ ○` (*Low confidence — Needs Review*)

### 3.2. ThreadRow (`<ThreadRow thread={thread} isSelected={...} />`)
- Multi-line row in the center list pane:
  - Top line: Sender name, VIP star icon, timestamp, unread indicator dot.
  - Middle line: Subject (bold if unread) + `LabelBadge`.
  - Bottom line: 1-line snippet, attachment icon, aging warning pill if > 24h.
  - Hover: Subtle `#F3F4F6` background transition. Selected: Light blue border highlight.

### 3.3. AIReasonPanel (`<AIReasonPanel classification={...} />`)
- Positioned in the Assistant workspace right-hand inspector.
- Sections:
  1. Header: Primary Label + ConfidenceDots + Provider badge (`Gemini 2.0 Flash`).
  2. Summary: One-sentence takeaway.
  3. Reasoning: 2-3 sentences explaining *why* responsibility was assigned.
  4. Evidence: Quoted excerpt highlighted in warm yellow callout.
  5. Action: Inline button **"Override Label"** and **"Make this a Playbook Rule"**.

### 3.4. DecisionCard (`<DecisionCard decision={...} />`)
- Core component of Priya's mobile decision queue:
  - Large serif title stating the core question.
  - Urgency & Deadline tag (e.g. `Due: Today 5 PM`).
  - Bulleted context (max 3 points).
  - Draft preview toggle (if Maya has prepared a response).
  - Primary Action buttons:
    - `[Approve Maya's Draft]` (Solid dark)
    - `[Reply Myself]` (Outline)
    - `[Hand to Maya]` (With optional note dialog)
    - `[Snooze 24h]` (Subtle text)

### 3.5. Four Mandatory Screen States
Every screen component must implement:
1. **Skeleton**: Shimmering layout matching exact heights of badges and rows.
2. **Empty State**: Calm illustration or clean icon + reassuring text (e.g. *"Inbox Zero — Priya's decision queue is completely clear."*).
3. **Error State**: Non-intrusive banner with explanation and a **"Try Again"** button.
4. **Success State**: Instant optimistic DOM update accompanied by a 5-second Sonner toast with an **[Undo]** button.

---

## 4. Keyboard Navigation (Assistant Power Mode)

The Assistant workspace supports lightning-fast keyboard-only triage:

| Shortcut | Action |
| :--- | :--- |
| `j` / `Down` | Move selection down to next thread |
| `k` / `Up` | Move selection up to previous thread |
| `Enter` / `Space` | Open thread in detail view |
| `c` | Reclassify as `CLIENT_TO_REPLY` |
| `a` | Reclassify as `ASSISTANT_TO_REPLY` |
| `n` | Reclassify as `NO_REPLY_NEEDED` (Quiet Folder) |
| `r` | Focus draft reply composer |
| `e` | Archive thread |
| `/` | Focus search bar |
| `Cmd + K` / `Ctrl + K` | Open Command Palette / AI Chat |
| `Esc` | Close modal, drawer, or deselect |

---

## 5. Responsive Form Factors

### 1. Desktop (>= 1280px) — 3 Panes:
- Left (240px): Navigation, Segments, Playbook & Account status.
- Center (380px – 480px): Thread list with quick search and filter pills.
- Right (Flex 1): Thread reader, AI reasoning inspector, and draft lane.

### 2. Tablet (768px – 1279px) — 2 Panes:
- Navigation sidebar collapses into a drawer accessed via hamburger icon.
- Split screen: Thread list (40%) and Thread detail (60%).

### 3. Mobile (< 768px) — Single Column Touch Experience:
- Full screen stack.
- Assistant: Thread list pushes to full-screen thread reader with sticky bottom action bar.
- Client View: Card stack with swipe gestures:
  - **Swipe Right**: Delegate to Maya.
  - **Swipe Left**: Mark Handled.
