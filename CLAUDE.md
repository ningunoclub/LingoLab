# Project context

**LingoLab**: a self-hostable, game-based learning platform for EFL (English as a Foreign Language)
teachers, built for Bruno Zingg's Master's thesis (PHZH, MA Secondary Education).
It is a fork of ClassQuiz (https://github.com/mawoka-myblock/ClassQuiz, MPL-2.0).
Deployment target: Docker Compose on a self-hosted Ubuntu server behind a Cloudflare Tunnel.

## Repo layout

| Path | What it is | Can you edit it? |
|---|---|---|
| `classquiz/` | FastAPI backend (upstream, Python, ormar ORM, python-socketio) | **No**, not during the rewrite phase |
| `migrations/` | Alembic DB migrations (upstream) | No |
| `frontend/` | **Legacy** SvelteKit app. It is the *specification* for the rewrite. | **Never.** Read-only reference, deleted once parity is reached |
| `web/` | **New** React + TypeScript app. All frontend work happens here. | Yes |
| `MIGRATION.md` | Route-by-route checklist. Source of truth for rewrite progress. | Yes, tick items when done |
| `SocketIo.md` | Upstream notes on the Socket.IO game protocol | Read |
| `compose.dev.yml` | Local backend services for development | Only when asked |

`web/CLAUDE.md` holds the frontend stack, conventions, and definition of done.

## Current phase: frontend rewrite, parity first

1. Rebuild the existing behaviour of `frontend/` in `web/`, route by route, following `MIGRATION.md`.
2. **No new features and no redesign of flows during this phase.** Visual restyling is expected; behaviour changes are not.
   If something in the legacy app looks like a bug, note it in `MIGRATION.md` under "Legacy quirks" and replicate the intended behaviour. Do not silently change it.
3. **Do not modify the backend.** If a route cannot be built without a backend change, stop and explain what is missing.
4. To port a route, use the `port-route` skill.
5. Planned after parity (do not start them yet): class/group management, new EFL game archetypes. Student progress tracking is out of scope.

## Commands

```bash
docker compose -f compose.dev.yml up -d          # backend services (api on :8000)
docker compose -f compose.dev.yml --profile legacy up -d   # + legacy app on :8080 for side-by-side comparison
docker compose -f compose.dev.yml logs -f api    # backend logs

pnpm -C web dev          # React app on http://localhost:5173 (proxies /api and /socket.io to :8000)
pnpm -C web typecheck
pnpm -C web lint
pnpm -C web test         # Vitest
pnpm -C web e2e          # Playwright
pnpm -C web gen:api      # regenerate typed API client from http://localhost:8000/openapi.json
```

Before saying a task is done, run `typecheck`, `lint` and `test` and make sure they pass.

## Skills and tools

- `port-route`: porting a legacy route. `lingolab-design`: any UI work (**overrides other design skills**).
- `document`: user-only. Writes thesis docs (see below).
- `shadcn` (official): adding and composing shadcn components.
- MCP: `brave-devtools` (drive/inspect the app in Brave), `shadcn` (component registry), `context7` (current library docs).
- Use the `gh` CLI for GitHub.

## Thesis documentation (read carefully)

This project is a Master's thesis, so the development process is research data. Documentation lives in `docs/thesis/`
(see its `README.md`).

- **Never create or edit anything in `docs/thesis/` on your own.** Documentation is written only through the
  `/document` skill, which only the user can start. The only exception is a user message that explicitly asks you to edit a doc.
- **At the end of every task** (after tests pass and the PR is open, or when the user says the task is done), finish
  your reply with a short documentation prompt and wait. Suggest the fitting type(s) with a one-line reason, for example:

  > **Document this?** `/document devlog` (ported /account/login) · `/document adr` (chose Tiptap over CKEditor)

  Suggest `adr` whenever the task involved a choice between alternatives: a new dependency, an architectural choice,
  a deviation from legacy behaviour, a scope change, or a licensing question.
- Commit messages and PR descriptions are part of the record: explain **why**, not only what.
- Keep Claude Code's default co-author trailer on commits (AI transparency).
- `docs/thesis/_sessions/` holds raw transcripts archived by a hook. Never read them unless asked, and never commit them.

## Licensing rules (MPL-2.0), important for the thesis

- Any file that contains code copied or closely translated from `frontend/` or `classquiz/` is a Modification and stays MPL-2.0.
  Keep the upstream header and add ours:
  ```
  // SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
  // SPDX-FileCopyrightText: 2026 Bruno Zingg
  // SPDX-License-Identifier: MPL-2.0
  ```
- New files written from scratch get only the Bruno Zingg line plus `SPDX-License-Identifier: MPL-2.0`.
- Never remove existing copyright or license notices.
- Before adding a dependency, check its license. Allowed: MIT, ISC, BSD, Apache-2.0, MPL-2.0. Ask first for anything else (GPL, AGPL, "commercial" dual licenses like CKEditor).
- Do not use the name or logo "ClassQuiz" in the UI. Use the app name from `web/src/config.ts`.

## Privacy rules (users are teachers and minors; Swiss revFADP + GDPR)

- The browser must not call third-party services: no CDN fonts, no analytics, no Sentry, no Google/hCaptcha scripts.
  Self-host fonts via `@fontsource-variable/*`.
- Never store auth tokens in localStorage. The backend uses httpOnly cookies.
- Never log personal data to the console.

## Git workflow

- One branch per task: `web/<area>-<short-name>` (for example `web/auth-login`).
- Conventional commits (`feat(web): …`, `fix(web): …`, `chore: …`).
- Open a PR with `gh pr create`. The description contains the route inventory from the `port-route` skill.
- `upstream` is the original ClassQuiz repo. Never push to it.
- Never commit `.env*` files except `*.example`.
