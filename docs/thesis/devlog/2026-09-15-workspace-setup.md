# 2026-09-15: Workspace and harness setup

- **Phase / area:** Setup (before Phase 0 of `MIGRATION.md`)
- **Related:** ADR-0001 to ADR-0009; initial kit commit (TODO(Bruno): add hash)
- **Time spent (approx.):** TODO(Bruno)

## Goal
Change the technical approach of the thesis platform (self-hosted instead of Vercel/Supabase), decide whether to build
on an existing open-source project, and prepare an AI-assisted development workspace that also records the process.

## What happened
1. The thesis proposal (tech stack React + Vercel + Supabase) was reviewed against a new plan: a self-hostable Docker
   stack on Bruno's own Ubuntu server, exposed via Cloudflare.
2. The open-source quiz app ClassQuiz (github.com/mawoka-myblock/ClassQuiz) was analysed:
   - Backend: FastAPI, ormar ORM, python-socketio (about 8,400 lines of Python).
   - Frontend: SvelteKit + Tailwind (about 210 files, about 19,000 lines).
   - Docker Compose with seven services (frontend, api, worker, Postgres, Valkey/Redis, Meilisearch, Caddy).
   - Licence MPL-2.0; actively maintained (last upstream commit 2026-08-30).
   - It already covers teacher authentication, question creation with images, real-time play and export/sharing.
     Class management, student progress tracking and several game archetypes are missing.
3. Decisions were made (see ADRs): fork ClassQuiz, keep its backend, rewrite the frontend in React/TypeScript
   (behaviour first), licence MPL-2.0, class/group management in scope, student progress tracking out of scope.
4. The legacy frontend was inspected in detail. Its server-side code only handles login-cookie checks and redirects,
   and its i18next translations (34 locales) can be reused. It uses CKEditor 5 (GPL/commercial), which will be replaced.
   The backend has telemetry enabled by default, which is disabled for development.
5. The repository `ningooner/LingoLab` was created from a full clone of ClassQuiz (history kept, `upstream` remote,
   pushes to upstream disabled). The first push was blocked by GitHub push protection: upstream history contains a
   Mapbox token and an hCaptcha secret in `frontend/Dockerfile`. Resolution: TODO(Bruno): confirm (allowed via
   GitHub's unblock links; secret comment removed from the current Dockerfile).
6. A workspace kit was created in three iterations with Claude (claude.ai):
   - v1: `CLAUDE.md` files, `port-route` skill, `MIGRATION.md` route checklist, dev Docker Compose, Vite proxy config.
   - v2: `lingolab-design` skill (design system); browser MCP switched from Playwright to Google's
     chrome-devtools-mcp driving Brave.
   - v3: this documentation system (`/document` skill, transcript archiving hook, `docs/thesis/`).

## Human vs. AI
- **Bruno decided / specified:** self-hosting; forking ClassQuiz; full React rewrite despite the effort; scope
  (class management in, progress tracking out); use of Brave; wish for a design system; documentation that Claude
  never writes without asking.
- **Claude proposed / implemented:** repository analysis; licence summary; stack and library choices; repo strategy;
  kit files; design-system draft; documentation structure.
- **Flagged by Claude, decided by Bruno:** the schedule risk of rewriting about 19,000 lines of frontend code. Bruno chose
  to proceed.
- **Corrections Bruno made to AI output:** TODO(Bruno)

## Verification
- Package names and versions checked against the npm registry (2026-09-15).
- The `docker-compose` dev file is syntax-checked but was not run by Claude (no Docker in its sandbox): TODO(Bruno)
  confirm the backend starts.
- The transcript-archiving hook was tested with sample input.

## Observations for the thesis
- Building on an existing open-source project shifts the development effort from core real-time mechanics to
  adaptation, EFL-specific features and usability.
- AI-assisted setup produced a written rule set (`CLAUDE.md`, skills) that itself documents the intended process.

## Open points
- Choose which Phase 4 routes to cut.
- Verify the design direction on the `/styleguide` page after Phase 0.
