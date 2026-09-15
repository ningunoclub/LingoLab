---
name: lingolab-design
description: LingoLab's design system and UI rules (colours, typography, spacing, motion, answer tiles, tone of voice). Use for ANY work that creates or changes UI in web/ (pages, components, styling, theming, layouts, empty/error states, copy) and before using any other design skill. This skill overrides generic design advice.
---

# LingoLab design system

**Single source of truth.** Tokens live in code (`web/src/index.css`, shadcn CSS variables).
This file explains the intent. If code and this file disagree, ask. Generic design skills
(ui-ux-pro-max, frontend-design, …) may be used for ideas, but never override these rules.

## Who we design for

- **Teachers** (desktop/laptop, planning lessons, often in a hurry) → *Workspace* mode.
- **Students aged ~11–16 learning English** (phones, sometimes weak Wi-Fi) → *Stage* mode.
- **A projector in a bright classroom**, seen from the back row → *Stage* mode, host screen.

## Feel

**"Friendly, focused, classroom-ready."** Calm and efficient where teachers work;
bold, big and joyful where the class plays. Never childish, never corporate.

## Two modes

| | Workspace (teacher) | Stage (play) |
|---|---|---|
| Routes | dashboard, editor, settings, results, explore | `/play`, `/admin` (host), game parts of `/view` |
| Density | medium; data tables and forms are fine | one thing at a time |
| Type scale | base 16px | base 20px (phone), 28px+ (projector) |
| Colour | mostly neutral, primary for actions only | full answer palette, strong contrast |
| Motion | subtle (150–200ms fades/slides) | expressive: countdowns, score reveals, confetti at the end |
| Layout | app shell with sidebar (collapses on mobile) | full-bleed, no navbar, single column on phones |

## Colour

Define all colours as shadcn CSS variables in OKLCH (convert from the hex values below). Never use raw hex in components.

**Light (default)**
- `--background` #FAFAF7 (warm off-white), `--foreground` #1C1B22 (ink)
- `--primary` #0F766E "Lingo Teal" with **white** text (5.5:1)
- `--accent` #F26B4F "Coral" with **ink** text. Only for highlights, streaks, celebration; never for destructive actions.
- `--muted` / `--border`: warm stone neutrals
- `--destructive` #B42318

**Dark**
- `--background` #121316, `--foreground` #F4F4F0
- `--primary` #2DD4BF with **ink** text

**Answer tiles (Stage).** Based on the Okabe–Ito colour-blind-safe palette. Always pair colour with a shape, and always use ink text (all ≥ 4.9:1):

| Slot | Colour | Shape (lucide icon) |
|---|---|---|
| 1 | Orange #E69F00 | Circle |
| 2 | Sky #56B4E9 | Square |
| 3 | Green #009E73 | Triangle |
| 4 | Purple #CC79A7 | Star |
| 5+ | Yellow #F0E442 / Blue #0072B2 (white text) | Hexagon / Diamond |

Don't copy Kahoot's colour+shape pairing.

## Typography (self-hosted, OFL licence)

- **Lexend** (`@fontsource-variable/lexend`): headings, Stage text, big numbers. It was designed to improve reading fluency, which suits learners.
- **Atkinson Hyperlegible Next** (`@fontsource-variable/atkinson-hyperlegible-next`): all UI and body text.
- Tabular numbers for scores and timers (`font-variant-numeric: tabular-nums`).
- Line length 60–75 characters for reading text.

## Shape, space, elevation

- 4px spacing grid; generous padding in Stage.
- Radius: `--radius` 0.75rem (cards, inputs), full pills for badges and chips.
- Elevation: borders first, soft shadows only for overlays (dialogs, popovers, dropdowns).
- Minimum touch target 44×44px; answer tiles at least 72px tall on phones.

## Motion

- Use CSS transitions or `motion` (ask before adding a library).
- Always respect `prefers-reduced-motion` (no confetti, instant transitions).
- No looping animations in Workspace.

## Components

- Start from shadcn components. Restyle with variants rather than one-off class soup.
- Icons: `lucide-react` only, 1.5–2px stroke. No emoji as icons.
- Every list or table has designed **empty**, **loading** (skeleton) and **error** states with a clear next action.
- Toasts (shadcn Sonner) for confirmations; inline messages for form errors.
- The host screen shows the join code and QR code very large, readable from 8 metres.

## Tone of voice (UI copy)

- Plain, warm, short. Teacher copy: direct ("Start game", "Duplicate quiz").
- **Student-facing copy is at CEFR A2–B1 level**: short sentences, common words, no idioms.
- Encourage, don't shame: "Almost! The answer was …" rather than "Wrong".
- All copy goes through i18n keys.

## Don'ts

- No purple-to-blue "AI" gradients, glassmorphism, neon glow, or busy background patterns.
- No colour-only meaning (always add an icon, shape or text).
- No light-grey text on white for anything important (contrast ≥ 4.5:1, ≥ 3:1 for large text).
- No new fonts, colours or radii without updating this file.
