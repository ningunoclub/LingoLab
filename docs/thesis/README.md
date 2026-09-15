# Thesis documentation

Development records for the Master's thesis *Gamification in English Language Teaching: Identifying Effective Game
Archetypes and Developing an Open-Source Learning Platform* (Bruno Zingg, PHZH, 2026).

## How this documentation is produced

| Layer | What | How it's created | Where |
|---|---|---|---|
| 1. Raw, automatic | Commit history (conventional commits, co-author trailers) | Every commit | `git log` |
| | Pull requests with route inventories | `port-route` skill | GitHub PRs |
| | Full Claude Code session transcripts | `SessionEnd` hook (`.claude/hooks/archive-transcript.mjs`) | `_sessions/` (git-ignored, **back it up**) |
| 2. Curated, on request | Devlog, ADRs, AI-usage log, iteration reports | `/document <type>`. Claude asks at the end of each task and never writes on its own | this folder |
| 3. Thesis writing | Chapters | Bruno, using layers 1 and 2 as sources | thesis document |

## Contents

| Path | Purpose | Thesis use |
|---|---|---|
| `devlog/` | One entry per meaningful task: goal, what happened, who decided what, verification | Methodology (design-based research process), development chapter |
| `decisions/` | Architecture Decision Records (ADRs): context, options, decision, consequences | Design rationale, limitations |
| `iterations/` | One report per user-testing round (feedback → changes) | Proposal §5.4: testing and iterative improvement |
| `ai-usage.md` | Which AI tools were used for what, and how outputs were checked | AI-use declaration, methodology, ethics |
| `attribution.md` | Upstream code, third-party libraries and assets, licences | Proposal §9.3: open-source ethics, appendix |
| `screenshots/` | Screenshots referenced from entries | Figures |
| `templates/` | Templates used by `/document` | |

## Useful queries when writing

```bash
git log --since=2026-09-01 --until=2026-10-01 --oneline          # what happened in a month
gh pr list --state merged --limit 200 --json number,title,mergedAt
git log --grep="Co-authored-by: Claude" -i --oneline | wc -l      # commits co-authored by Claude
git log --oneline | wc -l                                         # all commits (includes upstream history)
git log upstream/main..main --oneline | wc -l                     # commits made in this fork only
```

(`upstream/main` may be `upstream/master` depending on the upstream default branch.)

When writing a chapter, you can ask Claude Code to *read* these files and draft from them. Always check the drafts against the sources.
