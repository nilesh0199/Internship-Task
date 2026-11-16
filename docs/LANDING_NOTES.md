# Landing Page UI/UX Audit & Refinement Plan — Daybook Mail

> **Audit Date**: 2026-11-16  
> **Target Experience**: Funded, calm, premium product site (Linear/Notion polish, Pinterest restraint, high-trust executive tone).

---

## 1. Visual Audit Across Viewports (1440px, 768px, 390px)

### A. Desktop Viewport (1440 × 900px)
- **Strengths**:
  - Typography pairing (`Fraunces` editorial serif headline + clean `Inter` sans body) immediately communicates executive authority and high trust.
  - Three-column drifting email card collage provides authentic product texture with realistic legal, venture, and catering scenarios.
  - The Interactive AI Reasoning playground convincingly proves the 7-stage pipeline with real quote evidence, confidence score, and guardrail tags.
- **Weaknesses & Polish Opportunities**:
  - H1 lacks clamp-based fluid optical sizing and tight tracking (`tracking-[-0.03em]`, `text-wrap: balance`).
  - Hero card columns lack seamless infinite looping and the signature "live classification" moment where an unclassified card resolves into a colored badge.
  - Feature visuals in "The Client Decision Queue", "The Delegation Playbook", and "Quiet Folder Guarantee" look like flat card mockups rather than high-fidelity product previews in authentic device frames (browser window frame for assistant, phone frame for client queue).
  - Sticky nav is statically translucent; it should start transparent and smoothly blur with a hairline border upon scrolling ~24px, with active section link tracking.

---

### B. Tablet Viewport (768 × 1024px)
- **Problems Identified**:
  - **Navbar Congestion**: At 768px (the `md:` breakpoint), all 4 links (`How it works`, `Features`, `Interactive AI`, `Security & Safety`), `Sign in`, and `Try the demo` compete for horizontal space, squeezing the logo and causing "Daybook Mail" to wrap awkwardly to two lines.
  - **Card Collage Squeeze**: The 3 columns in the hero collage become overly compressed (~210px each), leading to truncated sender names and crowded badges.
  - **Grid Alignment**: 2-column feature blocks feel slightly unbalanced before stacking.

---

### C. Mobile Viewport (390 × 844px)
- **Critical Layout & Overflow Bugs**:
  - **Severe Horizontal Sprawl**: Diagnostic bounding box measurements showed `<main>` expanded to `1434.4px` width on a `390px` viewport, blowing off-screen to the right.
  - **Off-Screen CTAs**: The hero CTA buttons rendered at `x = 429px`, `x = 658px`, and `x = 845px`, making them unreachable on mobile without scrolling horizontally.
  - **Interactive Playground Overflow**: AI scenario tabs (`x = 474px`, `x = 628px`, `x = 792px`) were clipped off-screen.
  - **Missing Mobile Navigation**: At `< md`, the 4 desktop links were hidden with no mobile drawer or anchor menu fallback.
  - **No `whitespace-nowrap` on Brand**: The logo text wraps onto two lines next to the mark.

---

## 2. Refinement Goals & Action Plan

### 1. Typography & Layout Engine
- Enforce fluid optical sizing on H1: `text-[clamp(2.5rem,6.5vw,4.75rem)] font-serif font-bold tracking-[-0.03em] leading-[1.08] [text-wrap:balance]`.
- Strict horizontal overflow containment: `w-full max-w-full overflow-x-clip` on root wrapper, sections, and body.
- Consistent vertical rhythm: `py-24 md:py-32` between sections on desktop, `py-16 md:py-20` on mobile.
- Body line-length constraint: `max-w-[60ch]`.

### 2. Header & Sticky Navigation
- Responsive navbar: transparent at top, fades to `bg-[#FAF8F5]/85 backdrop-blur-md border-b border-black/[0.06]` after scrolling 24px using `framer-motion` scroll listener.
- `whitespace-nowrap` on brand logo with subtle hover spring.
- Clean mobile menu trigger (hamburger icon $\leftrightarrow$ close icon) opening a minimal slide-down / backdrop drawer with 44px min touch targets.
- Active section highlighting for anchor links with `scroll-mt-24`.

### 3. Hero Section & Signature Animation
- Staggered entrance animation using `framer-motion` (pill -> H1 mask reveal -> subhead -> CTAs -> collage).
- Refined drifting columns: GPU-accelerated (`transform: translate3d`), independent vertical drift speeds, pause on hover.
- **Signature Motion**: Rotating live classification effect where a card's status badge resolves from a shimmer skeleton to `CLIENT_TO_REPLY` with a spring pop, and `ConfidenceDots` fill in.
- Mobile responsiveness: show only 1 elegant center column on mobile (< 768px), 2 columns on tablet, and 3 columns on desktop.

### 4. High-Fidelity Product Previews in Device Frames
- **Two Connected Experiences** hero/feature preview:
  - Clean desktop browser window frame (subtle top bar with 3 dots `• • •`, URL pill `daybook.internal/assistant`, soft layered shadow) showcasing the Assistant 3-Pane Command Center.
  - Polished phone frame preview (bezel, speaker notch/island) showcasing Priya's Client Decision Queue.
- **Interactive Reasoning Playground**:
  - Fully responsive tab bar that wraps cleanly without horizontal overflow on mobile.
  - Equal-height card pairing with typewriter / reveal animation on rationale and quoted evidence.
- **Decision Card Animation**:
  - Interactive loop simulating "Approve Maya's Draft" with smooth transition to an uncluttered "You're all clear" state.
- **Playbook Preview**:
  - Dynamic rule chips appearing sequentially with a "Learned from your corrections" badge.

### 5. Accessibility & Motion Respect
- Full `prefers-reduced-motion` compliance using `useReducedMotion()`: graceful fallback to static, high-contrast layouts.
- 44px min touch targets on all interactive buttons and links.
- WCAG AA contrast compliance verified across all text and label pills.
- Honest, clear footer copy noting real vs simulated features without deceptive metrics.
