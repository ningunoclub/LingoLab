<!--
SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
SPDX-FileCopyrightText: 2026 Bruno Zingg

SPDX-License-Identifier: MPL-2.0
-->
# Contribute to LingoLab

LingoLab is a fork of [ClassQuiz](https://github.com/mawoka-myblock/ClassQuiz) by Marlon W
(Mawoka), developed as part of Bruno Zingg's Master's thesis at PHZH (MA Secondary Education).
It is a separate project from ClassQuiz: development happens here, independently, and issues/PRs
against this repo are not seen by the upstream maintainer. See [`CLAUDE.md`](CLAUDE.md) for the
full project context, repo layout and current phase (frontend rewrite, parity-first).

For the development setup, see the [Development](README.md#development) section of the README.

## Coding guidelines

### Backend (`classquiz/`)

Not currently open for contributions — the backend is frozen during the frontend rewrite phase.
See [`CLAUDE.md`](CLAUDE.md).

### Frontend (`web/`)

- TypeScript everywhere; avoid `any`.
- Follow the conventions in [`web/CLAUDE.md`](web/CLAUDE.md) and the `lingolab-design` design
  system for any UI work.
- Always run `pnpm -C web typecheck`, `pnpm -C web lint` and `pnpm -C web test` before opening a
  PR, and make sure they pass.
- Feel free to reduce complexity in code you're already touching, but keep unrelated changes out
  of the same PR.
- During the rewrite phase, `web/` is being ported route by route from the legacy app in
  `frontend/`, following [`MIGRATION.md`](MIGRATION.md). No new features or redesigned flows —
  see [`CLAUDE.md`](CLAUDE.md) for what that means in practice.

## AI usage

This project is built with AI coding agents (Claude Code) as part of its research process, and
that's expected of contributions too — feel free to use any AI tooling, including agents.
What matters is transparency and ownership of the result:

- Disclose AI-assisted contributions. Commits made with an agent should keep its co-author
  trailer (for example `Co-Authored-By: Claude <...>`), the same way this repo's own history does.
- You're responsible for what you submit. Review and understand any AI-generated code before
  opening a PR — it should meet the same bar as hand-written code.

## Licensing

LingoLab is MPL-2.0, same as upstream ClassQuiz. If your change copies or closely adapts code
from `frontend/` or `classquiz/`, keep the existing upstream copyright header and add ours
alongside it — see [`CLAUDE.md`](CLAUDE.md#licensing-rules-mpl-20-important-for-the-thesis) for
the exact header format. New files written from scratch only need the LingoLab copyright line.

Before adding a dependency, check its license. Allowed: MIT, ISC, BSD, Apache-2.0, MPL-2.0. Ask
first about anything else (GPL, AGPL, "commercial" dual licenses).

## Formatting git commits

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat(web): …`,
`fix(web): …`, `chore: …`), matching the existing commit history.

## Opening PRs

Open a PR against `main`. Include what changed and why; if the change involved a choice between
alternatives (a new dependency, a deviation from legacy behaviour, a scope change), explain the
reasoning — this project's decisions are part of a thesis record.

## Found a bug

Please open an issue here on GitHub. This is an independent fork, so bugs should be reported
here, not to the upstream ClassQuiz project.

## Want to translate?

LingoLab currently ships English and German only (`en`, `de`). Open an issue with the language
you'd like to add.
