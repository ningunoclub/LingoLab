---
name: document
description: Write thesis documentation (devlog entry, architecture decision record, AI-usage log row, or test iteration report) into docs/thesis/ for the task just completed. Only runs when the user types /document.
disable-model-invocation: true
argument-hint: "[devlog|adr|ai-usage|iteration|all]"
---

# Document the last task for the thesis

Requested type(s): **$ARGUMENTS** (if empty, propose the fitting types and ask before writing).

## Context

Recent commits:
!`git log --oneline -20 || true`

Uncommitted changes:
!`git status --short || true`

Latest devlog entries:
!`ls -1 docs/thesis/devlog | tail -5 || true`

Latest ADRs:
!`ls -1 docs/thesis/decisions | tail -5 || true`

## Ground rules

- **Facts only.** Use this conversation, git history, PR descriptions and `MIGRATION.md`. Never invent numbers, quotes, durations or reasons.
  If something is unknown, write `TODO(Bruno): …` so Bruno fills it in.
- **Separate human from AI.** Always state what Bruno decided or specified, what Claude proposed or implemented, and how the result was verified.
- Write in English, neutral academic register, past tense. Short paragraphs; lists are fine for facts.
- Reference commits by short hash and PRs by number. No large code blocks (max ~10 lines when essential).
- Screenshots: save them to `docs/thesis/screenshots/YYYY-MM-DD-<slug>-<n>.png` and link them.
- Use the templates in `docs/thesis/templates/`. Keep file names in the formats below.

## What to write

| Type | File | When |
|---|---|---|
| `devlog` | `docs/thesis/devlog/YYYY-MM-DD-<slug>.md` + a row in `devlog/README.md` | Every meaningful task (route ported, feature built, bug fixed, setup changed) |
| `adr` | `docs/thesis/decisions/NNNN-<slug>.md` (next number) + a row in `decisions/README.md` | A choice between alternatives: new dependency, architecture, deviation from legacy behaviour, scope change, licensing |
| `ai-usage` | Append a row to the log table in `docs/thesis/ai-usage.md` | Every task where AI tools were used (practically always) |
| `iteration` | `docs/thesis/iterations/NN-<slug>.md` | After a user-testing round (design-based research cycle) |
| `all` | devlog + ai-usage, plus an ADR if the task contained a decision | |

If a new third-party dependency, asset or copied code was added, also update `docs/thesis/attribution.md`.

## Finish

1. Show Bruno a short summary of the files you created or changed.
2. Ask whether to commit. On yes: `git add docs/thesis && git commit -m "docs(thesis): <summary>"`.
