# ADR-0009: Design system direction

- **Status:** Proposed (to be confirmed on the `/styleguide` page after Phase 0)
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg (draft by Claude)

## Decision (draft)
- **Feel:** "friendly, focused, classroom-ready", with two modes: calm *Workspace* for teachers and bold *Stage* for play.
- **Colours:** primary "Lingo Teal" #0F766E, coral accent #F26B4F, warm neutrals.
- **Answer tiles:** Okabe–Ito colour-blind-safe palette, always paired with a shape, dark text with at least 4.9:1 contrast.
- **Fonts:** Lexend (headings and play screens) and Atkinson Hyperlegible Next (interface), both OFL and self-hosted.
- **Tone:** student-facing copy at CEFR A2–B1 level.
- The rules live in the `lingolab-design` skill; the tokens live in `web/src/index.css`.

## Alternatives
Letting generic design skills decide per page was rejected because it produces inconsistent styles.
