<!--
SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
SPDX-FileCopyrightText: 2026 Bruno Zingg

SPDX-License-Identifier: MPL-2.0
-->

<a href="https://github.com/ningunoclub/LingoLab/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/ningunoclub/LingoLab?style=for-the-badge"></a>
<img alt="GitHub code size in bytes" src="https://img.shields.io/github/languages/code-size/ningunoclub/LingoLab?style=for-the-badge">

<div align='center'>
    <h2 align='center'>LingoLab</h2>
    <p align='center'>
        A self-hostable, game-based learning platform for EFL (English as a Foreign Language) teachers
        <br/>
        <br />
        <a href='MIGRATION.md'>Migration status</a>
        ·
        <a href='CONTRIBUTING.md'>Contributing</a>
        ·
        <a href='CONTACT.md'>Contact</a>
    </p>
</div>

## About LingoLab

LingoLab is a self-hostable, game-based learning platform built for EFL teachers to create
interactive quizzes and games that students play together in class. Teachers create an
activity once and students join remotely to compete on their knowledge.

LingoLab is a fork of [ClassQuiz](https://github.com/mawoka-myblock/ClassQuiz) by Marlon W
(Mawoka), developed as part of Bruno Zingg's Master's thesis at PHZH (MA Secondary Education).
It targets self-hosted deployment via Docker Compose behind a Cloudflare Tunnel, with no
third-party browser calls (no CDN fonts, analytics, or captcha scripts), in line with Swiss
revFADP and GDPR requirements for a platform used by teachers and minors.

## Project status

The project is currently in a **frontend rewrite phase**: the legacy SvelteKit app
([`frontend/`](frontend/)) is being ported route by route to a new React + TypeScript app
([`web/`](web/)), following the checklist in [`MIGRATION.md`](MIGRATION.md). During this phase
the goal is behavioural parity with the legacy app — no new features or redesigned flows yet.
Planned after parity: class/group management and new EFL game archetypes.

## Self-Host

```bash
docker compose -f compose.dev.yml up -d
```

This starts the backend services (API on `:8000`). See [`compose.dev.yml`](compose.dev.yml)
for the full service list, and add `--profile legacy` to also run the legacy frontend on
`:8080` for side-by-side comparison during the rewrite.

## Development

```bash
docker compose -f compose.dev.yml up -d          # backend services (api on :8000)
pnpm -C web dev                                  # React app on http://localhost:5173
pnpm -C web typecheck
pnpm -C web lint
pnpm -C web test                                 # Vitest
pnpm -C web e2e                                  # Playwright
pnpm -C web gen:api                              # regenerate typed API client
```

See [`CLAUDE.md`](CLAUDE.md) for full repo layout, conventions, and workflow.

### Things to know about the structure

This repo is a monorepo:

- [`classquiz/`](classquiz/) — FastAPI backend (upstream, unmodified during the rewrite phase)
- [`migrations/`](migrations/) — Alembic DB migrations (upstream)
- [`frontend/`](frontend/) — legacy SvelteKit app; read-only reference for the rewrite, deleted once parity is reached
- [`web/`](web/) — new React + TypeScript app; all frontend work happens here

#### Tech stack

##### Backend

The backend is made with [FastAPI](https://fastapi.tiangolo.com/) (web framework),
[ormar](https://github.com/collerek/ormar/) (ORM), and
[python-socketio](https://python-socketio.readthedocs.io/en/latest/) (realtime communication
between server and client).

##### Frontend

The new frontend ([`web/`](web/)) is made with [React](https://react.dev/),
[TypeScript](https://www.typescriptlang.org/), [TanStack Router](https://tanstack.com/router)
and [TanStack Query](https://tanstack.com/query), [Tailwind CSS](https://tailwindcss.com/) and
[shadcn/ui](https://ui.shadcn.com/).

The legacy frontend ([`frontend/`](frontend/)) is made with [SvelteKit](https://kit.svelte.dev/)
and [TailwindCSS](https://tailwindcss.com/).

##### External dependencies

Self-hostable:

- [Meilisearch](https://www.meilisearch.com/) (search server)
- [Caddy](https://caddyserver.com/) (reverse proxy)
- [Postgres](https://www.postgresql.org/) (database)
- [Redis](https://redis.io/) (cache)

No closed-source third-party services (Mapbox, hCaptcha, etc.) are used — see the privacy
rules in [`CLAUDE.md`](CLAUDE.md).

---

## License Note

This repository is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/);
please review the license to understand your rights and obligations.

LingoLab is a fork of [ClassQuiz](https://github.com/mawoka-myblock/ClassQuiz), also MPL-2.0
licensed. Files carried over or closely adapted from upstream keep the original copyright
notice alongside ours; see [`CLAUDE.md`](CLAUDE.md) for the project's licensing conventions.
