# ADR-0003: Rewrite the frontend in React/TypeScript, behaviour first

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg

## Context
ClassQuiz's frontend is SvelteKit (about 44 routes, about 19,000 lines including shared components). Bruno prefers React
and wants a more modern look. The proposal already specified React with TypeScript.

## Options considered
1. **Keep Svelte and restyle it:** least effort, but it is not the stack Bruno wants to work in.
2. **Full React rewrite, route by route, matching existing behaviour before adding features:** consistent codebase
   and stack; large effort.
3. **Mix Svelte and React:** two frontends and two build pipelines. Rejected.

## Decision
Option 2. Rebuild existing behaviour route by route in `web/`, following `MIGRATION.md`. New features come only after parity.

## Consequences
- Claude flagged the schedule risk of this effort; Bruno accepted it.
- The legacy app serves as the specification and is removed at cut-over.
- The SvelteKit server code only did auth checks and redirects, so a static single-page app replaces the Node frontend
  container (one container fewer).
- Existing i18next translations can be reused.
