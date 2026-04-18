# SkillEx UI UX Handoff Pack for Claude

## 1) Project Snapshot

SkillEx is a peer-to-peer skill exchange platform where users can:

- register and onboard
- discover matches
- request exchanges
- chat in messages
- manage profile and settings
- connect with people
- engage in community feed

Primary UX goal: improve trust, clarity, conversion, and flow completion without breaking existing behavior.

---

## 2) Tech and Delivery Constraints

- Frontend: React 19 + TypeScript + Vite + Tailwind
- Backend: Spring Boot 3 + Java 21
- API integration is already in place and must remain stable
- Do not require backend contract changes for UI improvements
- Keep route structure and major interaction flows intact
- Preserve existing yellowish secondary accent direction
- Maintain production accessibility and responsive quality

Monorepo structure reference:

- frontend app and styling system
- backend REST APIs

---

## 3) Source of Truth Files

Use these as canonical references:

- Theme tokens and utilities: [frontend/src/styles/globals.css](../frontend/src/styles/globals.css)
- Tailwind token mapping and animation map: [frontend/tailwind.config.ts](../frontend/tailwind.config.ts)
- Main app routes and page composition: [frontend/src/App.tsx](../frontend/src/App.tsx)

---

## 4) Design Tokens

### 4.1 Core Theme Modes

Three token contexts exist:

1. Light mode root
2. Dark mode class
3. Dashboard light override

Token anchors:

- Light root starts at [frontend/src/styles/globals.css](../frontend/src/styles/globals.css#L6)
- Dark mode starts at [frontend/src/styles/globals.css](../frontend/src/styles/globals.css#L47)
- Dashboard override starts at [frontend/src/styles/globals.css](../frontend/src/styles/globals.css#L84)

### 4.2 Light Mode Tokens (HSL)

- background: 220 20% 97%
- foreground: 229 84% 5%
- card: 0 0% 100%
- card-foreground: 229 84% 5%
- primary: 171 100% 35%
- primary-foreground: 0 0% 100%
- secondary: 41 96% 45%
- secondary-foreground: 0 0% 100%
- muted: 220 20% 92%
- muted-foreground: 220 15% 45%
- accent: 5 100% 64%
- accent-foreground: 229 84% 5%
- destructive: 0 84% 60%
- border: 220 20% 88%
- input: 220 20% 88%
- ring: 171 100% 35%
- success: 171 100% 35%
- warning: 52 83% 45%
- info: 199 90% 46%
- sidebar: 220 20% 94%

### 4.3 Dark Mode Tokens (HSL)

- background: 229 84% 5%
- foreground: 220 100% 96%
- card: 229 50% 8%
- card-foreground: 220 100% 96%
- primary: 171 100% 48%
- primary-foreground: 229 84% 5%
- secondary: 41 96% 50%
- secondary-foreground: 220 43% 5%
- muted: 229 40% 12%
- muted-foreground: 220 20% 60%
- accent: 5 100% 69%
- accent-foreground: 229 84% 5%
- destructive: 0 84% 60%
- border: 229 40% 16%
- input: 229 40% 16%
- ring: 171 100% 48%
- success: 171 100% 48%
- warning: 52 83% 78%
- info: 199 90% 64%
- sidebar: 229 84% 3%

### 4.4 Dashboard Light Override Tokens (HSL)

- background: 160 11% 95%
- foreground: 171 100% 13%
- primary: 171 100% 13%
- secondary: 167 27% 32%
- muted: 164 11% 82%
- muted-foreground: 167 18% 40%
- accent: 164 11% 65%
- border: 165 11% 73%
- ring: 168 43% 23%

### 4.5 Brand Color Notes

- Deep Sea Navy: #020617
- Electric Teal: #00F5D4
- Hyper Coral: #FF6F61
- Soft Butter: #F4E99B

Important: secondary yellowish direction must be preserved.

### 4.6 Typography and Radius

Typography mapping is in [frontend/tailwind.config.ts](../frontend/tailwind.config.ts#L16):

- body: DM Sans
- headline: Plus Jakarta Sans

Radius mapping is in [frontend/tailwind.config.ts](../frontend/tailwind.config.ts#L56):

- base: var radius
- md: base - 2px
- sm: base - 4px
- xl: base + 4px
- 2xl: base + 8px
- 3xl: base + 16px

---

## 5) Motion System

### 5.1 Easing Tokens

Defined in [frontend/tailwind.config.ts](../frontend/tailwind.config.ts#L65):

- spring: cubic-bezier(0.34, 1.56, 0.64, 1)
- expo-out: cubic-bezier(0.16, 1, 0.3, 1)
- back-out: cubic-bezier(0.34, 1.25, 0.64, 1)
- snappy: cubic-bezier(0.23, 1, 0.32, 1)

### 5.2 Duration Tokens

Defined in [frontend/tailwind.config.ts](../frontend/tailwind.config.ts#L75):

50, 80, 100, 120, 150, 160, 175, 180, 200, 220, 250, 280, 300, 340, 400, 500 ms

### 5.3 Keyframes in Use

Keyframes are defined in:

- [frontend/src/styles/globals.css](../frontend/src/styles/globals.css#L257)
- [frontend/tailwind.config.ts](../frontend/tailwind.config.ts#L103)

Main names:

- float
- float-delayed
- pulse-ring
- glow-pulse
- shimmer
- gradient-pan
- slide-up
- slide-in-left
- slide-in-right
- fade-in
- scale-in
- spin-slow
- blob
- ticker
- aurora
- breathe
- wave-hand
- morph
- text-shimmer
- border-dance
- rise-fade
- ping-slow

### 5.4 Animation Utility Classes

Animation utility classes start in [frontend/src/styles/globals.css](../frontend/src/styles/globals.css#L861).

Representative classes:

- animate-float
- animate-float-delayed
- animate-pulse-ring
- animate-shimmer
- animate-slide-up
- animate-scale-in
- animate-fade-in
- animate-spin-slow
- animate-blob
- animate-ticker
- animate-aurora
- animate-breathe
- animate-wave-hand
- animate-text-shimmer
- animate-rise-fade
- animate-ping-slow

### 5.5 Reduced Motion

Reduced-motion handling exists and must remain intact:

- [frontend/src/styles/globals.css](../frontend/src/styles/globals.css#L301)

---

## 6) Existing Visual Utility Patterns

Defined mainly in [frontend/src/styles/globals.css](../frontend/src/styles/globals.css#L620):

- surface-base
- surface-elevated
- glass
- glass-subtle
- glass-strong
- gradient-bg
- gradient-bg-warm
- gradient-surface
- aurora-bg
- mesh-gradient
- card-hover
- card-glow-hover
- text-gradient-animated
- shimmer

Instruction for redesign: evolve these patterns consistently, do not replace them with unrelated style language.

---

## 7) Core User Flows to Respect

- signup and register
- onboarding
- dashboard
- match discovery
- exchange request
- messages and conversation view
- profile
- settings
- community
- connections

No flow regressions allowed.

---

## 8) Visual Capture Checklist to Share with Claude

Provide these screenshots or short videos with the token sheet:

Desktop

1. Register page step flow
2. Dashboard hero + cards + sidebar
3. Match page with filter panel open
4. Exchange request dialog open
5. Messages list + active chat
6. Profile top + skills + reviews
7. Settings skills and intent section
8. Community feed cards

Responsive

1. Mobile register
2. Mobile dashboard
3. Mobile match
4. One tablet sample page

State coverage

1. Loading state
2. Empty state
3. Validation or error state
4. Hover and focus-visible samples

Flow clip

- 30 to 60 second journey: register -> onboarding -> dashboard -> match -> messages

---

## 9) Required Output from Claude

Ask Claude to produce:

1. Visual audit with prioritized issues
2. Production UI rules with acceptance criteria
3. UX interaction rules for all key flows
4. Token usage rules and theme consistency rules
5. Component standards for forms, nav, dialogs, cards, tabs, messages
6. Accessibility rules with WCAG 2.2 AA checks
7. Responsive behavior standards by breakpoint
8. Motion rules with reduced-motion fallback
9. PR-ready QA checklist and scorecard

---

## 10) Copy-Paste Prompt for Claude

You are a Senior Product Designer and Design Systems Architect.

I am sharing my real project token system, animation system, and UI constraints.

Your job is to produce production-grade UI UX rules for this app without breaking existing behavior.

Project context:

- Product: SkillEx skill exchange platform
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Spring Boot
- Core flows: register, onboarding, dashboard, match, exchange request, messages, profile, settings, community, connections

Strict constraints:

- Do not require backend API contract changes
- Do not change route structure or core flow behavior
- Preserve yellowish secondary accent direction
- Keep current brand identity and improve consistency instead of replacing it

Token and style references:

- Theme tokens and utilities: frontend/src/styles/globals.css
- Tailwind token map and animation map: frontend/tailwind.config.ts

Deliverables in this exact order:

1. Visual audit with severity labels (Critical, Major, Minor)
2. UI principles with rule, rationale, implementation guidance, acceptance criteria
3. UX principles with the same structure
4. Design token usage rules (color, typography, spacing, radius, shadow, motion)
5. Component-level standards (button, input, form, card, tabs, nav, dialog, toast, empty, loading, error)
6. Accessibility standards (keyboard, focus, semantics, contrast, reduced motion)
7. Responsive standards (mobile, tablet, desktop adaptations)
8. Page-by-page recommendations across all core flows
9. Anti-patterns to avoid
10. Final QA scorecard template for design review and PR review

Output style:

- Actionable, implementation-ready
- No generic advice
- Tie recommendations to the provided token and animation system
- Prioritize maintainability and production readiness

---

## 11) Final Instruction

When proposing changes, always treat existing tokens and utility classes as the base system, then layer improvements for consistency and usability.
